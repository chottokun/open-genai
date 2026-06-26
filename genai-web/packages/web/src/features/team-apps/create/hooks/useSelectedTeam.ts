import { useFetchTeam } from '@/features/team-apps/hooks/useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team
    ? `AIアプリの作成 - ${team.teamName} | チーム管理`
    : 'AIアプリの作成 | チーム管理';

  return {
    pageTitle,
    selectedTeamName,
  };
};
