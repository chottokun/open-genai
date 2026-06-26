import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea';
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SystemContextSaveSchema, systemContextSaveSchema } from '../schema';

type Props = {
  className?: string;
  systemContext: string;
  isOpen: boolean;
  onSave: (title: string, systemContext: string) => void;
  onClose: () => void;
};

export const DialogSaveSystemContext = (props: Props) => {
  const { systemContext, isOpen, onSave, onClose } = props;
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SystemContextSaveSchema>({
    mode: 'onSubmit',
    resolver: zodResolver(systemContextSaveSchema),
  });

  // モーダルダイアログが開いたときに現在のシステムプロンプトを設定
  useEffect(() => {
    if (isOpen) {
      reset({
        title: '',
        systemContext,
      });
    }
  }, [isOpen, systemContext, reset]);

  const onSubmit = handleSubmit((data) => {
    onSave(data.title, data.systemContext);
    reset();
    onClose();
  });

  return (
    <CustomDialog isOpen={isOpen} onClose={onClose}>
      <CustomDialogPanel>
        <CustomDialogHeader>システムプロンプトの保存</CustomDialogHeader>
        <CustomDialogBody>
          <p className='mb-3'>保存することで、プロンプト一覧から選択して使えるようになります</p>
          <form className='flex flex-col gap-3' onSubmit={onSubmit}>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor={`${formId}-prompt-name-input`} size='lg'>
                タイトル<RequirementBadge>※必須</RequirementBadge>
              </Label>
              <Input
                id={`${formId}-prompt-name-input`}
                type='text'
                required
                className='w-full'
                aria-describedby={errors.title ? `${formId}-prompt-name-input-error` : undefined}
                {...register('title')}
              />
              {errors.title && (
                <ErrorText id={`${formId}-prompt-name-input-error`}>
                  ＊{errors.title.message}
                </ErrorText>
              )}
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label htmlFor={`${formId}-prompt-content-input`} size='lg'>
                システムプロンプト<RequirementBadge>※必須</RequirementBadge>
              </Label>
              <AutoResizeTextarea
                id={`${formId}-prompt-content-input`}
                required
                rows={2}
                maxHeight={500}
                aria-describedby={
                  errors.systemContext ? `${formId}-prompt-content-input-error` : undefined
                }
                {...register('systemContext')}
              />
              {errors.systemContext && (
                <ErrorText id={`${formId}-prompt-content-input-error`}>
                  ＊{errors.systemContext.message}
                </ErrorText>
              )}
            </div>

            <div className='mt-4 flex flex-row-reverse justify-between gap-2'>
              <Button type='submit' variant='solid-fill' size='md'>
                保存して閉じる
              </Button>
              <Button variant='text' size='md' onClick={() => onClose()}>
                キャンセル
              </Button>
            </div>
          </form>
        </CustomDialogBody>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
