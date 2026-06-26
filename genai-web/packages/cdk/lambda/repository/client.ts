import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME: string = process.env.TABLE_NAME!;
export const EXAPP_TABLE_NAME: string = process.env.EXAPP_TABLE_NAME!;
export const INVOKE_HISTORY_TABLE_NAME: string = process.env.INVOKE_HISTORY_TABLE_NAME!;

export const dynamoDb = new DynamoDBClient({});
export const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

export const TTL_DAYS = parseInt(process.env.TTL_DAYS || '364', 10);
