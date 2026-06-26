import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { findTeamUserById } from '../../../lambda/repository/teamUserRepository';
import { isSystemAdmin, isTeamAdmin, isTeamUser } from '../../../lambda/utils/teamRole';

vi.mock('../../../lambda/repository/teamUserRepository');

const mockedFindTeamUserById = findTeamUserById as MockedFunction<typeof findTeamUserById>;

function createAPIGatewayProxyEvent(groups: string, userId: string = 'test-user-id'): APIGatewayProxyEvent {
  return {
    requestContext: {
      authorizer: {
        claims: {
          'cognito:groups': groups,
          sub: userId,
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

describe('isSystemAdmin', () => {
  test('SystemAdminGroupを含む場合、trueを返す', () => {
    const event = createAPIGatewayProxyEvent('SystemAdminGroup');

    const result = isSystemAdmin(event);

    expect(result).toBe(true);
  });

  test('SystemAdminGroupを含まない場合、falseを返す', () => {
    const event = createAPIGatewayProxyEvent('UserGroup');

    const result = isSystemAdmin(event);

    expect(result).toBe(false);
  });

  test('複数グループにSystemAdminGroupが含まれる場合、trueを返す', () => {
    const event = createAPIGatewayProxyEvent('UserGroup,SystemAdminGroup,TeamAdminGroup');

    const result = isSystemAdmin(event);

    expect(result).toBe(true);
  });

  test('グループが空の場合、falseを返す', () => {
    const event = createAPIGatewayProxyEvent('');

    const result = isSystemAdmin(event);

    expect(result).toBe(false);
  });

  test('部分一致するグループ名の場合、falseを返す', () => {
    const event = createAPIGatewayProxyEvent('NotSystemAdminGroup');

    const result = isSystemAdmin(event);

    expect(result).toBe(false);
  });

  test('部分一致するグループ名が複数グループに含まれる場合、falseを返す', () => {
    const event = createAPIGatewayProxyEvent('NotSystemAdminGroup,UserGroup');

    const result = isSystemAdmin(event);

    expect(result).toBe(false);
  });
});

describe('isTeamAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('TeamAdminGroupを含み、チームのisAdmin権限を持つ場合、trueを返す', async () => {
    const event = createAPIGatewayProxyEvent('TeamAdminGroup', 'admin-user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'admin-user-id',
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(true);
    expect(mockedFindTeamUserById).toHaveBeenCalledWith('team-1', 'admin-user-id');
  });

  test('TeamAdminGroupを含むが、チームに所属していない場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('TeamAdminGroup', 'admin-user-id');
    mockedFindTeamUserById.mockResolvedValue(null);

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(false);
  });

  test('TeamAdminGroupを含むが、isAdminがfalseの場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('TeamAdminGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-id',
      username: 'user@example.com',
      isAdmin: false,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(false);
  });

  test('TeamAdminGroupを含まない場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('UserGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-id',
      username: 'user@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(false);
  });

  test('部分一致するグループ名の場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('ReadOnlyTeamAdminGroup', 'admin-user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'admin-user-id',
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(false);
  });

  test('複数グループにTeamAdminGroupが含まれ、isAdmin権限がある場合、trueを返す', async () => {
    const event = createAPIGatewayProxyEvent('UserGroup,TeamAdminGroup', 'admin-user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'admin-user-id',
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamAdmin(event, 'team-1');

    expect(result).toBe(true);
  });
});

describe('isTeamUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('UserGroupを含み、チームに所属している場合、trueを返す', async () => {
    const event = createAPIGatewayProxyEvent('UserGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-id',
      username: 'user@example.com',
      isAdmin: false,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamUser(event, 'team-1');

    expect(result).toBe(true);
    expect(mockedFindTeamUserById).toHaveBeenCalledWith('team-1', 'user-id');
  });

  test('UserGroupを含むが、チームに所属していない場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('UserGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue(null);

    const result = await isTeamUser(event, 'team-1');

    expect(result).toBe(false);
  });

  test('UserGroupを含まない場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('TeamAdminGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-id',
      username: 'user@example.com',
      isAdmin: false,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamUser(event, 'team-1');

    expect(result).toBe(false);
  });

  test('部分一致するグループ名の場合、falseを返す', async () => {
    const event = createAPIGatewayProxyEvent('PowerUserGroup', 'user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-id',
      username: 'user@example.com',
      isAdmin: false,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamUser(event, 'team-1');

    expect(result).toBe(false);
  });

  test('チーム管理者もisTeamUserではtrueとなる（UserGroupを含む場合）', async () => {
    const event = createAPIGatewayProxyEvent('UserGroup,TeamAdminGroup', 'admin-user-id');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'admin-user-id',
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    const result = await isTeamUser(event, 'team-1');

    expect(result).toBe(true);
  });
});
