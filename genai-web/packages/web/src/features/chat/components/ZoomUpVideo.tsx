import { useId, useRef } from 'react';
import { PiPlayFill, PiSpinnerGap, PiX } from 'react-icons/pi';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { ButtonIcon } from '../../../components/ui/ButtonIcon';
import { CloseIcon, HamburgerMenuButton } from '../../../components/ui/dads/HamburgerMenuButton';

type Props = {
  className?: string;
  filename: string;
  hasTooltip?: boolean;
  src?: string;
  loading?: boolean;
  deleting?: boolean;
  size: 'sm' | 'md';
  error?: boolean;
  onDelete?: () => void;
};

export const ZoomUpVideo = (props: Props) => {
  const { className, src, filename, hasTooltip, loading, deleting, size, error, onDelete } = props;
  const zoomVideoRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoId = useId();

  return (
    <div className={className ?? ''}>
      <div className='relative flex'>
        <Tooltip offset={8}>
          <TooltipTrigger asChild>
            <button
              type='button'
              aria-haspopup='dialog'
              aria-controls={`${videoId}-zoom-video`}
              className='group relative cursor-pointer focus-visible:rounded-4 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid'
              onClick={() => {
                zoomVideoRef.current?.showModal();
              }}
            >
              <video
                className={`
                  rounded-4 border object-cover object-center
                  ${error ? 'border-error-1 outline-1 outline-error-1 text-error-1 font-bold' : 'border-solid-gray-420'}
                  ${size === 'sm' ? 'size-24' : 'size-32'}
                `}
                src={src}
                onClick={() => {
                  zoomVideoRef.current?.showModal();
                }}
              />
              <span
                className={`absolute top-1/2 left-1/2 inline-flex size-11 -translate-1/2 items-center justify-center rounded-full border border-solid-gray-800 bg-white text-base outline outline-white group-hover:border-2 group-hover:bg-solid-gray-50`}
              >
                <PiPlayFill aria-label='動画をプレビュー' role='img' />
              </span>
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
        aria-labelledby={`${videoId}-zoom-video-heading`}
        id={`${videoId}-zoom-video`}
        ref={zoomVideoRef}
        className='m-auto max-h-[unset] max-w-[unset] overflow-visible rounded-8 border border-transparent bg-white px-6 py-4 shadow-2 backdrop:bg-opacity-gray-300 forced-colors:backdrop:bg-[#000b]'
        onClose={() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
      >
        <div className='flex items-center justify-end pb-2'>
          <h2 id={`${videoId}-zoom-video-heading`} className='sr-only'>
            {filename}のプレビュー
          </h2>
          <HamburgerMenuButton
            className='p-1'
            data-autofocus
            onClick={() => zoomVideoRef.current?.close()}
          >
            <CloseIcon className='flex-none' />
            閉じる
          </HamburgerMenuButton>
        </div>

        <video ref={videoRef} src={src} controls className='max-h-[80vh] max-w-[90vw]' />
      </dialog>
    </div>
  );
};
