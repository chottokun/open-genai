import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const SES_FROM_ADDRESS = process.env.SES_FROM_ADDRESS!;
const SES_TENANT_NAME = process.env.SES_TENANT_NAME!;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sesClient = new SESv2Client({});

export const sendEmail = async (
  to: string,
  subject: string,
  bodyHtml: string,
  bodyText?: string,
): Promise<void> => {
  const command = new SendEmailCommand({
    FromEmailAddress: SES_FROM_ADDRESS,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: bodyHtml,
            Charset: 'UTF-8',
          },
          ...(bodyText ? { Text: { Data: bodyText, Charset: 'UTF-8' } } : {}),
        },
      },
    },
    // SES Tenant 指定（レピュテーション分離用）
    // Tenant に関連付けられた Identity を使用して送信
    ...(SES_TENANT_NAME ? { TenantName: SES_TENANT_NAME } : {}),
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sesClient.send(command);
      return;
    } catch (error) {
      lastError = error;
      console.error(`SES SendEmail attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};
