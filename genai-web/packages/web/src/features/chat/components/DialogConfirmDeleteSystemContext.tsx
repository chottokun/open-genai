import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';

type Props = {
  isOpen: boolean;
  systemContextTitle: string;
  systemContextId: string;
  isDeleting?: boolean;
  onDelete: (systemContextId: string) => Promise<void>;
  onClose: () => void;
};

export const DialogConfirmDeleteSystemContext = (props: Props) => {
  const { isOpen, systemContextTitle, systemContextId, isDeleting, onDelete, onClose } = props;

  return (
    <CustomDialog isOpen={isOpen} onClose={onClose}>
      <CustomDialogPanel>
        <CustomDialogHeader>プロンプトの削除</CustomDialogHeader>
        <CustomDialogBody>
          <p>
            プロンプト
            <strong className='font-700'>「{systemContextTitle}」</strong>
            を削除しますか？
          </p>

          <div className='relative mt-4 flex justify-between gap-2 pb-2 lg:mt-6'>
            <Button data-autofocus variant='text' size='md' onClick={onClose}>
              キャンセル
            </Button>
            <Button
              variant='solid-fill'
              size='md'
              aria-disabled={isDeleting ? 'true' : undefined}
              onClick={() => {
                onDelete(systemContextId);
              }}
              className='flex items-center justify-center bg-error-1! hover:bg-error-2!'
            >
              {isDeleting ? (
                <>
                  <span className='mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent'></span>
                  削除中
                </>
              ) : (
                <>削除</>
              )}
            </Button>
          </div>
        </CustomDialogBody>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
