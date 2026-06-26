import { Suspense, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'react-router';
import { preload } from 'swr';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { LayoutBody } from '@/layout/LayoutBody';
import { teamApiFetcher } from '@/lib/fetcher';
import { TeamAppCopyContent } from './components/TeamAppCopyContent';

export const TeamAppCopyPage = () => {
  const { teamId, appId } = useParams();

  useEffect(() => {
    if (teamId) {
      preload(`/teams/${teamId}`, teamApiFetcher);
    }
    if (teamId && appId) {
      preload(`/teams/${teamId}/exapps/${appId}`, teamApiFetcher);
    }
  }, [teamId, appId]);

  return (
    <LayoutBody>
      <ErrorBoundary fallbackRender={ErrorFallback}>
        <Suspense
          fallback={
            <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
              <ProgressIndicator label='AIアプリ情報を読み込み中...' />
            </div>
          }
        >
          <TeamAppCopyContent />
        </Suspense>
      </ErrorBoundary>
    </LayoutBody>
  );
};
