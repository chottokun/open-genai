import { buildClient, CommitmentPolicy, KmsKeyringNode } from '@aws-crypto/client-node';
import { sendEmail } from './utils/sesApi';

const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);

const keyring = new KmsKeyringNode({
  keyIds: [process.env.KMS_KEY_ARN!],
});

type TriggerSource =
  | 'CustomEmailSender_SignUp'
  | 'CustomEmailSender_ResendCode'
  | 'CustomEmailSender_ForgotPassword'
  | 'CustomEmailSender_UpdateUserAttribute'
  | 'CustomEmailSender_VerifyUserAttribute'
  | 'CustomEmailSender_AdminCreateUser'
  | 'CustomEmailSender_AccountTakeOverNotification'
  | 'CustomEmailSender_Authentication';

interface CustomEmailSenderEvent {
  version: string;
  triggerSource: TriggerSource;
  region: string;
  userPoolId: string;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: {
    type: string;
    code: string;
    userAttributes: {
      email: string;
      email_verified: string;
      [key: string]: string;
    };
    clientMetadata?: Record<string, string>;
  };
  response: Record<string, never>;
}

interface EmailTemplate {
  subject: string;
  codeLabel: string;
  description: string;
  note?: string;
}

const TEMPLATE_MAP: Record<string, EmailTemplate> = {
  CustomEmailSender_SignUp: {
    subject: 'アカウント確認',
    codeLabel: '確認コード',
    description: 'アカウント登録を完了するため、以下の確認コードを入力してください。',
    note: 'このメールに心当たりがない場合は、無視してください。',
  },
  CustomEmailSender_ResendCode: {
    subject: '確認コード（再送信）',
    codeLabel: '確認コード',
    description: '確認コードを再送信しました。以下のコードを入力して登録を完了してください。',
    note: 'このメールに心当たりがない場合は、無視してください。',
  },
  CustomEmailSender_ForgotPassword: {
    subject: 'パスワードリセット',
    codeLabel: 'リセットコード',
    description: 'パスワードのリセットが申請されました。以下のコードを入力してください。',
    note: 'パスワードのリセットを申請していない場合は、このメールを無視してください。',
  },
  CustomEmailSender_AdminCreateUser: {
    subject: 'アカウントへの招待',
    codeLabel: '一時パスワード',
    description:
      '管理者によりアカウントが作成されました。以下の一時パスワードでログインし、速やかにパスワードを変更してください。',
  },
  CustomEmailSender_Authentication: {
    subject: '認証コード',
    codeLabel: '認証コード',
    description: 'ログインの認証コードです。以下のコードを入力してください。',
    note: 'ログインを試みていない場合は、アカウントのパスワード変更を検討してください。',
  },
  CustomEmailSender_UpdateUserAttribute: {
    subject: 'アカウント情報の変更確認',
    codeLabel: '確認コード',
    description: 'アカウント情報の変更を確認するため、以下の確認コードを入力してください。',
    note: 'このメールに心当たりがない場合は、無視してください。',
  },
  CustomEmailSender_VerifyUserAttribute: {
    subject: 'アカウント情報の確認',
    codeLabel: '確認コード',
    description: 'アカウント情報を確認するため、以下の確認コードを入力してください。',
    note: 'このメールに心当たりがない場合は、無視してください。',
  },
};

const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: '通知',
  codeLabel: 'コード',
  description: '以下のコードを入力してください。',
};

const buildEmailHtml = (template: EmailTemplate, code: string): string => {
  const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const noteHtml = template.note ? `\n  <p style="margin-top:8px;">※ ${template.note}</p>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="max-width:480px;margin:0 auto;color:#333333;font-size:16px;padding:24px;">
  <h1>${template.subject}</h1>
  <p style="margin-top:16px;">${template.description}</p>
  <p style="margin-top:16px;">${template.codeLabel}</p>
  <p style="margin-top:8px;padding:8px 16px;font-size:32px;font-weight:bold;background-color:#f2f2f2;letter-spacing:8px;">${escapedCode}</p>
  ${noteHtml}
</body>
</html>`;
};

const buildEmailText = (template: EmailTemplate, code: string): string => {
  const lines = [template.description, '', `${template.codeLabel}: ${code}`];
  if (template.note) {
    lines.push('', template.note);
  }
  return lines.join('\n');
};

export const handler = async (event: CustomEmailSenderEvent): Promise<void> => {
  const { triggerSource, request } = event;
  const { code: encryptedCode, userAttributes } = request;
  const toAddress = userAttributes.email;

  try {
    const { plaintext } = await decrypt(keyring, Buffer.from(encryptedCode, 'base64'));
    const code = plaintext.toString('utf-8');

    const template = TEMPLATE_MAP[triggerSource] ?? DEFAULT_TEMPLATE;

    const bodyHtml = buildEmailHtml(template, code);
    const bodyText = buildEmailText(template, code);

    await sendEmail(toAddress, template.subject, bodyHtml, bodyText);

    console.info(`Email sent successfully: triggerSource=${triggerSource}, to=${toAddress}`);
  } catch (error) {
    console.error(`Failed to send email: triggerSource=${triggerSource}, to=${toAddress}`, error);
    throw error;
  }
};
