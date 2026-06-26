import { useParams } from 'react-router';
import { Button } from '@/components/ui/dads/Button';
import { useExAppInvokedHistories } from '../hooks/useExAppInvokedHistories';
import { useExAppInvokeStore } from '../stores/useExAppInvokeStore';

export const ContinueConversationButton = () => {
  const { teamId = '', exAppId = '' } = useParams<{ teamId: string; exAppId: string }>();
  const { exAppResponse } = useExAppInvokeStore();
  const { latestHistory } = useExAppInvokedHistories(teamId, exAppId);

  if (!exAppResponse || latestHistory?.status !== 'COMPLETED') {
    return null;
  }

  return (
    <div className='mt-4 desktop:mt-6'>
      <Button
        onClick={() => {
          localStorage.setItem('history', JSON.stringify(latestHistory));
          location.href = `/apps/${latestHistory.teamId}/${latestHistory.exAppId}`;
        }}
        variant='outline'
        size='lg'
        className='mx-auto flex w-60 items-center justify-center'
      >
        会話を続ける
      </Button>
    </div>
  );
};
