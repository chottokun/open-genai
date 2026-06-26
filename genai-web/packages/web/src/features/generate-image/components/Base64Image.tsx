import { PiFileX, PiImageLight } from 'react-icons/pi';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';

type CommonProps = {
  alt?: string;
  className?: string;
  error?: boolean;
  errorMessage?: string;
  imageBase64: string | null;
  loading?: boolean;
  width?: number;
  height?: number;
};

type ContentProps = CommonProps & {
  src: string;
};

const Base64ImageContent = (props: ContentProps) => {
  const { alt, error, errorMessage, imageBase64, loading, src, width, height } = props;

  if (error) {
    return (
      <span className='flex w-full flex-col items-center'>
        <PiFileX className={`${errorMessage ? 'size-1/4' : 'size-1/2'} text-error-1`} />
        <span className='text-xs text-error-1'>エラー</span>

        {errorMessage && (
          <span className='w-full text-sm wrap-break-word text-solid-gray-536'>{errorMessage}</span>
        )}
      </span>
    );
  }

  if (!imageBase64 || imageBase64 === '') {
    return loading ? (
      <ProgressIndicator />
    ) : (
      <PiImageLight role='img' aria-label='画像未生成' className='size-3/4 text-solid-gray-420' />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      className='size-full rounded-[calc(3/16*1rem)]'
    />
  );
};

type Props = CommonProps & {
  'aria-label'?: string;
  clickable?: boolean;
  format: string; // image/png等
  onClick?: () => void;
};

const baseStyles = 'flex items-center justify-center rounded-4 border border-solid-gray-420';

export const Base64Image = (props: Props) => {
  const {
    alt,
    'aria-label': ariaLabel,
    clickable,
    format,
    imageBase64,
    onClick,
    className,
    error,
    errorMessage,
    loading,
  } = props;

  const handleClick = () => {
    if (!clickable) {
      return;
    }
    onClick?.();
  };

  const src = imageBase64?.startsWith('data')
    ? imageBase64
    : `data:${format};base64,${imageBase64}`;

  return clickable ? (
    <button
      type='button'
      aria-label={ariaLabel}
      className={`${baseStyles} cursor-pointer outline-offset-1 hover:ring-1 hover:ring-white hover:outline-black hover:outline-solid focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black! focus-visible:outline-solid ${className ?? ''}`}
      onClick={handleClick}
    >
      <Base64ImageContent
        alt={alt}
        error={error}
        src={src}
        imageBase64={imageBase64}
        loading={loading}
        errorMessage={errorMessage}
      />
    </button>
  ) : (
    <div className={`${baseStyles} ${className ?? ''}`}>
      <Base64ImageContent
        alt={alt}
        error={error}
        src={src}
        imageBase64={imageBase64}
        loading={loading}
        errorMessage={errorMessage}
      />
    </div>
  );
};
