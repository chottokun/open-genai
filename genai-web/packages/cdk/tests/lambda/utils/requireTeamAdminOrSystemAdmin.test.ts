import type { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, expect, type MockedFunction, test, vi } from 'vitest';
import { findTeamUserById } from '../../../lambda/repository/teamUserRepository';
import { HttpError } from '../../../lambda/utils/httpError';
import { requireTeamAdminOrSystemAdmin } from '../../../lambda/utils/requireTeamAdminOrSystemAdmin';

vi.mock('../../../lambda/repository/teamUserRepository');

const mockedFindTeamUserById = findTeamUserById as MockedFunction<typeof findTeamUserById>;

function createEventWithGroups(groups: string, userId: string = 'test-user-id'): APIGatewayProxyEvent {
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

describe('requireTeamAdminOrSystemAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('SystemAdminGroupの場合、エラーをスローしない', async () => {
    const event = createEventWithGroups('SystemAdminGroup');

    await expect(requireTeamAdminOrSystemAdmin(event, 'team-1')).resolves.toBeUndefined();
  });

  test('TeamAdminGroupかつチーム管理者の場合、エラーをスローしない', async () => {
    const event = createEventWithGroups('TeamAdminGroup', 'admin-user');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'admin-user',
      username: 'admin@example.com',
      isAdmin: true,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    await expect(requireTeamAdminOrSystemAdmin(event, 'team-1')).resolves.toBeUndefined();
    expect(mockedFindTeamUserById).toHaveBeenCalledWith('team-1', 'admin-user');
  });

  test('TeamAdminGroupだがチーム管理者でない場合、HttpError(403)をスローする', async () => {
    const event = createEventWithGroups('TeamAdminGroup', 'normal-user');
    mockedFindTeamUserById.mockResolvedValue({
      teamId: 'team-1',
      userId: 'normal-user',
      username: 'user@example.com',
      isAdmin: false,
      createdDate: '2025-01-01',
      updatedDate: '2025-01-01',
    });

    try {
      await requireTeamAdminOrSystemAdmin(event, 'team-1');
      expect.fail('エラーがスローされるべき');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
      expect((error as HttpError).message).toBe('管理者ではないため利用できません。');
    }
  });

  test('UserGroupのみの場合、HttpError(403)をスローする', async () => {
    const event = createEventWithGroups('UserGroup', 'normal-user');
    mockedFindTeamUserById.mockResolvedValue(undefined);

    try {
      await requireTeamAdminOrSystemAdmin(event, 'team-1');
      expect.fail('エラーがスローされるべき');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
    }
  });

  test('チームに所属していない場合、HttpError(403)をスローする', async () => {
    const event = createEventWithGroups('TeamAdminGroup', 'outsider');
    mockedFindTeamUserById.mockResolvedValue(undefined);

    try {
      await requireTeamAdminOrSystemAdmin(event, 'team-1');
      expect.fail('エラーがスローされるべき');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(403);
    }
  });
});
