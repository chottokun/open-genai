import { linkStyle } from '@/components/ui/dads/Link';
import { InfoIcon } from '@/components/ui/icons/InfoIcon';

type ChatNotificationDialogButtonProps = {
  className?: string;
  onClick: () => void;
};

export const ChatNotificationDialogButton = (props: ChatNotificationDialogButtonProps) => {
  const { className, onClick } = props;
  return (
    <button
      type='button'
      className={`inline-flex gap-1 items-start cursor-pointer ${linkStyle} ${className ?? ''}`}
      onClick={onClick}
      aria-haspopup='dialog'
    >
      <InfoIcon aria-hidden={true} className='shrink-0 mt-[calc(3/16*1rem)]' />
      生成AI利用時の注意事項
    </button>
  );
};
