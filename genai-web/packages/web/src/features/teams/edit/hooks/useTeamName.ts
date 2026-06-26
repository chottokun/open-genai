import { useFetchTeam } from './useFetchTeam';

export const useTeamName = () => {
  const { team } = useFetchTeam();

  return {
    teamName: team?.teamName ?? '',
  };
};
