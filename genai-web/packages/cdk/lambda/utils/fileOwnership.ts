import { APIGatewayProxyEvent } from 'aws-lambda';
import { resolveIdentityId } from './cognitoIdentity';
import { HttpError } from './httpError';

export function extractKeyOwner(key: string): string | undefined {
  const [first] = key.split('/');
  return first ? first : undefined;
}

export function authorizeOwnedKey(key: string, requestIdentityId: string): boolean {
  const owner = extractKeyOwner(key);
  return owner !== undefined && owner === requestIdentityId;
}

export async function resolveRequestIdentityId(event: APIGatewayProxyEvent): Promise<string> {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  const idToken = authHeader?.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    throw new HttpError(401, 'Authorization header is required');
  }
  return resolveIdentityId(idToken);
}
