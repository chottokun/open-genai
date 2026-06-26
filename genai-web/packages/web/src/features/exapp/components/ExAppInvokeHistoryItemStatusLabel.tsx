import { InvokeExAppHistory } from 'genai-web';
import { ChipLabel } from '@/components/ui/dads/ChipLabel';

type Props = {
  status: InvokeExAppHistory['status'];
};

export const ExAppInvokeHistoryItemStatusLabel = (props: Props) => {
  const { status } = props;
  switch (status) {
    case 'ACCEPTED':
      return (
        <ChipLabel className='border-green-800! bg-green-50 text-green-900'>
          <span className='sr-only'>ステータス：</span>受付済
        </ChipLabel>
      );
    case 'IN_PROGRESS':
      return (
        <ChipLabel className='border-light-blue-800! bg-light-blue-800 text-white'>
          <span className='sr-only'>ステータス：</span>処理中
        </ChipLabel>
      );
    case 'COMPLETED':
      return (
        <ChipLabel className='border-green-800! bg-green-800 text-white'>
          <span className='sr-only'>ステータス：</span>完了
        </ChipLabel>
      );
    case 'ERROR':
      return (
        <ChipLabel className='border-error-2 bg-error-2 text-white'>
          <span className='sr-only'>ステータス：</span>エラー
        </ChipLabel>
      );
    default:
      return;
  }
};
