import { describe, expect, test, vi, beforeEach } from 'vitest';

// vi.hoisted() で vi.mock ファクトリ内から参照可能なモック関数を定義
const { mockDecrypt, mockSendEmail } = vi.hoisted(() => ({
  mockDecrypt: vi.fn(),
  mockSendEmail: vi.fn(),
}));

// Mock @aws-crypto/client-node
vi.mock('@aws-crypto/client-node', () => ({
  buildClient: vi.fn(() => ({ decrypt: mockDecrypt })),
  CommitmentPolicy: { REQUIRE_ENCRYPT_ALLOW_DECRYPT: 'REQUIRE_ENCRYPT_ALLOW_DECRYPT' },
  KmsKeyringNode: vi.fn(),
}));

// Mock sesApi
vi.mock('../../lambda/utils/sesApi', () => ({
  sendEmail: mockSendEmail,
}));

// Set environment variables before importing handler
process.env.KMS_KEY_ARN = 'arn:aws:kms:ap-northeast-1:123456789012:key/test-key-id';

import { handler } from '../../lambda/customEmailSender';

type TriggerSource =
  | 'CustomEmailSender_SignUp'
  | 'CustomEmailSender_ResendCode'
  | 'CustomEmailSender_ForgotPassword'
  | 'CustomEmailSender_AdminCreateUser'
  | 'CustomEmailSender_Authentication'
  | 'CustomEmailSender_AccountTakeOverNotification';

function createCustomEmailSenderEvent(
  triggerSource: TriggerSource,
  email: string = 'test@example.com',
) {
  return {
    version: '1',
    triggerSource,
    region: 'ap-northeast-1',
    userPoolId: 'ap-northeast-1_TestPool',
    userName: 'test-user',
    callerContext: {
      awsSdkVersion: '3.0.0',
      clientId: 'test-client-id',
    },
    request: {
      type: 'customEmailSenderRequestV1',
      code: Buffer.from('encrypted-code').toString('base64'),
      userAttributes: {
        email,
        email_verified: 'true',
      },
    },
    response: {},
  };
}

describe('Custom Email Sender Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecrypt.mockResolvedValue({
      plaintext: Buffer.from('123456'),
    });
    mockSendEmail.mockResolvedValue(undefined);
  });

  describe('正常系: メール送信フロー', () => {
    test('KMS 復号成功時にメールが送信される', async () => {
      const event = createCustomEmailSenderEvent('CustomEmailSender_SignUp');

      await handler(event);

      expect(mockDecrypt).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'アカウント確認',
        expect.stringContaining('123456'),
        expect.any(String),
      );
    });

    test('送信先メールアドレスが userAttributes.email から取得される', async () => {
      const event = createCustomEmailSenderEvent(
        'CustomEmailSender_SignUp',
        'custom@example.com',
      );

      await handler(event);

      expect(mockSendEmail).toHaveBeenCalledWith(
        'custom@example.com',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('triggerSource ごとのテンプレート選択', () => {
    const templateCases: Array<{
      triggerSource: TriggerSource;
      expectedSubject: string;
      expectedCodeLabel: string;
    }> = [
      {
        triggerSource: 'CustomEmailSender_SignUp',
        expectedSubject: 'アカウント確認',
        expectedCodeLabel: '確認コード',
      },
      {
        triggerSource: 'CustomEmailSender_ResendCode',
        expectedSubject: '確認コード（再送信）',
        expectedCodeLabel: '確認コード',
      },
      {
        triggerSource: 'CustomEmailSender_ForgotPassword',
        expectedSubject: 'パスワードリセット',
        expectedCodeLabel: 'リセットコード',
      },
      {
        triggerSource: 'CustomEmailSender_AdminCreateUser',
        expectedSubject: 'アカウントへの招待',
        expectedCodeLabel: '一時パスワード',
      },
      {
        triggerSource: 'CustomEmailSender_Authentication',
        expectedSubject: '認証コード',
        expectedCodeLabel: '認証コード',
      },
    ];

    test.each(templateCases)(
      '$triggerSource → 件名「$expectedSubject」、ラベル「$expectedCodeLabel」',
      async ({ triggerSource, expectedSubject, expectedCodeLabel }) => {
        const event = createCustomEmailSenderEvent(triggerSource);

        await handler(event);

        expect(mockSendEmail).toHaveBeenCalledWith(
          'test@example.com',
          expectedSubject,
          expect.stringContaining(expectedCodeLabel),
          expect.any(String),
        );
      },
    );

    test('未知の triggerSource ではデフォルトテンプレートが使用される', async () => {
      const event = createCustomEmailSenderEvent(
        'CustomEmailSender_AccountTakeOverNotification',
      );

      await handler(event);

      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        '通知',
        expect.stringContaining('コード'),
        expect.any(String),
      );
    });
  });

  describe('HTML エスケープ', () => {
    test('復号コードに含まれる HTML 特殊文字がエスケープされる', async () => {
      mockDecrypt.mockResolvedValue({
        plaintext: Buffer.from('<script>alert("xss")</script>'),
      });
      const event = createCustomEmailSenderEvent('CustomEmailSender_SignUp');

      await handler(event);

      const bodyHtml = mockSendEmail.mock.calls[0][2];
      expect(bodyHtml).not.toContain('<script>');
      expect(bodyHtml).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });
  });

  describe('エラーハンドリング', () => {
    test('KMS 復号失敗時にエラーがスローされる', async () => {
      mockDecrypt.mockRejectedValue(new Error('KMS Decrypt failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = createCustomEmailSenderEvent('CustomEmailSender_SignUp');

      await expect(handler(event)).rejects.toThrow('KMS Decrypt failed');

      consoleSpy.mockRestore();
    });

    test('SES 送信失敗時にエラーがスローされる', async () => {
      mockSendEmail.mockRejectedValue(new Error('SES SendEmail failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = createCustomEmailSenderEvent('CustomEmailSender_SignUp');

      await expect(handler(event)).rejects.toThrow('SES SendEmail failed');

      consoleSpy.mockRestore();
    });

    test('エラー時に CloudWatch Logs にエラーログが記録される', async () => {
      mockSendEmail.mockRejectedValue(new Error('SES error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = createCustomEmailSenderEvent('CustomEmailSender_ForgotPassword');

      await expect(handler(event)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
