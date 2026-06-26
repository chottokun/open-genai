import {
  CognitoIdentityClient,
  DescribeIdentityPoolCommand,
  GetIdCommand,
  ListIdentityPoolsCommand,
} from '@aws-sdk/client-cognito-identity';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const cognitoMock = mockClient(CognitoIdentityClient);

const TEST_USER_POOL_ID = 'us-east-1_TEST123';
const TEST_REGION = 'us-east-1';
const EXPECTED_PROVIDER = `cognito-idp.${TEST_REGION}.amazonaws.com/${TEST_USER_POOL_ID}`;
const TEST_POOL_ID = 'us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TEST_IDENTITY_ID = 'us-east-1:11111111-2222-3333-4444-555555555555';
const TEST_ID_TOKEN = 'dummy-id-token';

beforeEach(() => {
  vi.resetModules();
  cognitoMock.reset();
  process.env.USER_POOL_ID = TEST_USER_POOL_ID;
  process.env.AWS_REGION = TEST_REGION;
});

afterEach(() => {
  cognitoMock.reset();
});

describe('resolveIdentityId', () => {
  test('単一ページで 1 件マッチ → 期待の IdentityId を返す', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock.on(GetIdCommand).resolves({ IdentityId: TEST_IDENTITY_ID });

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    expect(await resolveIdentityId(TEST_ID_TOKEN)).toBe(TEST_IDENTITY_ID);
  });

  test('ページングして 2 ページ目でマッチ', async () => {
    const otherPoolId = 'us-east-1:99999999-9999-9999-9999-999999999999';
    cognitoMock
      .on(ListIdentityPoolsCommand)
      .resolvesOnce({
        IdentityPools: [{ IdentityPoolId: otherPoolId, IdentityPoolName: 'other' }],
        NextToken: 'PAGE_2',
      })
      .resolvesOnce({
        IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
      });
    cognitoMock.on(DescribeIdentityPoolCommand, { IdentityPoolId: otherPoolId }).resolves({
      IdentityPoolId: otherPoolId,
      IdentityPoolName: 'other',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: 'cognito-idp.us-east-1.amazonaws.com/OTHER' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand, { IdentityPoolId: TEST_POOL_ID }).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock.on(GetIdCommand).resolves({ IdentityId: TEST_IDENTITY_ID });

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    expect(await resolveIdentityId(TEST_ID_TOKEN)).toBe(TEST_IDENTITY_ID);
    expect(cognitoMock.commandCalls(ListIdentityPoolsCommand)).toHaveLength(2);
  });

  test('全走査してマッチなし → 例外を throw', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: 'cognito-idp.us-east-1.amazonaws.com/OTHER' }],
    });

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    await expect(resolveIdentityId(TEST_ID_TOKEN)).rejects.toThrow(
      /No Cognito Identity Pool is linked/,
    );
  });

  test('2 回連続呼び出しで ListIdentityPools は 1 回だけ発行される (キャッシュ)', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock.on(GetIdCommand).resolves({ IdentityId: TEST_IDENTITY_ID });

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    await resolveIdentityId(TEST_ID_TOKEN);
    await resolveIdentityId(TEST_ID_TOKEN);
    expect(cognitoMock.commandCalls(ListIdentityPoolsCommand)).toHaveLength(1);
  });

  test('GetId が IdentityId を返さない → 例外を throw', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock.on(GetIdCommand).resolves({});

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    await expect(resolveIdentityId(TEST_ID_TOKEN)).rejects.toThrow(
      'Failed to resolve Cognito Identity ID',
    );
  });

  test('GetId 1 回目失敗 → キャッシュクリアして再 discovery → 2 回目成功', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock
      .on(GetIdCommand)
      .rejectsOnce(new Error('NotAuthorizedException'))
      .resolvesOnce({ IdentityId: TEST_IDENTITY_ID });

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    expect(await resolveIdentityId(TEST_ID_TOKEN)).toBe(TEST_IDENTITY_ID);
    // 1 段リトライによりキャッシュがクリアされ ListIdentityPools が 2 回呼ばれる
    expect(cognitoMock.commandCalls(ListIdentityPoolsCommand)).toHaveLength(2);
    expect(cognitoMock.commandCalls(GetIdCommand)).toHaveLength(2);
  });

  test('GetId 2 回連続失敗 → 例外を伝播（無限ループしない）', async () => {
    cognitoMock.on(ListIdentityPoolsCommand).resolves({
      IdentityPools: [{ IdentityPoolId: TEST_POOL_ID, IdentityPoolName: 'pool' }],
    });
    cognitoMock.on(DescribeIdentityPoolCommand).resolves({
      IdentityPoolId: TEST_POOL_ID,
      IdentityPoolName: 'pool',
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [{ ProviderName: EXPECTED_PROVIDER }],
    });
    cognitoMock.on(GetIdCommand).rejects(new Error('NotAuthorizedException'));

    const { resolveIdentityId } = await import('../../../lambda/utils/cognitoIdentity');
    await expect(resolveIdentityId(TEST_ID_TOKEN)).rejects.toThrow('NotAuthorizedException');
    expect(cognitoMock.commandCalls(GetIdCommand)).toHaveLength(2);
  });
});
