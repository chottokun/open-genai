import { LoadingCircleIcon } from '@/components/ui/icons/LoadingCircleIcon';

export type ProgressIndicatorProps = {
  className?: string;
  label?: string;
  isLarge?: boolean;
};

export const ProgressIndicator = (props: ProgressIndicatorProps) => {
  const { className, label, isLarge } = props;

  return (
    <div
      className={`flex items-center ${isLarge ? 'flex-col gap-3' : 'flex-row gap-2'} ${className ?? ''}`}
    >
      <LoadingCircleIcon
        className='flex-none animate-spin'
        isLarge={isLarge}
        role='img'
        aria-label={!label ? '読み込み中' : undefined}
        aria-hidden={label ? true : undefined}
      />
      {label && <p>{label}</p>}
    </div>
  );
};
