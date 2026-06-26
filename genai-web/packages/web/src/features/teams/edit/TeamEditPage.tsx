import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { LayoutBody } from '@/layout/LayoutBody';
import { TeamEditContent } from './components/TeamEditContent';

export const TeamEditPage = () => {
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
          <TeamEditContent />
        </Suspense>
      </ErrorBoundary>
    </LayoutBody>
  );
};
