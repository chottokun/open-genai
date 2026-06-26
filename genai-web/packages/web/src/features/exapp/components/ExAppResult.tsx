import { Suspense, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Markdown } from '@/components/Markdown';
import { ButtonCopy } from '@/components/ui/ButtonCopy';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { useExAppInvokeStore } from '../stores/useExAppInvokeStore';
import { getFileExtension } from '../utils/getFileExtension';
import { ContinueConversationButton } from './ContinueConversationButton';

type Props = {
  shouldShowConversationHistory: boolean;
};

export const ExAppResult = (props: Props) => {
  const { shouldShowConversationHistory } = props;
  const { exAppResponse, requestLoading, error } = useExAppInvokeStore();
  const copyTextRef = useRef<HTMLDivElement>(null);
  const hasArtifacts = exAppResponse !== null && (exAppResponse.artifacts?.length ?? 0) > 0;
  const isInitial = !requestLoading && !error && !exAppResponse;
  const showResult = !requestLoading && !error && exAppResponse !== null;

  return (
    <>
      <h2 className='sr-only'>AIアプリの出力</h2>
      <div
        className={`relative mt-5 rounded-8 border p-4 ${error ? 'border-error-2' : 'border-solid-gray-420'}`}
      >
        {isInitial && (
          <div className='leading-175 text-solid-gray-536'>
            AIアプリのレスポンスは、ここに表示されます
          </div>
        )}

        {error && <p className='text-error-2'>{error}</p>}

        <div ref={copyTextRef}>
          <Markdown>{exAppResponse?.outputs ?? ''}</Markdown>
        </div>

        {hasArtifacts && (
          <div className='mt-4 space-y-4'>
            {exAppResponse?.artifacts?.map((artifact, index) => {
              if (!artifact.content) {
                return null;
              }

              return (
                <img
                  className='my-4 h-auto w-fit max-w-sm object-cover'
                  src={`data:image/${getFileExtension(artifact.display_name)};base64,${artifact.content}`}
                  alt={artifact.display_name}
                  key={`${artifact.display_name}-${index}`}
                />
              );
            })}
          </div>
        )}

        {requestLoading && <ProgressIndicator className='my-0.5' />}

        {showResult && (
          <div className='-mb-2 flex w-full justify-end'>
            <ButtonCopy text={exAppResponse?.outputs ?? ''} targetRef={copyTextRef} />
          </div>
        )}
      </div>

      {shouldShowConversationHistory && (
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <Suspense>
            <ContinueConversationButton />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
};
