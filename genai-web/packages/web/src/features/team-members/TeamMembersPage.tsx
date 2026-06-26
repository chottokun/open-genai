import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { DialogDeleteTeamMember } from '@/features/team-members/components/DialogDeleteTeamMember';
import { LayoutBody } from '@/layout/LayoutBody';
import { TeamMembersContent } from './components/TeamMembersContent';

export const TeamMembersPage = () => {
  const [showDialogDeleteTeamUser, setShowDialogDeleteTeamUser] = useState(false);
  const [selectedTeamUserId, setSelectedTeamUserId] = useState('');

  const reset = () => {
    setSelectedTeamUserId('');
    setShowDialogDeleteTeamUser(false);
  };

  return (
    <LayoutBody>
      <ErrorBoundary fallbackRender={ErrorFallback}>
        <Suspense
          fallback={
            <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
              <ProgressIndicator label='チームを読み込み中...' />
            </div>
          }
        >
          <TeamMembersContent
            onOpenDeleteModal={(teamUserId: string) => {
              setSelectedTeamUserId(teamUserId);
              setShowDialogDeleteTeamUser(true);
            }}
          />
        </Suspense>
      </ErrorBoundary>

      <DialogDeleteTeamMember
        key={selectedTeamUserId}
        isOpen={showDialogDeleteTeamUser}
        userId={selectedTeamUserId}
        onDeleted={() => reset()}
        onClose={() => reset()}
      />
    </LayoutBody>
  );
};
