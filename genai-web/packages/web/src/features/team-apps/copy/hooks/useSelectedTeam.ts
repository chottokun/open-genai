import { useFetchTeam } from '@/features/team-apps/hooks/useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team
    ? `AIアプリのコピー - ${team.teamName} | チーム管理`
    : 'AIアプリのコピー | チーム管理';

  return {
    pageTitle,
    selectedTeamName,
  };
};
