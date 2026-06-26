import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'react-router';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { Tabs } from '@/components/ui/Tabs';
import { APP_TITLE } from '@/constants';
import { useSelectedTeam } from '@/features/team-members/hooks/useSelectedTeam';
import { Loading } from './Loading';
import { TeamMemberCreateButton } from './TeamMemberCreateButton';
import { TeamMemberList } from './TeamMemberList';

type Props = {
  onOpenDeleteModal: (teamUserId: string) => void;
};

export const TeamMembersContent = ({ onOpenDeleteModal }: Props) => {
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
            { label: `${selectedTeamName}（メンバー）` },
          ]}
          className='mb-4'
        />
        <h1 className='flex justify-start text-std-20B-160 lg:text-std-24B-150'>
          {selectedTeamName}
          <span className='sr-only'>（メンバー）</span>
        </h1>

        <Tabs
          title='チーム詳細'
          items={[
            {
              title: 'AIアプリ',
              href: `/teams/${teamId}/apps`,
              selected: false,
            },
            {
              title: 'メンバー',
              href: `/teams/${teamId}/members`,
              selected: true,
            },
          ]}
        />

        <TeamMemberCreateButton />

        <ErrorBoundary fallbackRender={ErrorFallback}>
          <Suspense fallback={<Loading />}>
            <TeamMemberList handleOpenDeleteModal={onOpenDeleteModal} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
};
