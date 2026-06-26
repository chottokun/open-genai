import {
  PiFile,
  PiFileCsv,
  PiFileHtml,
  PiFileMd,
  PiFilePdf,
  PiFileTxt,
  PiMicrosoftExcelLogo,
  PiMicrosoftWordLogo,
  PiSpinnerGap,
  PiX,
} from 'react-icons/pi';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

type Props = {
  className?: string;
  filename?: string;
  filetype?: string;
  url?: string;
  loading?: boolean;
  deleting?: boolean;
  size: 'sm' | 'md';
  error?: boolean;
  onDelete?: () => void;
};

const getFileTypeIcon = (filetype?: string) => {
  const iconClassName = 'mr-1 inline size-6';

  switch (filetype) {
    case 'pdf':
      return <PiFilePdf aria-hidden={true} className={iconClassName} />;
    case 'csv':
      return <PiFileCsv aria-hidden={true} className={iconClassName} />;
    case 'doc':
    case 'docx':
      return <PiMicrosoftWordLogo aria-hidden={true} className={iconClassName} />;
    case 'xls':
    case 'xlsx':
      return <PiMicrosoftExcelLogo aria-hidden={true} className={iconClassName} />;
    case 'html':
      return <PiFileHtml aria-hidden={true} className={iconClassName} />;
    case 'md':
      return <PiFileMd aria-hidden={true} className={iconClassName} />;
    case 'txt':
      return <PiFileTxt aria-hidden={true} className={iconClassName} />;
    default:
      return <PiFile aria-hidden={true} className={iconClassName} />;
  }
};

export const FileCard = (props: Props) => {
  const { className, filename, filetype, url, loading, deleting, size, error, onDelete } = props;
  return (
    <div className={className ?? ''}>
      <div className='group relative'>
        <div
          className={`
            rounded-4 border bg-white object-cover object-center p-1 text-dns-14N-130 break-all
            ${error ? 'border-error-1 outline-1 outline-error-1 text-error-1 font-bold' : 'border-solid-gray-420'}
            ${size === 'sm' ? 'size-24' : 'size-32'}`}
        >
          {getFileTypeIcon(filetype)}
          <p
            className={`
              [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical]
              ${size === 'sm' ? '[-webkit-line-clamp:3]' : '[-webkit-line-clamp:5]'}
            `}
          >
            {url ? <a href={url}>{filename}</a> : filename}
          </p>
        </div>
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
                  className='rounded-full border border-solid-gray-800 bg-white text-sm focus-visible:border-transparent'
                  onClick={onDelete}
                >
                  <PiX
                    aria-label={deleting ? `解除中 ${filename ?? ''}` : `解除 ${filename ?? ''}`}
                    role='img'
                  />
                </ButtonIcon>
              </TooltipTrigger>
              <TooltipContent aria-hidden={true}>解除</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
