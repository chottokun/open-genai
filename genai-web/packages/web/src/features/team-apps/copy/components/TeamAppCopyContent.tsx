import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useFetchTeamApp } from '@/features/team-apps/hooks/useFetchTeamApp';
import { useSelectedTeam } from '../hooks/useSelectedTeam';
import { TeamAppCopyForm } from './TeamAppCopyForm';

export const TeamAppCopyContent = () => {
  const PAGE_TITLE = 'AIアプリのコピー';

  const { app } = useFetchTeamApp({ suspense: true });
  const { teamId } = useParams();
  const { pageTitle, selectedTeamName } = useSelectedTeam();

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: `${selectedTeamName}（AIアプリ）`, to: `/teams/${teamId}/apps` },
            { label: 'AIアプリのコピー' },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        {app && <TeamAppCopyForm app={app} />}
      </div>
    </>
  );
};
