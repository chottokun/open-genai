import { useFetchTeam } from '@/features/team-members/hooks/useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team
    ? `メンバーの追加 - ${team.teamName} | チーム管理`
    : 'メンバーの追加 | チーム管理';

  return {
    pageTitle,
    selectedTeamName,
  };
};
