import { describe, expect, test, vi } from 'vitest';
import { stackInputSchema } from '../../lib/stack-input';

describe('customEmailSender and emailMfaRequired parameter validation', () => {
  // 必須パラメータの共通ベース
  const baseParams = {
    account: '123456890123',
    region: 'us-east-1',
    allowedSignUpEmailDomains: null,
    allowedIpV4AddressRanges: null,
    allowedIpV6AddressRanges: null,
  };

  describe('customEmailSender: 正常値', () => {
    test('有効なドメイン名 + メールアドレスでパースが成功する', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        customEmailSender: {
          sesIdentityName: 'example.go.jp',
          fromAddress: 'noreply@example.go.jp',
        },
      });

      expect(params.customEmailSender).toEqual({
        sesIdentityName: 'example.go.jp',
        fromAddress: 'noreply@example.go.jp',
      });
    });

    test('メールアドレス形式の SES Identity 名が受け入れられる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        customEmailSender: {
          sesIdentityName: 'admin@example.com',
          fromAddress: 'admin@example.com',
        },
      });

      expect(params.customEmailSender!.sesIdentityName).toBe('admin@example.com');
    });

    test('sesConfigurationSetName を指定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        customEmailSender: {
          sesIdentityName: 'example.go.jp',
          fromAddress: 'noreply@example.go.jp',
          sesConfigurationSetName: 'ses-domain-identity-cg-genai-web-develop-49b',
        },
      });

      expect(params.customEmailSender!.sesConfigurationSetName).toBe(
        'ses-domain-identity-cg-genai-web-develop-49b',
      );
    });
  });

  describe('customEmailSender: 不正値', () => {
    test('ARN 形式の文字列でバリデーションエラーになる（名前のみ受け入れる）', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          customEmailSender: {
            sesIdentityName: 'arn:aws:ses:ap-northeast-1:123456789012:identity/example.go.jp',
            fromAddress: 'noreply@example.com',
          },
        }),
      ).toThrow();
    });

    test('ドメイン形式でもメールアドレス形式でもない文字列でバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          customEmailSender: {
            sesIdentityName: 'invalid string with spaces',
            fromAddress: 'noreply@example.com',
          },
        }),
      ).toThrow();
    });

    test('不正なメールアドレス形式でバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          customEmailSender: {
            sesIdentityName: 'example.go.jp',
            fromAddress: 'not-an-email',
          },
        }),
      ).toThrow();
    });

    test('sesConfigurationSetName に ARN 形式を指定するとバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          customEmailSender: {
            sesIdentityName: 'example.go.jp',
            fromAddress: 'noreply@example.go.jp',
            sesConfigurationSetName:
              'arn:aws:ses:ap-northeast-1:123456789012:configuration-set/my-set',
          },
        }),
      ).toThrow();
    });
  });

  describe('customEmailSender: デフォルト値', () => {
    test('未設定時は undefined になる', () => {
      const params = stackInputSchema.parse(baseParams);

      expect(params.customEmailSender).toBeUndefined();
    });

    test('null を設定すると null になる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        customEmailSender: null,
      });

      expect(params.customEmailSender).toBeNull();
    });
  });

  describe('emailMfaRequired: 正常値', () => {
    test('true を設定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: true,
      });

      expect(params.emailMfaRequired).toBe(true);
    });

    test('false を設定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: false,
      });

      expect(params.emailMfaRequired).toBe(false);
    });

    test('未設定時はデフォルト false になる', () => {
      const params = stackInputSchema.parse(baseParams);

      expect(params.emailMfaRequired).toBe(false);
    });
  });

  describe('emailMfaRequired + samlAuthEnabled 排他バリデーション', () => {
    test('emailMfaRequired: true + samlAuthEnabled: true でバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          emailMfaRequired: true,
          samlAuthEnabled: true,
          samlCognitoFederatedIdentityPrimaryProviderName: 'EntraID',
        }),
      ).toThrow('emailMfaRequired is not applicable when samlAuthEnabled is true');
    });

    test('emailMfaRequired: false + samlAuthEnabled: true は成功する', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: false,
        samlAuthEnabled: true,
        samlCognitoFederatedIdentityPrimaryProviderName: 'EntraID',
      });

      expect(params.emailMfaRequired).toBe(false);
      expect(params.samlAuthEnabled).toBe(true);
    });

    test('emailMfaRequired: true + samlAuthEnabled: false は成功する', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: true,
        samlAuthEnabled: false,
      });

      expect(params.emailMfaRequired).toBe(true);
      expect(params.samlAuthEnabled).toBe(false);
    });
  });

  describe('emailMfaRequired + customEmailSender 組み合わせ', () => {
    test('emailMfaRequired: true + customEmailSender: null は成功する（警告のみ）', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: true,
        customEmailSender: null,
      });

      expect(params.emailMfaRequired).toBe(true);
      expect(params.customEmailSender).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('emailMfaRequired is true but customEmailSender is not configured'),
      );

      consoleSpy.mockRestore();
    });

    test('emailMfaRequired: true + customEmailSender 設定済みでは警告が出ない', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const params = stackInputSchema.parse({
        ...baseParams,
        emailMfaRequired: true,
        customEmailSender: {
          sesIdentityName: 'example.go.jp',
          fromAddress: 'noreply@example.go.jp',
        },
      });

      expect(params.emailMfaRequired).toBe(true);
      expect(params.customEmailSender).toBeDefined();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('emailMfaRequired: false + customEmailSender 未設定では警告が出ない', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      stackInputSchema.parse(baseParams);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('reauthenticationIntervalDays: 再認証間隔の検証', () => {
    test('デフォルト値は 7 日', () => {
      const params = stackInputSchema.parse(baseParams);

      expect(params.reauthenticationIntervalDays).toBe(7);
    });

    test('有効な値（1〜365日）を設定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        reauthenticationIntervalDays: 30,
      });

      expect(params.reauthenticationIntervalDays).toBe(30);
    });

    test('最小値（1日）を設定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        reauthenticationIntervalDays: 1,
      });

      expect(params.reauthenticationIntervalDays).toBe(1);
    });

    test('最大値（365日）を設定できる', () => {
      const params = stackInputSchema.parse({
        ...baseParams,
        reauthenticationIntervalDays: 365,
      });

      expect(params.reauthenticationIntervalDays).toBe(365);
    });

    test('範囲外の値（0日）でバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          reauthenticationIntervalDays: 0,
        }),
      ).toThrow();
    });

    test('範囲外の値（366日）でバリデーションエラーになる', () => {
      expect(() =>
        stackInputSchema.parse({
          ...baseParams,
          reauthenticationIntervalDays: 366,
        }),
      ).toThrow();
    });
  });
});
