import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useFetchTeamApp } from '../../hooks/useFetchTeamApp';
import { useSelectedTeam } from '../hooks/useSelectedTeam';
import { TeamAppEditForm } from './TeamAppEditForm';

export const TeamAppEditContent = () => {
  const PAGE_TITLE = 'AIアプリの編集';

  const { app } = useFetchTeamApp({ suspense: true });
  const { pageTitle, selectedTeamName } = useSelectedTeam();
  const { teamId } = useParams();

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: `${selectedTeamName}（AIアプリ）`, to: `/teams/${teamId}/apps` },
            { label: app?.exAppName ?? '' },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        {app && <TeamAppEditForm app={app} />}
      </div>
    </>
  );
};
