import { useId, useRef } from 'react';
import { PiSpinnerGap, PiX } from 'react-icons/pi';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { ButtonIcon } from '../../../components/ui/ButtonIcon';
import { CloseIcon, HamburgerMenuButton } from '../../../components/ui/dads/HamburgerMenuButton';

type Props = {
  className?: string;
  filename: string;
  hasTooltip?: boolean;
  src?: string;
  width?: number;
  height?: number;
  loading?: boolean;
  deleting?: boolean;
  alt?: string;
  size: 'sm' | 'md';
  error?: boolean;
  onDelete?: () => void;
};

export const ZoomUpImage = (props: Props) => {
  const {
    className,
    filename,
    hasTooltip,
    src,
    width,
    height,
    loading,
    deleting,
    alt,
    size,
    error,
    onDelete,
  } = props;
  const zoomImageRef = useRef<HTMLDialogElement>(null);
  const imageId = useId();

  return (
    <div className={className ?? ''}>
      <div className='relative flex'>
        <Tooltip offset={8}>
          <TooltipTrigger asChild>
            <button
              type='button'
              aria-haspopup='dialog'
              aria-controls={`${imageId}-zoom-image`}
              className='cursor-zoom-in focus-visible:rounded-4 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid'
              onClick={() => {
                zoomImageRef.current?.showModal();
              }}
            >
              <img
                className={`
                  rounded-4 border object-cover object-center
                  ${error ? 'border-error-1 outline-1 outline-error-1 text-error-1 font-bold' : 'border-solid-gray-420'}
                  ${size === 'sm' ? 'size-24' : 'size-32'}
                `}
                src={src}
                width={size === 'sm' ? 96 : 128}
                height={size === 'sm' ? 96 : 128}
                alt={!loading ? (alt ?? filename) : undefined}
              />
              <span className='sr-only'>画像を拡大</span>
            </button>
          </TooltipTrigger>
          {hasTooltip && <TooltipContent aria-hidden={true}>{filename}</TooltipContent>}
        </Tooltip>
        {(loading || deleting) && (
          <div className='absolute top-0 flex h-full w-full items-center justify-center rounded-4 bg-solid-gray-800/20'>
            <PiSpinnerGap
              aria-label={deleting ? '解除中' : '読み込み中'}
              className='animate-spin text-4xl text-white'
            />
          </div>
        )}

        {onDelete && !loading && (
          <div className='absolute -top-4 -right-4 m-0.5'>
            <Tooltip>
              <TooltipTrigger asChild>
                <ButtonIcon
                  className={`rounded-full border border-solid-gray-800 bg-white text-sm focus-visible:border-transparent`}
                  onClick={onDelete}
                >
                  <PiX
                    aria-label={deleting ? `解除中 ${filename}` : `解除 ${filename}`}
                    role='img'
                  />
                </ButtonIcon>
              </TooltipTrigger>
              <TooltipContent aria-hidden={true}>解除</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <dialog
        aria-labelledby={`${imageId}-zoom-image-heading`}
        id={`${imageId}-zoom-image`}
        ref={zoomImageRef}
        className='m-auto max-h-[unset] max-w-[unset] overflow-visible rounded-8 border border-transparent bg-white px-6 py-4 shadow-2 backdrop:bg-opacity-gray-300 forced-colors:backdrop:bg-[#000b]'
      >
        <div className='flex items-center justify-end pb-2'>
          <h2 id={`${imageId}-zoom-image-heading`} className='sr-only'>
            {filename}の拡大画像
          </h2>
          <HamburgerMenuButton
            className='p-1'
            data-autofocus
            onClick={() => zoomImageRef.current?.close()}
          >
            <CloseIcon className='flex-none' />
            閉じる
          </HamburgerMenuButton>
        </div>

        <img
          src={src}
          width={width}
          height={height}
          alt={alt ?? filename}
          className='max-h-[80vh] w-auto max-w-[90vw] border border-solid-gray-420'
        />
      </dialog>
    </div>
  );
};
