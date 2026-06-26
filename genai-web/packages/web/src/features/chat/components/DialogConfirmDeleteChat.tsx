import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { decomposeId } from '@/utils/decomposeId';

type Props = {
  className?: string;
  isOpen: boolean;
  chatId: string;
  isDeleting?: boolean;
  onDelete: (chatId: string) => void;
  onClose: () => void;
};

export const DialogConfirmDeleteChat = (props: Props) => {
  const { chatId, isDeleting, onDelete, onClose } = props;
  return (
    <CustomDialog {...props}>
      <CustomDialogPanel>
        <CustomDialogHeader>チャットの削除</CustomDialogHeader>
        <CustomDialogBody>
          <p>このチャットを削除しますか？</p>

          <div className='relative mt-4 flex justify-between gap-2 pb-2 lg:mt-6'>
            <Button data-autofocus variant='text' size='md' onClick={onClose}>
              キャンセル
            </Button>
            <LoadingButton
              variant='solid-fill'
              size='md'
              onClick={() => {
                onDelete(decomposeId(chatId ?? '') ?? '');
              }}
              className='flex min-w-32 items-center justify-center bg-error-1!'
              loading={isDeleting}
            >
              {isDeleting ? '削除中' : '削除'}
            </LoadingButton>
          </div>
        </CustomDialogBody>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
