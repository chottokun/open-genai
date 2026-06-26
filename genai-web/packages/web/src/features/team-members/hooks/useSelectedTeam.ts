import { useFetchTeam } from './useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team ? `${team.teamName}（メンバー） | チーム管理` : '';

  return {
    pageTitle,
    selectedTeamName,
  };
};
