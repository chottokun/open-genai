import { ExAppStatus } from 'genai-web';
import { ChipLabel } from '@/components/ui/dads/ChipLabel';

const statusStyle: { [key in ExAppStatus]: string } = {
  draft: 'border-solid-gray-700! bg-solid-gray-50 text-solid-gray-800',
  published: 'border-green-800! bg-green-50 text-green-900',
};

type Props = {
  status: ExAppStatus;
};

export const ExAppStatusChipLabel = (props: Props) => {
  const { status } = props;

  return (
    <ChipLabel className={`text-dns-14N-130 ${statusStyle[status]}`}>
      <span className='sr-only'>ステータス：</span>
      {status === 'published' ? '公開中' : '下書き'}
    </ChipLabel>
  );
};
