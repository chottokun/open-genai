import { useFetchTeam } from './useFetchTeam';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const pageTitle = team ? `${team.teamName}（AIアプリ） | チーム管理` : '';

  return {
    pageTitle,
    selectedTeamName,
  };
};
