import type { Transcript } from 'genai-web';
import { Ref, useRef } from 'react';
import { ButtonCopy } from '@/components/ui/ButtonCopy';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { useTranscribe } from '@/features/transcribe/hooks/useTranscribe';

type Props = {
  scrollableContainer: Ref<HTMLDivElement | null>;
  transcripts: Transcript[];
  formattedOutput: string;
  speakerMapping: Record<string, string>;
};

export const TranscribeResult = (props: Props) => {
  const { scrollableContainer, transcripts, formattedOutput, speakerMapping } = props;

  const { loading } = useTranscribe();

  const copyTextRef = useRef<HTMLDivElement>(null);
  const isInitial = !loading && formattedOutput === '';
  const showResult = !loading && formattedOutput !== '';

  return (
    <div
      ref={scrollableContainer}
      className='relative mt-5 rounded-8 border border-solid-gray-420 p-4'
    >
      <h2 className='sr-only'>音声認識結果</h2>

      {isInitial && (
        <div className='leading-175 text-solid-gray-536'>音声認識結果がここに表示されます</div>
      )}

      {transcripts.length > 0 && (
        <div ref={copyTextRef}>
          {transcripts.map((transcript, idx) => (
            <div key={idx} className='flex'>
              {transcript.speakerLabel && (
                <div className='min-w-20'>
                  {speakerMapping[transcript.speakerLabel] || transcript.speakerLabel}:
                </div>
              )}
              <div className='grow'>{transcript.transcript}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <ProgressIndicator className='my-0.5' />}

      {showResult && (
        <div className='-mb-2 flex w-full justify-end'>
          <ButtonCopy text={formattedOutput} targetRef={copyTextRef} />
        </div>
      )}
    </div>
  );
};
