import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useFetchTeamMember } from '../../hooks/useFetchTeamMember';
import { useSelectedTeam } from '../hooks/useSelectedTeam';
import { TeamMemberEditForm } from './TeamMemberEditForm';

export const TeamMemberEditContent = () => {
  const { pageTitle, selectedTeamName } = useSelectedTeam();
  const PAGE_TITLE = `メンバーの編集`;

  const { teamId, userId } = useParams();
  const { teamMember } = useFetchTeamMember(teamId ?? '', userId ?? '', { suspense: true });

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: `${selectedTeamName}（メンバー）`, to: `/teams/${teamId}/members` },
            { label: teamMember?.username ?? '' },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        {teamMember && <TeamMemberEditForm member={teamMember} />}
      </div>
    </>
  );
};
