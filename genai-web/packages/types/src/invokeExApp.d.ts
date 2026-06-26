export type InvokeExAppRequest = {
  teamId: string;
  exAppId: string;
  inputs: Record<string, any>;
  sessionId?: string;
  // 注意: userId（安定ID）はHTTPヘッダー x-user-id で送信されるため、
  // リクエストBodyの型定義には含めない
};

export type UsageMetadata = {
  estimatedCostInfo?: string;
  modelVersion: string;
  requestCount: number;
  tokens: {
    candidatesTokenCount: number;
    promptTokenCount: number;
    totalTokenCount: number;
  };
};

export type InvokeExAppResponse = {
  outputs: string;
  artifacts?: {
    content: string;
    display_name: string;
  }[];
  timestamps: {
    processingEndedAt: string;
    processingStartedAt: string;
  };
  usageMetadata?: UsageMetadata[];
};

export type Artifact = {
  display_name: string;
  file_url: string;
};

export type ExAppInvokeStatus = 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';

export type InvokeExAppHistory = {
  teamId: string;
  teamName: string;
  exAppId: string;
  exAppName: string;
  userId: string;
  inputs: Record<string, any>;
  outputs: string;
  createdDate: string;
  status: ExAppInvokeStatus;
  progress: string;
  artifacts?: Artifact[];
  sessionId?: string;
};

export type ListInvokeExAppHistoriesRequest = {
  teamId: string;
  exAppId: string;
  exclusiveStartKey: string | null;
};

export type ListInvokeExAppHistoriesResponse = {
  history: InvokeExAppHistory[];
  lastEvaluatedKey: string | null;
};

export type GetInvokeExAppHistoryResponse = {
  history: InvokeExAppHistory | null;
};
