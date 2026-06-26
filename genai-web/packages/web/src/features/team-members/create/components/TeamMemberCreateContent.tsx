import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useSelectedTeam } from '../hooks/useSelectedTeam';
import { TeamMemberCreateForm } from './TeamMemberCreateForm';

export const TeamMemberCreateContent = () => {
  const { pageTitle, selectedTeamName } = useSelectedTeam();
  const { teamId } = useParams();
  const PAGE_TITLE = `メンバーの追加`;

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: `${selectedTeamName}（メンバー）`, to: `/teams/${teamId}/members` },
            { label: 'メンバー追加' },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        <TeamMemberCreateForm />
      </div>
    </>
  );
};
