import { useTeamName } from './useTeamName';

export const usePageTitle = () => {
  const { teamName } = useTeamName();

  const pageTitle = `チーム名の変更 - ${teamName} | チーム管理`;
  return { pageTitle };
};
