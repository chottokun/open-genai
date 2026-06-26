import {
  CognitoIdentityClient,
  DescribeIdentityPoolCommand,
  GetIdCommand,
  ListIdentityPoolsCommand,
} from '@aws-sdk/client-cognito-identity';

const client = new CognitoIdentityClient({});

const USER_POOL_ID = process.env.USER_POOL_ID!;
const REGION = process.env.AWS_REGION!;
const LIST_MAX_RESULTS = 60;

let cachedIdentityPoolId: string | undefined;

export async function resolveIdentityId(idToken: string): Promise<string> {
  const issuer = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
  try {
    return await getIdOnce(idToken, issuer, await discoverIdentityPoolId());
  } catch (_err) {
    // キャッシュされた Pool ID が stale な可能性を考慮して 1 度だけ再試行
    cachedIdentityPoolId = undefined;
    return await getIdOnce(idToken, issuer, await discoverIdentityPoolId());
  }
}

async function getIdOnce(idToken: string, issuer: string, identityPoolId: string): Promise<string> {
  const result = await client.send(
    new GetIdCommand({
      IdentityPoolId: identityPoolId,
      Logins: { [issuer]: idToken },
    }),
  );
  if (!result.IdentityId) {
    throw new Error('Failed to resolve Cognito Identity ID');
  }
  return result.IdentityId;
}

async function discoverIdentityPoolId(): Promise<string> {
  if (cachedIdentityPoolId) return cachedIdentityPoolId;

  const expectedProvider = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new ListIdentityPoolsCommand({ MaxResults: LIST_MAX_RESULTS, NextToken: nextToken }),
    );
    for (const pool of res.IdentityPools ?? []) {
      if (!pool.IdentityPoolId) continue;
      const detail = await client.send(
        new DescribeIdentityPoolCommand({ IdentityPoolId: pool.IdentityPoolId }),
      );
      const matched = detail.CognitoIdentityProviders?.some(
        (p) => p.ProviderName === expectedProvider,
      );
      if (matched) {
        cachedIdentityPoolId = pool.IdentityPoolId;
        return cachedIdentityPoolId;
      }
    }
    nextToken = res.NextToken;
  } while (nextToken);

  throw new Error(
    `No Cognito Identity Pool is linked to User Pool ${USER_POOL_ID} in region ${REGION}`,
  );
}
