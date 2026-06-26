import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useSelectedTeam } from '../hooks/useSelectedTeam';
import { TeamAppCreateForm } from './TeamAppCreateForm';

export const TeamAppCreateContent = () => {
  const { pageTitle, selectedTeamName } = useSelectedTeam();
  const { teamId } = useParams();
  const PAGE_TITLE = 'AIアプリの作成';

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: `${selectedTeamName}（AIアプリ）`, to: `/teams/${teamId}/apps` },
            { label: 'アプリ追加' },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        <TeamAppCreateForm />
      </div>
    </>
  );
};
