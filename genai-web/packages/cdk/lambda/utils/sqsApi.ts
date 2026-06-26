import { ChangeMessageVisibilityCommand, SQSClient } from '@aws-sdk/client-sqs';

const client = new SQSClient({});

const changeMessageVisibility = async (
  queueUrl: string,
  receiptHandle: string,
  visibilityTimeout: number,
) => {
  const command = new ChangeMessageVisibilityCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
    VisibilityTimeout: visibilityTimeout,
  });
  await client.send(command);
};

export { changeMessageVisibility };
