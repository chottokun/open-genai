import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamUser } from 'genai-web';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamMemberList } from '../../../../src/features/team-members/components/TeamMemberList';
import { useTeamMembers } from '../../../../src/features/team-members/hooks/useTeamMembers';

// Mock dependencies
vi.mock('@/features/team-members/hooks/useTeamMembers');

const mockLoadMore = vi.fn();
const mockHandleOpenDeleteModal = vi.fn();

const mockMembers: TeamUser[] = [
  {
    teamId: 'team-1',
    userId: 'user-1',
    username: 'user1@example.com',
    isAdmin: true,
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-02T00:00:00Z',
  },
  {
    teamId: 'team-1',
    userId: 'user-2',
    username: 'user2@example.com',
    isAdmin: false,
    createdDate: '2024-01-02T00:00:00Z',
    updatedDate: '2024-01-03T00:00:00Z',
  },
];

describe('TeamMemberList', () => {
  const renderWithRouter = (props = {}, teamId = 'team-1') => {
    return render(
      <MemoryRouter initialEntries={[`/teams/${teamId}/members`]}>
        <Routes>
          <Route
            path='/teams/:teamId/members'
            element={
              <TeamMemberList handleOpenDeleteModal={mockHandleOpenDeleteModal} {...props} />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useTeamMembers).mockReturnValue({
      members: mockMembers,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: mockLoadMore,
    });
  });

  describe('Rendering', () => {
    it('renders member list heading', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'メンバー' });
      expect(heading).toBeDefined();
    });

    it('renders all members in the list', () => {
      renderWithRouter();

      const member1 = screen.getByText('user1@example.com');
      const member2 = screen.getByText('user2@example.com');

      expect(member1).toBeDefined();
      expect(member2).toBeDefined();
    });

    it('renders admin badge for admin users', () => {
      renderWithRouter();

      const adminBadge = screen.getByText('チーム管理者');
      expect(adminBadge).toBeDefined();
    });

    it('does not render admin badge for non-admin users', () => {
      renderWithRouter();

      const adminBadges = screen.getAllByText('チーム管理者');
      expect(adminBadges.length).toBe(1); // Only one admin in mock data
    });

    it('renders member operation buttons for each member', () => {
      renderWithRouter();

      const operationButtons = screen.getAllByRole('button', { name: 'メンバーの操作' });
      expect(operationButtons.length).toBe(2);
    });

    it('renders empty message when no members exist', () => {
      vi.mocked(useTeamMembers).mockReturnValue({
        members: [],
        hasMore: false,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const emptyMessage = screen.getByText('メンバーが登録されていません');
      expect(emptyMessage).toBeDefined();
    });

    it('does not render empty message when validating', () => {
      vi.mocked(useTeamMembers).mockReturnValue({
        members: [],
        hasMore: false,
        isLoading: false,
        isValidating: true,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const emptyMessage = screen.queryByText('メンバーが登録されていません');
      expect(emptyMessage).toBeNull();
    });

    it('renders load more button when hasMore is true', () => {
      vi.mocked(useTeamMembers).mockReturnValue({
        members: mockMembers,
        hasMore: true,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const loadMoreButton = screen.getByRole('button', { name: 'さらにメンバーを読み込む' });
      expect(loadMoreButton).toBeDefined();
    });

    it('does not render load more button when hasMore is false', () => {
      renderWithRouter();

      const loadMoreButton = screen.queryByRole('button', { name: 'さらにメンバーを読み込む' });
      expect(loadMoreButton).toBeNull();
    });

    it('renders loading state on load more button when validating', () => {
      vi.mocked(useTeamMembers).mockReturnValue({
        members: mockMembers,
        hasMore: true,
        isLoading: false,
        isValidating: true,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const loadMoreButton = screen.getByRole('button', { name: '読み込み中' });
      expect(loadMoreButton).toBeDefined();
    });
  });

  describe('Member Operations Menu', () => {
    it('opens menu when operation button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'メンバーの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /編集/ });
      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });

      expect(editLink).toBeDefined();
      expect(deleteButton).toBeDefined();
    });

    it('renders correct edit link href', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'メンバーの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /編集/ });
      expect(editLink.getAttribute('href')).toBe('/teams/team-1/members/user-1/edit');
    });

    it('calls handleOpenDeleteModal with correct userId when delete is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'メンバーの操作' })[0];
      await user.click(operationButton);

      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });
      await user.click(deleteButton);

      expect(mockHandleOpenDeleteModal).toHaveBeenCalledWith('user-1');
    });

    it('renders correct edit link for second member', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButtons = screen.getAllByRole('button', { name: 'メンバーの操作' });
      await user.click(operationButtons[1]);

      const editLink = screen.getByRole('menuitem', { name: /編集/ });
      expect(editLink.getAttribute('href')).toBe('/teams/team-1/members/user-2/edit');
    });
  });

  describe('Load More Functionality', () => {
    it('calls loadMore when load more button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useTeamMembers).mockReturnValue({
        members: mockMembers,
        hasMore: true,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const loadMoreButton = screen.getByRole('button', { name: 'さらにメンバーを読み込む' });
      await user.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for member list', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'メンバー' });
      expect(heading.getAttribute('id')).toBe('user-list-heading');
    });

    it('has correct aria-label for operation menu button', () => {
      renderWithRouter();

      const operationButtons = screen.getAllByRole('button', { name: 'メンバーの操作' });
      operationButtons.forEach((button) => {
        const icon = button.querySelector('svg');
        expect(icon?.getAttribute('aria-label')).toBe('メンバーの操作');
        expect(icon?.getAttribute('role')).toBe('img');
      });
    });

    it('has correct aria-hidden for decorative icons in menu items', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'メンバーの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /編集/ });
      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });

      [editLink, deleteButton].forEach((item) => {
        const icon = item.querySelector('svg');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('has correct aria-haspopup for delete button', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'メンバーの操作' })[0];
      await user.click(operationButton);

      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });
      expect(deleteButton.getAttribute('aria-haspopup')).toBe('dialog');
    });
  });

  describe('Member Display', () => {
    it('displays member usernames correctly', () => {
      renderWithRouter();

      const member1Username = screen.getByText('user1@example.com');
      const member2Username = screen.getByText('user2@example.com');

      expect(member1Username).toBeDefined();
      expect(member2Username).toBeDefined();
    });

    it('renders admin badge with correct styling', () => {
      renderWithRouter();

      const adminBadge = screen.getByText('チーム管理者');
      expect(adminBadge.className).toContain('rounded-4');
      expect(adminBadge.className).toContain('bg-solid-gray-50');
      expect(adminBadge.className).toContain('px-2');
      expect(adminBadge.className).toContain('py-1');
    });
  });
});
