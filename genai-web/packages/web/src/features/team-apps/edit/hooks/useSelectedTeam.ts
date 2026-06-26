import { useFetchTeam } from '@/features/team-apps/hooks/useFetchTeam';
import { useFetchTeamApp } from '@/features/team-apps/hooks/useFetchTeamApp';

export const useSelectedTeam = () => {
  const { team } = useFetchTeam({ suspense: true });
  const { app } = useFetchTeamApp({ suspense: true });

  const selectedTeamName = team?.teamName ?? '';

  const appNameForPageTitle = app ? `（${app.exAppName}）` : '';
  const teamNameForPageTitle = team ? ` - ${team.teamName}` : '';

  const pageTitle = `AIアプリの編集${appNameForPageTitle}${teamNameForPageTitle} | チーム管理`;

  return {
    pageTitle,
    selectedTeamName,
  };
};
