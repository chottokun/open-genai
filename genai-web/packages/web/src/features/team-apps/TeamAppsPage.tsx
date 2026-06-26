import type { ExApp } from 'genai-web';
import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { DialogDeleteTeamApp } from '@/features/team-apps/components/DialogDeleteTeamApp';
import { LayoutBody } from '@/layout/LayoutBody';
import { TeamAppsContent } from './components/TeamAppsContent';

export const TeamAppsPage = () => {
  const [showDialogDeleteExApp, setShowDialogDeleteExApp] = useState(false);
  const [selectedTeamApp, setSelectedTeamApp] = useState<ExApp | undefined>(undefined);

  const reset = () => {
    setSelectedTeamApp(undefined);
    setShowDialogDeleteExApp(false);
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
          <TeamAppsContent
            onOpenDeleteModal={(app: ExApp) => {
              setSelectedTeamApp(app);
              setShowDialogDeleteExApp(true);
            }}
          />
        </Suspense>
      </ErrorBoundary>

      <DialogDeleteTeamApp
        key={selectedTeamApp?.exAppId}
        isOpen={showDialogDeleteExApp}
        app={selectedTeamApp}
        onDeleted={() => reset()}
        onClose={() => reset()}
      />
    </LayoutBody>
  );
};
