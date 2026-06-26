import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetFileUploadSignedUrlRequest } from 'genai-web';
import { createApiHandler } from './utils/createApiHandler';
import { resolveRequestIdentityId } from './utils/fileOwnership';
import { parseJsonBody } from './utils/parseJsonBody';

export const handler = createApiHandler(async (event) => {
  const req = parseJsonBody(event.body) as GetFileUploadSignedUrlRequest;
  const filename = req.filename;

  const identityId = await resolveRequestIdentityId(event);
  const uuid = crypto.randomUUID();

  const client = new S3Client({});

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `${identityId}/${uuid}/${filename}`,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    body: signedUrl,
  };
});
