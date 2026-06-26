import { Team } from 'genai-web';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { APP_TITLE } from '@/constants';
import { DialogDeleteTeam } from '@/features/teams/components/DialogDeleteTeam';
import { TeamCreateButton } from '@/features/teams/components/TeamCreateButton';
import { TeamList } from '@/features/teams/components/TeamList';
import { LayoutBody } from '@/layout/LayoutBody';
import { Loading } from './components/Loading';

export const TeamsPage = () => {
  const [showDialogConfirmDelete, setShowDialogConfirmDelete] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | undefined>(undefined);

  const handleOpenDeleteModal = (team: Team) => {
    setSelectedTeam(team);
    setShowDialogConfirmDelete(true);
  };

  const handleCloseDeleteModal = () => {
    setSelectedTeam(undefined);
    setShowDialogConfirmDelete(false);
  };

  return (
    <LayoutBody>
      <PageTitle title={`チーム管理${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[{ label: 'ホーム', to: '/' }, { label: 'チーム管理' }]}
          className='mb-4'
        />
        <h1 className='mb-6 flex justify-start text-std-20B-160 lg:text-std-24B-150'>チーム管理</h1>

        <TeamCreateButton />

        <ErrorBoundary fallbackRender={ErrorFallback}>
          <Suspense fallback={<Loading />}>
            <TeamList handleOpenDeleteModal={handleOpenDeleteModal} />
          </Suspense>
        </ErrorBoundary>
      </div>

      <DialogDeleteTeam
        key={selectedTeam?.teamId}
        isOpen={showDialogConfirmDelete}
        team={selectedTeam}
        onDeleted={() => {
          handleCloseDeleteModal();
        }}
        onClose={() => handleCloseDeleteModal()}
      />
    </LayoutBody>
  );
};
