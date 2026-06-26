import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamCreateButton } from '../../../../src/features/teams/components/TeamCreateButton';
import { useTeamAuth } from '../../../../src/features/teams/hooks/useTeamAuth';

// Mock dependencies
vi.mock('@/features/teams/hooks/useTeamAuth');

describe('TeamCreateButton', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <TeamCreateButton />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button when user is in SystemAdminGroup', () => {
      vi.mocked(useTeamAuth).mockReturnValue({
        isSystemAdminGroup: true,
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'チームを作成' });
      expect(link).toBeDefined();
    });

    it('does not render button when user is not in SystemAdminGroup', () => {
      vi.mocked(useTeamAuth).mockReturnValue({
        isSystemAdminGroup: false,
      });

      renderWithRouter();

      const link = screen.queryByRole('link', { name: 'チームを作成' });
      expect(link).toBeNull();
    });

    it('renders with correct link text', () => {
      vi.mocked(useTeamAuth).mockReturnValue({
        isSystemAdminGroup: true,
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'チームを作成' });
      expect(link.textContent).toBe('チームを作成');
    });

    it('links to /teams/create', () => {
      vi.mocked(useTeamAuth).mockReturnValue({
        isSystemAdminGroup: true,
      });

      renderWithRouter();

      const link = screen.getByRole('link', { name: 'チームを作成' });
      expect(link.getAttribute('href')).toBe('/teams/create');
    });
  });
});
