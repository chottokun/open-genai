interface invocationUsageItem {
  schemaType: string;
  schemaVersion: string;
  timestamp: string;
  accountId: string;
  identity: {
    arn: string;
  };
  region: string;
  requestId: string;
  operation: string;
  modelId: string;
  input: {
    inputContentType: string;
    inputTokenCount: number;
    cacheReadInputTokenCount: number;
    cacheWriteInputTokenCount: number;
  };
  output: {
    outputContentType: string;
    outputTokenCount: number;
  };
}
interface CognitoUserActivityLogItem {
  [key: string]: any;
}

interface RequestBody {
  appEnv: string;
  s3BucketName?: string;
  invocationUsages: invocationUsageItem[];
  cognitoUserActivityLogs?: CognitoUserActivityLogItem[];
  year: string;
  month: string;
  day: string;
}

export type { invocationUsageItem, CognitoUserActivityLogItem, RequestBody };
