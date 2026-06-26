import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamMemberCreateButton } from '../../../../src/features/team-members/components/TeamMemberCreateButton';
import { useFetchLoginUser } from '../../../../src/features/team-members/hooks/useFetchLoginUser';

// Mock dependencies
vi.mock('@/features/team-members/hooks/useFetchLoginUser');

describe('TeamMemberCreateButton', () => {
  const renderWithRouter = (teamId = 'team-1') => {
    return render(
      <MemoryRouter initialEntries={[`/teams/${teamId}/members`]}>
        <Routes>
          <Route path='/teams/:teamId/members' element={<TeamMemberCreateButton />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button when user is in SystemAdminGroup and is admin', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: true,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeDefined();
    });

    it('renders button when user is not in SystemAdminGroup but is admin', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: false,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeDefined();
    });

    it('renders button when user is in SystemAdminGroup and is not admin', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: true,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'user@example.com',
          isAdmin: false,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeDefined();
    });

    it('renders button when loginUser is undefined but isSystemAdminGroup is true', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: true,
        loginUser: undefined,
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeDefined();
    });

    it('does not render button when isSystemAdminGroup is false and loginUser is undefined', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: false,
        loginUser: undefined,
      });

      renderWithRouter();

      const link = screen.queryByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeNull();
    });

    it('does not render button when isSystemAdminGroup is false and isAdmin is false', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: false,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'user@example.com',
          isAdmin: false,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter();

      const link = screen.queryByRole('link', { name: 'メンバーを追加' });
      expect(link).toBeNull();
    });

    it('renders with correct link text', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: true,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link.textContent).toBe('メンバーを追加');
    });

    it('links to correct URL with teamId', () => {
      vi.mocked(useFetchLoginUser).mockReturnValue({
        isSystemAdminGroup: true,
        loginUser: {
          teamId: 'team-1',
          userId: 'user-1',
          username: 'admin@example.com',
          isAdmin: true,
          createdDate: '2024-01-01T00:00:00Z',
          updatedDate: '2024-01-02T00:00:00Z',
        },
      });

      renderWithRouter('team-123');

      const link = screen.getByRole('link', { name: 'メンバーを追加' });
      expect(link.getAttribute('href')).toBe('/teams/team-123/members/create');
    });
  });
});
