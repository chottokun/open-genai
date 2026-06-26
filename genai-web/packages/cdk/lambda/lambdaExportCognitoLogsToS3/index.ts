import { CloudWatchLogsClient, CreateExportTaskCommand } from '@aws-sdk/client-cloudwatch-logs';

const logsClient = new CloudWatchLogsClient({});

const BUCKET_NAME = process.env.BUCKET_NAME!;
const LOG_GROUP_NAME = process.env.LOG_GROUP_NAME!;
const S3_PREFIX = process.env.S3_PREFIX!;

export const handler = async () => {
  const now = new Date();
  // どの環境でも24時間対応する確実な方法
  // The following logic is based on lambdaUserPoolUsers/index.ts to reliably get JST-based date.
  const jstString = now.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
  });
  // jstDate is a Date object whose UTC time has the same clock reading as the JST time.
  const jstDate = new Date(jstString);

  // Start of today, using the JST date, but the resulting object is still in UTC.
  const today = new Date(jstDate);
  today.setHours(0, 0, 0, 0);

  // Start of yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // The `today` and `yesterday` objects represent midnight, but in UTC date/time parts.
  // To get the actual JST midnight timestamp, we need to subtract the JST offset.
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  const from = yesterday.getTime() - JST_OFFSET;
  const to = today.getTime() - JST_OFFSET;

  // Create a unique task name to avoid conflicts
  const taskName = `export-cognito-logs-${yesterday.toISOString().split('T')[0]}-${Date.now()}`;

  const year = yesterday.getFullYear();
  const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
  const day = yesterday.getDate().toString().padStart(2, '0');
  const destinationPrefix = `${S3_PREFIX}/${year}/${month}/${day}`;

  try {
    const command = new CreateExportTaskCommand({
      logGroupName: LOG_GROUP_NAME,
      from: from,
      to: to,
      destination: BUCKET_NAME,
      destinationPrefix,
      taskName: taskName,
    });
    await logsClient.send(command);
    return { statusCode: 200 };
  } catch (error) {
    // It's possible a task with the same name already exists if the lambda is re-run.
    if (error instanceof Error && error.name === 'LimitExceededException') {
      console.warn(`Export task may already exist: ${error.message}`);
      return { statusCode: 200 };
    }
    console.error('Error creating export task:', error);
    return { statusCode: 500 };
  }
};
