import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetTranscriptionJobCommand, TranscribeClient } from '@aws-sdk/client-transcribe';
import { GetTranscriptionResponse, Transcript } from 'genai-web';
import { createApiHandler } from './utils/createApiHandler';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';

function parseS3Url(s3Url: string) {
  const url = new URL(s3Url);

  const pathParts = url.pathname.split('/');
  const bucket = pathParts[1];
  const key = pathParts.slice(2).join('/');

  return { bucket, key };
}

export const handler = createApiHandler(async (event) => {
  const transcribeClient = new TranscribeClient({});
  const s3Client = new S3Client({});
  const jobName = requirePathParam(event, 'jobName');
  const userId = event.requestContext.authorizer!.claims.sub;

  const command = new GetTranscriptionJobCommand({
    TranscriptionJobName: jobName,
  });

  const res = await transcribeClient.send(command);
  if (res.TranscriptionJob?.Tags?.find((tag) => tag.Key === 'userId' && tag.Value !== userId)) {
    throw new HttpError(403, 'Forbidden');
  }

  if (res.TranscriptionJob?.TranscriptionJobStatus === 'COMPLETED') {
    const { bucket, key } = parseS3Url(res.TranscriptionJob.Transcript!.TranscriptFileUri!);
    const s3Result = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const output = JSON.parse(await s3Result.Body!.transformToString());

    const rawTranscripts: Transcript[] = output.results.audio_segments.map(
      (item: { transcript: string; speaker_label?: string }) => ({
        speakerLabel: item.speaker_label,
        transcript: item.transcript,
      }),
    );

    const transcripts = rawTranscripts
      .reduce((prev, item) => {
        if (prev.length === 0 || item.speakerLabel !== prev[prev.length - 1].speakerLabel) {
          prev.push({
            speakerLabel: item.speakerLabel,
            transcript: item.transcript,
          });
        } else {
          prev[prev.length - 1].transcript += ' ' + item.transcript;
        }
        return prev;
      }, [] as Transcript[])
      .map((item) => ({
        ...item,
        transcript:
          output.results.language_code === 'ja-JP'
            ? item.transcript.replace(/ /g, '')
            : item.transcript,
      }));

    const response: GetTranscriptionResponse = {
      status: res.TranscriptionJob?.TranscriptionJobStatus,
      languageCode: output.results.language_code,
      transcripts: transcripts,
    };

    return {
      statusCode: 200,
      body: response,
    };
  }

  return {
    statusCode: 200,
    body: { status: res.TranscriptionJob?.TranscriptionJobStatus },
  };
});
