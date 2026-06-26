import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createApiHandler } from './utils/createApiHandler';
import { authorizeOwnedKey, resolveRequestIdentityId } from './utils/fileOwnership';
import { HttpError } from './utils/httpError';
import { requirePathParam } from './utils/requirePathParam';

export const handler = createApiHandler(async (event) => {
  // API Gateway は REST API のパスパラメータを自動デコードしないため、S3 Key に含まれる
  // `/` (`%2F`) や `:` (`%3A`) を復号して元の Key 文字列に戻す
  const fileName = decodeURIComponent(requirePathParam(event, 'fileName'));

  const identityId = await resolveRequestIdentityId(event);
  if (!authorizeOwnedKey(fileName, identityId)) {
    throw new HttpError(403, 'Access denied: You can only delete your own files');
  }

  const client = new S3Client({});
  const command = new DeleteObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: fileName,
  });

  await client.send(command);

  return {
    statusCode: 204,
    body: '',
  };
});
