import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Team } from 'genai-web';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamList } from '../../../../src/features/teams/components/TeamList';
import { useFetchTeamForJsonDownload } from '../../../../src/features/teams/hooks/useFetchTeamForJsonDownload';
import { useTeams } from '../../../../src/features/teams/hooks/useTeams';
import * as downloadLinkModule from '../../../../src/utils/createDownloadLink';

// Mock dependencies
vi.mock('@/features/teams/hooks/useTeams');
vi.mock('@/features/teams/hooks/useFetchTeamForJsonDownload');
vi.mock('@/utils/createDownloadLink');

const mockLoadMore = vi.fn();
const mockFetchTeamForJsonDownload = vi.fn();
const mockDownload = vi.fn();
const mockHandleOpenDeleteModal = vi.fn();

const mockTeams: Team[] = [
  {
    teamId: 'team-1',
    teamName: 'チーム1',
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-02T00:00:00Z',
  },
  {
    teamId: 'team-2',
    teamName: 'チーム2',
    createdDate: '2024-01-02T00:00:00Z',
    updatedDate: '2024-01-03T00:00:00Z',
  },
];

describe('TeamList', () => {
  const renderWithRouter = (props = {}) => {
    return render(
      <MemoryRouter>
        <TeamList handleOpenDeleteModal={mockHandleOpenDeleteModal} {...props} />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useTeams).mockReturnValue({
      teams: mockTeams,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: mockLoadMore,
    });

    vi.mocked(useFetchTeamForJsonDownload).mockReturnValue({
      fetchTeamForJsonDownload: mockFetchTeamForJsonDownload,
    });

    vi.mocked(downloadLinkModule.download).mockImplementation(mockDownload);
  });

  describe('Rendering', () => {
    it('renders team list heading', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'チーム一覧' });
      expect(heading).toBeDefined();
    });

    it('renders all teams in the list', () => {
      renderWithRouter();

      const team1Link = screen.getByRole('link', { name: 'チーム1' });
      const team2Link = screen.getByRole('link', { name: 'チーム2' });

      expect(team1Link).toBeDefined();
      expect(team2Link).toBeDefined();
    });

    it('renders correct href for team links', () => {
      renderWithRouter();

      const team1Link = screen.getByRole('link', { name: 'チーム1' });
      const team2Link = screen.getByRole('link', { name: 'チーム2' });

      expect(team1Link.getAttribute('href')).toBe('/teams/team-1/apps');
      expect(team2Link.getAttribute('href')).toBe('/teams/team-2/apps');
    });

    it('renders team operation buttons for each team', () => {
      renderWithRouter();

      const operationButtons = screen.getAllByRole('button', { name: 'チームの操作' });
      expect(operationButtons.length).toBe(2);
    });

    it('renders empty message when no teams exist', () => {
      vi.mocked(useTeams).mockReturnValue({
        teams: [],
        hasMore: false,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const emptyMessage = screen.getByText('チームが登録されていません');
      expect(emptyMessage).toBeDefined();
    });

    it('does not render empty message when validating', () => {
      vi.mocked(useTeams).mockReturnValue({
        teams: [],
        hasMore: false,
        isLoading: false,
        isValidating: true,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const emptyMessage = screen.queryByText('チームが登録されていません');
      expect(emptyMessage).toBeNull();
    });

    it('renders load more button when hasMore is true', () => {
      vi.mocked(useTeams).mockReturnValue({
        teams: mockTeams,
        hasMore: true,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const loadMoreButton = screen.getByRole('button', { name: 'さらにチームを読み込む' });
      expect(loadMoreButton).toBeDefined();
    });

    it('does not render load more button when hasMore is false', () => {
      renderWithRouter();

      const loadMoreButton = screen.queryByRole('button', { name: 'さらにチームを読み込む' });
      expect(loadMoreButton).toBeNull();
    });

    it('renders loading state on load more button when validating', () => {
      vi.mocked(useTeams).mockReturnValue({
        teams: mockTeams,
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

  describe('Team Operations Menu', () => {
    it('opens menu when operation button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /チーム名を変更/ });
      const downloadButton = screen.getByRole('menuitem', { name: /JSONダウンロード/ });
      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });

      expect(editLink).toBeDefined();
      expect(downloadButton).toBeDefined();
      expect(deleteButton).toBeDefined();
    });

    it('renders correct edit link href', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /チーム名を変更/ });
      expect(editLink.getAttribute('href')).toBe('/teams/team-1/edit');
    });

    it('calls download with correct parameters when JSON download is clicked', async () => {
      const user = userEvent.setup();
      const mockTeam = { teamId: 'team-1', teamName: 'チーム1' };
      mockFetchTeamForJsonDownload.mockResolvedValue(JSON.stringify(mockTeam));

      // Mock URL.createObjectURL
      const mockUrl = 'blob:http://localhost/123';
      global.URL.createObjectURL = vi.fn(() => mockUrl);

      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const downloadButton = screen.getByRole('menuitem', { name: /JSONダウンロード/ });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockFetchTeamForJsonDownload).toHaveBeenCalledWith('team-1');
        expect(mockDownload).toHaveBeenCalledWith(mockUrl, 'team-1.json');
      });
    });

    it('calls handleOpenDeleteModal with correct team when delete is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });
      await user.click(deleteButton);

      expect(mockHandleOpenDeleteModal).toHaveBeenCalledWith(mockTeams[0]);
    });
  });

  describe('Load More Functionality', () => {
    it('calls loadMore when load more button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useTeams).mockReturnValue({
        teams: mockTeams,
        hasMore: true,
        isLoading: false,
        isValidating: false,
        error: undefined,
        mutate: vi.fn(),
        loadMore: mockLoadMore,
      });

      renderWithRouter();

      const loadMoreButton = screen.getByRole('button', { name: 'さらにチームを読み込む' });
      await user.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for team list', () => {
      renderWithRouter();

      const heading = screen.getByRole('heading', { level: 2, name: 'チーム一覧' });
      expect(heading.getAttribute('id')).toBe('team-list-heading');
    });

    it('has correct aria-label for operation menu button', () => {
      renderWithRouter();

      const operationButtons = screen.getAllByRole('button', { name: 'チームの操作' });
      operationButtons.forEach((button) => {
        const icon = button.querySelector('svg');
        expect(icon?.getAttribute('aria-label')).toBe('チームの操作');
        expect(icon?.getAttribute('role')).toBe('img');
      });
    });

    it('has correct aria-hidden for decorative icons in menu items', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const editLink = screen.getByRole('menuitem', { name: /チーム名を変更/ });
      const downloadButton = screen.getByRole('menuitem', { name: /JSONダウンロード/ });
      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });

      [editLink, downloadButton, deleteButton].forEach((item) => {
        const icon = item.querySelector('svg');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('has correct aria-haspopup for menu trigger buttons', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const operationButton = screen.getAllByRole('button', { name: 'チームの操作' })[0];
      await user.click(operationButton);

      const downloadButton = screen.getByRole('menuitem', { name: /JSONダウンロード/ });
      const deleteButton = screen.getByRole('menuitem', { name: /削除/ });

      expect(downloadButton.getAttribute('aria-haspopup')).toBe('dialog');
      expect(deleteButton.getAttribute('aria-haspopup')).toBe('dialog');
    });
  });
});
