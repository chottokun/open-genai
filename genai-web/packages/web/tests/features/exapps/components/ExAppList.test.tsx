import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ExAppList } from '../../../../src/features/exapps/components/ExAppList';
import { COMMON_EXAPPS_TEAM_ID } from '../../../../src/features/exapps/constants';
import { ExAppOptions } from '../../../../src/features/exapps/types';

vi.mock('@/features/exapps/hooks/useGenUApps', () => ({
  useGenUApps: () => ({
    genUApps: [
      {
        label: 'デフォルトアプリ1',
        value: 'default-app-1',
        description: 'デフォルトアプリ1の説明',
      },
    ],
  }),
}));

const mockCommonTeamExists = vi.fn(() => ({ commonTeamExists: true, isLoading: false }));
vi.mock('@/features/exapps/hooks/useFetchCommonTeam', () => ({
  useFetchCommonTeam: () => mockCommonTeamExists(),
}));

const mockExAppOptions: ExAppOptions = {
  [COMMON_EXAPPS_TEAM_ID]: {
    teamName: '共通アプリ',
    exApps: [
      {
        label: '共通アプリ1',
        value: 'common-app-1',
        description: '共通アプリ1の説明',
      },
    ],
  },
  'team-1': {
    teamName: 'チーム1',
    exApps: [
      {
        label: 'チーム1アプリ1',
        value: 'team1-app-1',
        description: 'チーム1アプリ1の説明',
      },
      {
        label: 'チーム1アプリ2',
        value: 'team1-app-2',
        description: 'チーム1アプリ2の説明',
      },
    ],
  },
};

describe('ExAppList', () => {
  it('renders all team sections', () => {
    const { getByRole } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const commonTeamHeading = getByRole('heading', { level: 2, name: /共通アプリ/ });
    const team1Heading = getByRole('heading', { level: 2, name: /チーム1/ });

    expect(commonTeamHeading).toBeDefined();
    expect(team1Heading).toBeDefined();
  });

  it('renders team names with app count', () => {
    const { getByRole } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const commonTeamHeading = getByRole('heading', { level: 2, name: '共通アプリ（2）' });
    const team1Heading = getByRole('heading', { level: 2, name: 'チーム1（2）' });

    expect(commonTeamHeading).toBeDefined();
    expect(team1Heading).toBeDefined();
  });

  it('renders all apps', () => {
    const { getAllByRole } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const lists = getAllByRole('list');
    const totalApps = lists.reduce((count, list) => {
      return count + within(list).getAllByRole('listitem').length;
    }, 0);

    const findInLists = (text: string) => {
      return lists.find((list) => within(list).queryByText(text));
    };

    expect(totalApps).toBe(4);
    expect(findInLists('共通アプリ1')).toBeDefined();
    expect(findInLists('デフォルトアプリ1')).toBeDefined();
    expect(findInLists('チーム1アプリ1')).toBeDefined();
    expect(findInLists('チーム1アプリ2')).toBeDefined();
  });

  it('renders correct href for GenU apps', () => {
    const { getByText } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const defaultAppLink = getByText('デフォルトアプリ1').closest('a');
    expect(defaultAppLink?.getAttribute('href')).toBe('/default-app-1');
  });

  it('renders correct href for non-GenU apps', () => {
    const { getByText } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const commonAppLink = getByText('共通アプリ1').closest('a');
    expect(commonAppLink?.getAttribute('href')).toBe(`/apps/${COMMON_EXAPPS_TEAM_ID}/common-app-1`);

    const team1App1Link = getByText('チーム1アプリ1').closest('a');
    expect(team1App1Link?.getAttribute('href')).toBe('/apps/team-1/team1-app-1');

    const team1App2Link = getByText('チーム1アプリ2').closest('a');
    expect(team1App2Link?.getAttribute('href')).toBe('/apps/team-1/team1-app-2');
  });

  it('renders empty message when no apps are available and common team does not exist', () => {
    mockCommonTeamExists.mockReturnValue({ commonTeamExists: false, isLoading: false });

    const { getByText } = render(
      <MemoryRouter>
        <ExAppList exAppOptions={{}} setTeamId={vi.fn()} setExAppId={vi.fn()} />
      </MemoryRouter>,
    );

    const emptyMessage = getByText('該当するAIアプリはありません。');
    expect(emptyMessage).toBeDefined();
    expect(emptyMessage.tagName).toBe('P');
  });

  it('shows GenU apps under common team when common team exists in DB but has no registered apps', () => {
    mockCommonTeamExists.mockReturnValue({ commonTeamExists: true, isLoading: false });

    const exAppOptionsWithoutCommonTeam: ExAppOptions = {
      'team-1': {
        teamName: 'チーム1',
        exApps: [
          { label: 'チーム1アプリ1', value: 'team1-app-1', description: 'チーム1アプリ1の説明' },
        ],
      },
    };

    const { getByRole, getByText } = render(
      <MemoryRouter>
        <ExAppList
          exAppOptions={exAppOptionsWithoutCommonTeam}
          setTeamId={vi.fn()}
          setExAppId={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(getByRole('heading', { level: 2, name: '共通アプリ（1）' })).toBeDefined();
    expect(getByText('デフォルトアプリ1')).toBeDefined();
  });

  it('does not show GenU apps when common team does not exist in DB', () => {
    mockCommonTeamExists.mockReturnValue({ commonTeamExists: false, isLoading: false });

    const exAppOptionsWithoutCommonTeam: ExAppOptions = {
      'team-1': {
        teamName: 'チーム1',
        exApps: [
          { label: 'チーム1アプリ1', value: 'team1-app-1', description: 'チーム1アプリ1の説明' },
        ],
      },
    };

    const { queryByText } = render(
      <MemoryRouter>
        <ExAppList
          exAppOptions={exAppOptionsWithoutCommonTeam}
          setTeamId={vi.fn()}
          setExAppId={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(queryByText('共通アプリ')).toBeNull();
    expect(queryByText('デフォルトアプリ1')).toBeNull();
  });

  describe('URL query parameter', () => {
    it('initializes search input with q parameter value', () => {
      render(
        <MemoryRouter initialEntries={['/apps?q=チーム1']}>
          <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
        </MemoryRouter>,
      );

      const searchInput = screen.getByRole('textbox', { name: '名前・説明でAIアプリを絞り込む' });
      expect(searchInput).toHaveProperty('value', 'チーム1');
    });

    it('leaves search input empty when q parameter is absent', () => {
      render(
        <MemoryRouter initialEntries={['/apps']}>
          <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
        </MemoryRouter>,
      );

      const searchInput = screen.getByRole('textbox', { name: '名前・説明でAIアプリを絞り込む' });
      expect(searchInput).toHaveProperty('value', '');
    });

    it('filters apps based on q parameter initial value', () => {
      render(
        <MemoryRouter initialEntries={['/apps?q=チーム1アプリ1']}>
          <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
        </MemoryRouter>,
      );

      expect(screen.getAllByText('チーム1アプリ1').length).toBeGreaterThan(0);
      expect(screen.queryByText('チーム1アプリ2')).toBeNull();
      expect(screen.queryByText('共通アプリ1')).toBeNull();
      expect(screen.queryByText('デフォルトアプリ1')).toBeNull();
    });

    it('does not update URL when typing in search input', async () => {
      const SearchParamsDisplay = () => {
        const [searchParams] = useSearchParams();
        return <div data-testid='search-params'>{searchParams.toString()}</div>;
      };

      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/apps']}>
          <ExAppList exAppOptions={mockExAppOptions} setTeamId={vi.fn()} setExAppId={vi.fn()} />
          <SearchParamsDisplay />
        </MemoryRouter>,
      );

      const searchInput = screen.getByRole('textbox', { name: '名前・説明でAIアプリを絞り込む' });
      await user.type(searchInput, 'テスト');

      const paramsDisplay = screen.getByTestId('search-params');
      expect(paramsDisplay.textContent).toBe('');
    });
  });
});
