import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';

interface MetricData {
  exAppId: string;
  teamId: string;
  errorType?: string;
  responseTime?: number;
  statusCode?: number;
  endpoint?: string;
  userId?: string;
  envName?: string;
}

export const classifyErrorType = (statusCode: number, responseBody: any): string => {
  if (statusCode >= 500) return 'SERVER_ERROR';
  if (statusCode === 502 || statusCode === 503 || statusCode === 504) return 'SERVICE_UNAVAILABLE';
  if (statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
  if (statusCode === 408) return 'TIMEOUT';
  if (statusCode >= 400) return 'CLIENT_ERROR';
  return 'UNKNOWN_ERROR';
};

export const publishErrorMetrics = async (
  cloudWatchClient: CloudWatchClient,
  errorData: MetricData,
) => {
  const commonDimensions = [
    { Name: 'ExAppId', Value: errorData.exAppId },
    { Name: 'TeamId', Value: errorData.teamId },
    { Name: 'ErrorType', Value: errorData.errorType },
  ];

  const metricData = [
    // Detailed dimensional metrics for analysis
    {
      MetricName: 'ExAppErrors',
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: commonDimensions,
    },
    {
      MetricName: 'ExAppResponseTime',
      Value: errorData.responseTime,
      Unit: StandardUnit.Milliseconds,
      Dimensions: commonDimensions,
    },

    // Aggregated metrics for alarms (no dimensions - matches monitoring stack)
    {
      MetricName: 'ExAppErrors',
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: [], // No dimensions for general error alarm
    },

    // Error type specific metrics for specific alarms (partial dimensions)
    {
      MetricName: 'ExAppErrors',
      Value: 1,
      Unit: StandardUnit.Count,
      Dimensions: [{ Name: 'ErrorType', Value: errorData.errorType }],
    },
  ];

  await cloudWatchClient.send(
    new PutMetricDataCommand({
      Namespace: `GenAI/ExApp/Errors-${errorData.envName}`,
      MetricData: metricData,
    }),
  );
};

export const publishSuccessMetrics = async (
  cloudWatchClient: CloudWatchClient,
  successData: MetricData,
) => {
  const dimensions = [
    { Name: 'ExAppId', Value: successData.exAppId },
    { Name: 'TeamId', Value: successData.teamId },
  ];

  await cloudWatchClient.send(
    new PutMetricDataCommand({
      Namespace: `GenAI/ExApp/Success-${successData.envName}`,
      MetricData: [
        {
          MetricName: 'ExAppInvocations',
          Value: 1,
          Unit: StandardUnit.Count,
          Dimensions: dimensions,
        },
        {
          MetricName: 'ExAppResponseTime',
          Value: successData.responseTime,
          Unit: StandardUnit.Milliseconds,
          Dimensions: dimensions,
        },
      ],
    }),
  );
};
