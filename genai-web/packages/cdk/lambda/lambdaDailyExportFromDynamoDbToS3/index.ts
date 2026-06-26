import { DynamoDBClient, ExportTableToPointInTimeCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({});
const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // +09:00
const DAY_MS = 24 * 60 * 60 * 1000; // one day

export const handler = async (event: any) => {
  /* ────── derive midnight-to-midnight JST window ────── */
  const nowUtcMs = Date.now(); // e.g. 18:00 UTC
  const dayIndexJst = Math.floor((nowUtcMs + JST_OFFSET_MS) / DAY_MS);
  const today0JstUtcMs = dayIndexJst * DAY_MS - JST_OFFSET_MS; // D 00:00 JST in UTC
  const yest0JstUtcMs = today0JstUtcMs - DAY_MS; // D-1 00:00 JST in UTC

  const exportFromTime = new Date(yest0JstUtcMs); // inclusive
  const exportToTime = new Date(today0JstUtcMs); // exclusive
  // Pick a start time within the PITR window.
  // The export period duration must be at least 15 minutes
  // and be no longer than 24 hours.
  // The export period's start time is inclusive and the end time is exclusive.
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport_Requesting.html

  /* ────── build S3 prefix for the exported day (D-1) ────── */
  const yest0JstLocal = new Date(yest0JstUtcMs + JST_OFFSET_MS); // shift to JST
  const year = yest0JstLocal.getUTCFullYear().toString(); // YYYY
  const month = (yest0JstLocal.getUTCMonth() + 1).toString().padStart(2, '0'); // MM
  const day = yest0JstLocal.getUTCDate().toString().padStart(2, '0'); // DD
  const rand = Math.floor(Math.random() * 1_000_000) // 123456
    .toString()
    .padStart(6, '0');

  const prefix = `${process.env.S3_PREFIX ?? ''}${year}/${month}/${day}`;
  // actual path automatically generated
  // s3://{process.env.BUCKET_NAME}/{prefix}/AWSDynamoDB/xxxx-xxxx/data/xxxx.json.gz
  // (multiple .json.gz files will be created in one folder)

  try {
    /* ────── invoke incremental export ────── */
    const response = await ddb.send(
      new ExportTableToPointInTimeCommand({
        TableArn: process.env.TABLE_ARN!,
        S3Bucket: process.env.BUCKET_NAME!,
        S3Prefix: prefix,
        ExportFormat: 'DYNAMODB_JSON',
        ExportType: 'INCREMENTAL_EXPORT', // "INCREMENTAL_EXPORT" or "FULL_EXPORT"
        IncrementalExportSpecification: {
          ExportFromTime: exportFromTime,
          ExportToTime: exportToTime,
          ExportViewType: 'NEW_AND_OLD_IMAGES',
        },
        ClientToken: `${exportFromTime.getTime()}-${rand}`,
      }),
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Export initiated successfully',
        exportId: response.ExportDescription?.ExportArn,
        response: response,
      }),
    };
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error occurred during export',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
