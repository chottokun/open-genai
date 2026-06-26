import { PageTitle } from '@/components/PageTitle';
import { Divider } from '@/components/ui/dads/Divider';
import { APP_TITLE } from '@/constants';
import { TranscribeForm } from '@/features/transcribe/components/TranscribeForm';
import { TranscribeResult } from '@/features/transcribe/components/TranscribeResult';
import { useTranscribe } from '@/features/transcribe/hooks/useTranscribe';
import { useTranscribeStore } from '@/features/transcribe/stores/useTranscribeStore';
import { useFollow } from '@/hooks/useFollow';
import { useLiveStatusMessage } from '@/hooks/useLiveStatusMessage';
import { LayoutBody } from '@/layout/LayoutBody';
import { TranscribeHeader } from './components/TranscribeHeader';

export const TranscribePage = () => {
  const { transcriptData, loading } = useTranscribe();

  const { speakers } = useTranscribeStore();

  const { scrollableContainer, setFollowing } = useFollow();

  const transcripts = transcriptData?.transcripts ?? [];

  const speakerMapping = Object.fromEntries(
    speakers.split(',').map((speaker, idx) => [`spk_${idx}`, speaker.trim()]),
  );

  const formattedOutput = transcripts
    .map((item) =>
      item.speakerLabel
        ? `${speakerMapping[item.speakerLabel] || item.speakerLabel}: ${item.transcript}`
        : item.transcript,
    )
    .join('\n');

  const { liveStatusMessage } = useLiveStatusMessage({
    active: true,
    loading: loading,
    messages: {
      loading: 'AIが音声認識を実行しています...',
      loadingContinue: 'AIが引き続き音声認識を実行しています...',
      completed: '音声認識が完了しました。音声認識結果をご確認ください。',
    },
  });

  return (
    <LayoutBody>
      <PageTitle title={`音声ファイルから文字起こし${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <TranscribeHeader />
        <Divider className='my-6' />
        <TranscribeForm setFollowing={setFollowing} />

        <Divider className='my-3 lg:my-6' />

        <TranscribeResult
          scrollableContainer={scrollableContainer}
          transcripts={transcripts}
          formattedOutput={formattedOutput}
          speakerMapping={speakerMapping}
        />
      </div>
      <div aria-live='assertive' aria-atomic='true' className='sr-only'>
        {liveStatusMessage}
      </div>
    </LayoutBody>
  );
};
