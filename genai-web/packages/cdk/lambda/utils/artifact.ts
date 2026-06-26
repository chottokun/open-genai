import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const ARTIFACTS_BUCKET_NAME = process.env.ARTIFACTS_BUCKET_NAME!;

interface Artifact {
  mime_type: string;
  display_name: string;
  contents: string; // base64 encoded
}

interface ProcessedArtifact {
  display_name: string;
  file_url: string;
}

export const processArtifacts = async (
  artifacts: Artifact[],
  s3Prefix: string,
): Promise<ProcessedArtifact[]> => {
  const processedArtifacts: ProcessedArtifact[] = [];

  for (const artifact of artifacts) {
    const decodedContent = Buffer.from(artifact.contents, 'base64');
    const s3Key = `${s3Prefix}/${artifact.display_name}`;
    const s3Url = `s3://${ARTIFACTS_BUCKET_NAME}/${s3Key}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: ARTIFACTS_BUCKET_NAME,
        Key: s3Key,
        Body: decodedContent,
        ContentType: artifact.mime_type,
      }),
    );

    processedArtifacts.push({
      display_name: artifact.display_name,
      file_url: s3Url,
    });
  }

  return processedArtifacts;
};
