import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createApiHandler } from './utils/createApiHandler';
import { authorizeOwnedKey, resolveRequestIdentityId } from './utils/fileOwnership';
import { HttpError } from './utils/httpError';
import { requireQueryParam } from './utils/requireQueryParam';

export const handler = createApiHandler(async (event) => {
  const filePrefix = requireQueryParam(event, 'filePrefix');
  const contentType = event.queryStringParameters?.contentType;
  // NOTE: `bucketName` / `region` query parameters are accepted for frontend
  // backwards compatibility but intentionally ignored. Access is restricted to
  // the Lambda's own bucket to prevent cross-bucket abuse.
  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    throw new HttpError(500, 'BUCKET_NAME is not configured');
  }

  const identityId = await resolveRequestIdentityId(event);
  if (!authorizeOwnedKey(filePrefix, identityId)) {
    throw new HttpError(403, 'Access denied: You can only access your own files');
  }

  const client = new S3Client({});

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePrefix,
    ...(contentType && { ResponseContentType: contentType }),
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 });

  return {
    statusCode: 200,
    body: signedUrl,
  };
});
