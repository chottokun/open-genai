import { StartTranscriptionJobCommand, TranscribeClient } from '@aws-sdk/client-transcribe';
import { StartTranscriptionRequest } from 'genai-web';
import { createApiHandler } from './utils/createApiHandler';
import { authorizeOwnedKey, resolveRequestIdentityId } from './utils/fileOwnership';
import { HttpError } from './utils/httpError';
import { parseJsonBody } from './utils/parseJsonBody';

export const handler = createApiHandler(async (event) => {
  const client = new TranscribeClient({});
  const req = parseJsonBody(event.body) as StartTranscriptionRequest;
  const userId = event.requestContext.authorizer!.claims.sub;

  const { audioKey, speakerLabel, maxSpeakers } = req;

  const identityId = await resolveRequestIdentityId(event);
  if (!authorizeOwnedKey(audioKey, identityId)) {
    throw new HttpError(403, 'Access denied: You can only transcribe your own files');
  }

  const uuid = crypto.randomUUID();

  const command = new StartTranscriptionJobCommand({
    IdentifyLanguage: true,
    LanguageOptions: ['ja-JP', 'en-US'],
    Media: { MediaFileUri: `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}` },
    TranscriptionJobName: uuid,
    Settings: {
      ShowSpeakerLabels: speakerLabel,
      MaxSpeakerLabels: speakerLabel ? maxSpeakers : undefined,
    },
    OutputBucketName: process.env.TRANSCRIPT_BUCKET_NAME,
    Tags: [
      {
        Key: 'userId',
        Value: userId,
      },
      {
        Key: 'Environment',
        Value: process.env.APP_ENV || 'default',
      },
    ],
  });
  const res = await client.send(command);

  return {
    statusCode: 200,
    body: { jobName: res.TranscriptionJob!.TranscriptionJobName },
  };
});
