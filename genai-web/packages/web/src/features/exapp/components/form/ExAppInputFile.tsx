import { type ChangeEvent, type DragEvent, useEffect, useState } from 'react';
import {
  FieldValues,
  UseFormClearErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormTrigger,
} from 'react-hook-form';
import { Button } from '@/components/ui/dads/Button';
import { Checkbox } from '@/components/ui/dads/Checkbox';
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
  useFileUpload,
} from '@/components/ui/dads/FileUpload';
import { formatSize } from '@/components/ui/dads/FileUpload/utils/formatSize';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SupportText } from '@/components/ui/dads/SupportText';
import { GovAIFormUIFile } from '../../types';
import { convertFileToBase64 } from '../../utils/convertFileToBase64';
import { convertSizeToBytes } from '../../utils/convertSizeToBytes';
import { formatAcceptTypes } from '../../utils/formatAcceptTypes';

type Props = {
  id: string;
  classNames?: string;
  errors?: string;
  uiConfig: GovAIFormUIFile;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  trigger: UseFormTrigger<FieldValues>;
  clearErrors: UseFormClearErrors<FieldValues>;
  /** submit 回数（エラー時のフォーカス制御用） */
  submitCount?: number;
};

export const ExAppInputFile = (props: Props) => {
  const {
    id,
    classNames,
    errors,
    uiConfig,
    register,
    setValue,
    trigger,
    clearErrors,
    submitCount,
  } = props;

  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const inputId = `${id}-input`;
  const supportTextId = `${id}-support-text`;
  const errorMessagesId = `${id}-error-text`;
  const selectedFilesId = `${id}-selected-files`;

  const isMultiple = uiConfig.multiple ?? false;
  // max_file_count が未指定の場合: multiple なら 100、そうでなければ 1（単一ファイル）
  const DEFAULT_MAX_FILE_COUNT = 100;
  const maxFiles = uiConfig.max_file_count ?? (isMultiple ? DEFAULT_MAX_FILE_COUNT : 1);

  // エラーのあるファイル名を追跡
  const [errorFileNames, setErrorFileNames] = useState<Set<string>>(new Set());

  const {
    files,
    totalSize,
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
    maxFiles,
    droppable: true,
    dropAreaExpandable: true,
  });

  // register でバリデーションルールを設定（submit 時にバリデーション実行）
  register(id, {
    required: uiConfig.required ? 'ファイルを選択してください。' : false,
    validate: async (value: File[] | undefined) => {
      const newErrorFileNames = new Set<string>();
      const errorMessages: string[] = [];

      if (!value || value.length === 0) {
        setErrorFileNames(newErrorFileNames);
        return true;
      }

      // ファイル数チェック
      if (value.length > maxFiles) {
        errorMessages.push(`ファイルは${maxFiles}個以下でアップロードしてください。`);
      }

      // ファイル形式チェック
      if (uiConfig.accept) {
        const sizeBeforeCheck = newErrorFileNames.size;
        const acceptPatterns = uiConfig.accept.split(',').map((pattern) => pattern.trim());
        for (const file of value) {
          const isValidFile = acceptPatterns.some((pattern) => {
            if (pattern.includes('/*')) {
              const mainType = pattern.split('/')[0];
              return file.type.startsWith(`${mainType}/`);
            } else if (pattern.startsWith('.')) {
              return file.name.toLowerCase().endsWith(pattern.toLowerCase());
            } else {
              return file.type === pattern;
            }
          });

          if (!isValidFile) {
            newErrorFileNames.add(file.name);
          }
        }

        if (newErrorFileNames.size > sizeBeforeCheck) {
          errorMessages.push(`許可されていないファイル形式です。対応形式: ${uiConfig.accept}`);
        }
      }

      // ファイルサイズチェック（Base64 変換後のサイズ）
      if (uiConfig.max_size) {
        const sizeBeforeCheck = newErrorFileNames.size;
        const maxSizeBytes = convertSizeToBytes(uiConfig.max_size);
        for (const file of value) {
          const base64 = await convertFileToBase64(file);
          if (new Blob([base64]).size > maxSizeBytes) {
            newErrorFileNames.add(file.name);
          }
        }

        if (newErrorFileNames.size > sizeBeforeCheck) {
          errorMessages.push(
            `1ファイルあたりのファイルサイズは${uiConfig.max_size}以下である必要があります。`,
          );
        }
      }

      setErrorFileNames(newErrorFileNames);

      if (errorMessages.length > 0) {
        return errorMessages.join('\n');
      }

      return true;
    },
  });

  // ファイル配列から React Hook Form の値を更新
  const updateFormValue = (fileList: File[]) => {
    setValue(id, fileList.length > 0 ? fileList : undefined);
    trigger(id);
  };

  // ファイル選択時のハンドラ
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    handleInputChangeOriginal(e);
    if (newFiles.length > 0) {
      const allFiles = isMultiple
        ? [...files.filter((f) => f.file).map((f) => f.file!), ...newFiles]
        : newFiles;
      updateFormValue(allFiles);
    }
  };

  // ドロップ時のハンドラ
  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    handleDropOriginal(e);
    if (droppedFiles.length > 0) {
      const allFiles = isMultiple
        ? [...files.filter((f) => f.file).map((f) => f.file!), ...droppedFiles]
        : droppedFiles;
      updateFormValue(allFiles);
    }
  };

  // Viewport ドロップ時のハンドラ
  const handleFileViewportDrop = (e: DragEvent) => {
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    handleViewportDropOriginal(e);
    if (droppedFiles.length > 0) {
      const allFiles = isMultiple
        ? [...files.filter((f) => f.file).map((f) => f.file!), ...droppedFiles]
        : droppedFiles;
      updateFormValue(allFiles);
    }
  };

  // ファイル削除時のハンドラ
  const handleRemoveFile = (fileId: string, index: number) => {
    const removedFile = files.find((f) => f.id === fileId);
    const remainingFiles = files.filter((f) => f.id !== fileId && f.file).map((f) => f.file!);
    removeFileFromUpload(fileId, index);

    // 削除されたファイルがエラーリストにあれば削除
    if (removedFile && errorFileNames.has(removedFile.name)) {
      setErrorFileNames((prev) => {
        const next = new Set(prev);
        next.delete(removedFile.name);
        return next;
      });
    }

    if (remainingFiles.length === 0) {
      setValue(id, undefined);
      clearErrors(id);
      setErrorFileNames(new Set());
    } else {
      updateFormValue(remainingFiles);
    }
  };

  const hasSubmitted = submitCount !== undefined && submitCount > 0;

  // SupportText に表示するテキストを構築
  const buildSupportText = (): string => {
    const lines: string[] = [];

    if (uiConfig.desc) {
      lines.push(uiConfig.desc);
    }

    if (uiConfig.accept) {
      lines.push(formatAcceptTypes(uiConfig.accept));
    }

    // ファイル数・サイズ制限行を構築（同じ行に表示）
    const limitParts: string[] = [];

    if (uiConfig.max_file_count || !isMultiple) {
      limitParts.push(`${maxFiles}ファイルまで選択可能。`);
    }

    if (uiConfig.max_size) {
      const sizeBytes = convertSizeToBytes(uiConfig.max_size).toLocaleString();
      limitParts.push(`1ファイルあたり${uiConfig.max_size}（${sizeBytes}バイト）まで。`);
    }

    if (limitParts.length > 0) {
      lines.push(limitParts.join(''));
    }

    if (uiConfig.max_size) {
      lines.push(
        '※表示されるファイルサイズはBase64エンコード後の値です（元のサイズより約1.3倍大きくなります）',
      );
    }

    return lines.join('\n');
  };

  // submit 時のバリデーションエラーで selectButton にフォーカスを移動
  // submitCount を依存配列に含めることで、同じエラーでも submit ごとに再実行される
  useEffect(() => {
    if (errors && hasSubmitted && selectButtonRef.current) {
      selectButtonRef.current.focus();
    }
  }, [errors, hasSubmitted, selectButtonRef, submitCount]);

  return (
    <div className={`flex flex-col gap-1.5 ${classNames ?? ''}`}>
      <Label id={labelId} htmlFor={inputId} size='lg'>
        {uiConfig.title} {uiConfig.required ? <RequirementBadge>※必須</RequirementBadge> : null}
      </Label>
      <SupportText id={supportTextId} className='whitespace-pre-wrap'>
        {buildSupportText()}
      </SupportText>

      <FileUpload className='mt-2' maxFiles={maxFiles} hasError={!!errors} droppable>
        <FileUploadInput
          id={inputId}
          name={id}
          accept={uiConfig.accept}
          multiple={isMultiple}
          ref={inputRef}
          aria-required={uiConfig.required ? true : undefined}
          onChange={handleFileInputChange}
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
                aria-describedby={
                  [
                    files.length > 0 && selectedFilesId,
                    errors && errorMessagesId,
                    uiConfig.desc && supportTextId,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                ファイルを選択
              </Button>
              <p className='w-0 grow min-w-[12em]'>または、このエリア内にドラッグ＆ドロップ</p>
            </div>
            {files.length > 0 && (
              <p id={selectedFilesId} className='mt-2'>
                {/* Base64変換後のサイズ（約4/3倍）を表示 */}
                選択中：{files.length}個、{formatSize(Math.ceil((totalSize * 4) / 3))}（
                {Math.ceil((totalSize * 4) / 3).toLocaleString()}
                バイト）
              </p>
            )}
            {errors && (
              <ul id={errorMessagesId} className='mt-2 p-0 list-none text-error-2'>
                {errors.split('\n').map((error) => (
                  <li key={error}>＊{error}</li>
                ))}
              </ul>
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
                const hasFileError = errorFileNames.has(file.name);
                return (
                  <FileUploadFileItem key={file.id} data-id={file.id} hasError={hasFileError}>
                    <FileUploadFileMarker />
                    <FileUploadFileInfo>
                      <p>
                        <FileUploadFileName id={`${file.id}-name`}>{file.name}</FileUploadFileName>
                        <FileUploadFileMeta>
                          {/* Base64変換後のサイズ（約4/3倍）を表示 */}
                          <span>{formatSize(Math.ceil((file.size * 4) / 3))}</span>（
                          <span>{Math.ceil((file.size * 4) / 3).toLocaleString()}</span>バイト）
                        </FileUploadFileMeta>
                      </p>
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
  );
};
