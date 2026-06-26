import { useFetchTeam } from '@/features/team-members/hooks/useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team
    ? `メンバーの編集 - ${team.teamName} | チーム管理`
    : 'メンバーの編集 | チーム管理';

  return {
    pageTitle,
    selectedTeamName,
  };
};
