import { zodResolver } from '@hookform/resolvers/zod';
import { type ChangeEvent, type DragEvent, useId } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/dads/Button';
import { Checkbox } from '@/components/ui/dads/Checkbox';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import {
  FileUpload,
  FileUploadDropArea,
  FileUploadFileInfo,
  FileUploadFileItem,
  FileUploadFileList,
  FileUploadFileMarker,
  FileUploadFileMeta,
  FileUploadFileName,
  FileUploadInput,
  FileUploadViewportOverlay,
  FileUploadViewportOverlayMessage,
  fileUploadDefaultMessages,
  useFileUpload,
} from '@/components/ui/dads/FileUpload';
import { formatSize } from '@/components/ui/dads/FileUpload/utils';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SupportText } from '@/components/ui/dads/SupportText';
import { Switch } from '@/components/ui/Switch';
import { useTranscribe } from '@/features/transcribe/hooks/useTranscribe';
import { useTranscribeStore } from '@/features/transcribe/stores/useTranscribeStore';
import { TranscribeFormSchema, transcribeFormSchema } from '../schema';

const AUDIO_ACCEPT = '.mp3,.mp4,.wav,.flac,.ogg,.amr,.webm,.m4a';

const customMessages = {
  ...fileUploadDefaultMessages,
  error: {
    ...fileUploadDefaultMessages.error,
    invalidType:
      '対応していないファイル形式です。mp3, mp4, wav, flac, ogg, amr, webm, m4a ファイルが利用可能です。',
  },
};

type Props = {
  setFollowing: (following: boolean) => void;
};

export const TranscribeForm = (props: Props) => {
  const { setFollowing } = props;

  const { loading, transcribe } = useTranscribe();

  const { speakerLabel, setSpeakerLabel, setMaxSpeakers, setSpeakers } = useTranscribeStore();

  // FileUpload 用の ID 生成
  const formId = useId();
  const labelId = `${formId}-label`;
  const buttonId = `${formId}-button`;
  const inputId = `${formId}-input`;
  const supportTextId = `${formId}-support-text`;
  const errorMessagesId = `${formId}-error-text`;
  const selectedFilesId = `${formId}-selected-files`;

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    clearErrors,
    formState: { errors },
  } = useForm<TranscribeFormSchema>({
    mode: 'onSubmit',
    resolver: zodResolver(transcribeFormSchema),
  });

  const {
    files,
    inputRef,
    selectButtonRef,
    removeFile: removeFileFromUpload,
    handleSelectButtonClick,
    handleInputChange: handleInputChangeOriginal,
    isDragOver,
    isExpandedDropArea,
    showViewportOverlay,
    announcerText,
    announcerAssertiveText,
    handleExpandedDropAreaChange,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop: handleDropOriginal,
    handleViewportDragEnter,
    handleViewportDragOver,
    handleViewportDragLeave,
    handleViewportDrop: handleViewportDropOriginal,
  } = useFileUpload({
    maxFiles: 1,
    accept: AUDIO_ACCEPT,
    droppable: true,
    dropAreaExpandable: true,
    messages: customMessages,
  });

  // ファイル選択時のハンドラ（input onChange）
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleInputChangeOriginal(e);
    if (file) {
      setValue('file', file);
      trigger('file');
    }
  };

  // ドロップ時のハンドラ
  const handleFileDrop = (e: DragEvent) => {
    handleDropOriginal(e);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setValue('file', file);
      trigger('file');
    }
  };

  // Viewport ドロップ時のハンドラ
  const handleFileViewportDrop = (e: React.DragEvent) => {
    handleViewportDropOriginal(e);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setValue('file', file);
      trigger('file');
    }
  };

  // ファイル削除時のハンドラ
  const handleRemoveFile = (fileId: string, index: number) => {
    removeFileFromUpload(fileId, index);
    setValue('file', undefined as unknown as File);
    clearErrors('file');
  };

  const onSubmit = handleSubmit(
    (data) => {
      if (loading) {
        return;
      }

      const newMaxSpeakers = data.speakerNum ? Number(data.speakerNum) : 0;
      const file = data.file;

      setMaxSpeakers(newMaxSpeakers);
      setSpeakers(data.speaker ?? '');
      setFollowing(true);
      transcribe(file, speakerLabel, newMaxSpeakers);
    },
    (formErrors) => {
      // ファイルエラーがある場合は選択ボタンにフォーカス
      if (formErrors.file) {
        selectButtonRef.current?.focus();
      }
    },
  );

  const hasFileItemError = files.some((f) => f.errors && f.errors.length > 0);
  const hasError = !!errors.file || hasFileItemError;

  return (
    <>
      <h2 className='sr-only'>音声認識フォーム</h2>
      <form onSubmit={onSubmit}>
        <div className='my-6 grid grid-cols-1 gap-4 lg:grid-cols-1'>
          <div className='flex flex-col gap-2'>
            <Label id={labelId} htmlFor={inputId} size='lg'>
              音声ファイル
              <RequirementBadge>※必須</RequirementBadge>
            </Label>
            <SupportText id={supportTextId}>
              対応ファイル：MP3/MP4/WAV/FLAC/OGG/AMR/WebM/M4A形式の音声
              <br />
              1ファイルまで選択可能。
            </SupportText>
            <FileUpload className='mt-2' maxFiles={1} hasError={hasError} droppable>
              <FileUploadInput
                id={inputId}
                name='audio-file'
                accept={AUDIO_ACCEPT}
                ref={inputRef}
                onChange={handleFileInputChange}
                aria-required={true}
              />

              <div className='sr-only' aria-live='polite'>
                {announcerText}
              </div>
              <div className='sr-only' aria-live='assertive'>
                {announcerAssertiveText}
              </div>

              <div>
                <FileUploadDropArea
                  isDragOver={isDragOver}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                >
                  <div className='flex flex-wrap items-center gap-y-2 gap-x-4'>
                    <Button
                      id={buttonId}
                      type='button'
                      variant='outline'
                      size='md'
                      className={`
                        shrink-0
                        group-data-[dragover=true]/drop-area:bg-blue-300 group-data-[dragover=true]/drop-area:text-blue-1200 group-data-[dragover=true]/drop-area:underline
                        group-data-[has-error=true]/file-upload:border-error-1
                      `}
                      onClick={handleSelectButtonClick}
                      ref={selectButtonRef}
                      aria-labelledby={`${labelId} ${buttonId}`}
                      aria-describedby={`${selectedFilesId} ${errorMessagesId} ${supportTextId}`}
                    >
                      ファイルを選択
                    </Button>
                    <p className='w-0 grow min-w-[12em]'>
                      または、このエリア内にドラッグ＆ドロップ
                    </p>
                  </div>
                  {files.length > 0 && (
                    <p id={selectedFilesId} className='mt-2'>
                      選択中：{files.length}個、{formatSize(files[0].size)}（
                      {files[0].size.toLocaleString()}バイト）
                    </p>
                  )}
                  {errors.file && (
                    <p id={errorMessagesId} className='mt-2 text-error-2'>
                      ＊{errors.file.message}
                    </p>
                  )}
                  <p className='mt-12 -mb-4 -ml-1'>
                    <Checkbox
                      size='md'
                      checked={isExpandedDropArea}
                      onChange={(e) => handleExpandedDropAreaChange(e.target.checked)}
                    >
                      ドラッグ＆ドロップの範囲をこのブラウザウィンドウ全体に広げる
                    </Checkbox>
                  </p>
                </FileUploadDropArea>

                {files.length === 0 && <p className='mt-4'>ファイルが選択されていません</p>}
                {files.length > 0 && (
                  <FileUploadFileList>
                    {files.map((file, index) => {
                      const hasItemError = file.errors && file.errors.length > 0;
                      return (
                        <FileUploadFileItem key={file.id} data-id={file.id} hasError={hasItemError}>
                          <FileUploadFileMarker />
                          <FileUploadFileInfo>
                            <p>
                              <FileUploadFileName id={`${file.id}-name`}>
                                {file.name}
                              </FileUploadFileName>
                              <FileUploadFileMeta>
                                <span>{formatSize(file.size)}</span>（
                                <span>{file.size.toLocaleString()}</span>バイト）
                              </FileUploadFileMeta>
                            </p>
                            {hasItemError &&
                              file.errors?.map((error) => <p key={error}>＊{error}</p>)}
                          </FileUploadFileInfo>
                          <Button
                            id={`${file.id}-remove`}
                            type='button'
                            variant='text'
                            size='xs'
                            className='-order-1 shrink-0 min-w-12 min-h-[calc(30/16*1rem)] text-oln-16B-100'
                            onClick={() => handleRemoveFile(file.id, index)}
                            aria-labelledby={`${file.id}-remove ${file.id}-name`}
                          >
                            解除
                          </Button>
                        </FileUploadFileItem>
                      );
                    })}
                  </FileUploadFileList>
                )}
              </div>

              {showViewportOverlay && (
                <FileUploadViewportOverlay
                  onDragEnter={handleViewportDragEnter}
                  onDragOver={handleViewportDragOver}
                  onDragLeave={handleViewportDragLeave}
                  onDrop={handleFileViewportDrop}
                >
                  <FileUploadViewportOverlayMessage>
                    <span className='inline-block'>このエリア内にファイルを</span>
                    <span className='inline-block'>ドラッグ＆ドロップ</span>
                  </FileUploadViewportOverlayMessage>
                </FileUploadViewportOverlay>
              )}
            </FileUpload>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-2'>
          <Switch label='話者認識' checked={speakerLabel} onSwitch={setSpeakerLabel} />

          {speakerLabel && (
            <div className='mt-2 mb-3 flex flex-col gap-1.5'>
              <Label size='lg' htmlFor='max-speakers-number'>
                話者の最大数
              </Label>
              <SupportText id='max-speakers-number-support'>
                最大10人まで設定できます（半角数字）
              </SupportText>
              <Input
                blockSize='sm'
                className='my-1 self-start'
                type='number'
                aria-describedby={
                  errors.speakerNum
                    ? 'max-speakers-number-support max-speakers-number-error'
                    : 'max-speakers-number-support'
                }
                id='max-speakers-number'
                min={2}
                max={10}
                {...register('speakerNum', {
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
              />
              {errors.speakerNum && (
                <ErrorText id='max-speakers-number-error'>＊{errors.speakerNum.message}</ErrorText>
              )}
            </div>
          )}
        </div>

        {speakerLabel && (
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='speaker-name-input' size='lg'>
              話し手の名前
            </Label>
            <SupportText id='speaker-name-input-support'>
              名前を1人ずつカンマで区切って入力してください
            </SupportText>
            <Input
              id='speaker-name-input'
              aria-describedby={
                errors.speaker
                  ? 'speaker-name-input-support speaker-name-input-error'
                  : 'speaker-name-input-support'
              }
              {...register('speaker')}
            />
            {errors.speaker && (
              <ErrorText id='speaker-name-input-error'>＊{errors.speaker.message}</ErrorText>
            )}
          </div>
        )}

        <div className='mt-4 flex justify-center'>
          <Button
            type='submit'
            variant='solid-fill'
            size='lg'
            className='w-60'
            aria-disabled={loading}
          >
            {loading ? '実行中...' : '実行'}
          </Button>
        </div>
      </form>
    </>
  );
};
