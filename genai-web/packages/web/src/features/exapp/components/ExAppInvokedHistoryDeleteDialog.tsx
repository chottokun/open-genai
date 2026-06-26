import { InvokeExAppHistory } from 'genai-web';
import { useState } from 'react';
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { formatDateTime } from '@/utils/formatDateTime';
import { useDeleteExAppInvokeHistory } from '../hooks/useDeleteExAppInvokeHistory';

type Props = {
  history: InvokeExAppHistory;
  isOpen: boolean;
  setIsOpen(isOpen: boolean): void;
  onDeleted: () => void;
};

export const ExAppInvokedHistoryDeleteDialog = (props: Props) => {
  const { history, isOpen, setIsOpen, onDeleted } = props;

  const { deleteHistory } = useDeleteExAppInvokeHistory();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <CustomDialog isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <CustomDialogPanel>
        <CustomDialogHeader>履歴の削除</CustomDialogHeader>
        <CustomDialogBody>
          <p>
            実行日時「
            <time dateTime={new Date(Number(history.createdDate)).toISOString()}>
              {formatDateTime(history.createdDate)}
            </time>
            」の履歴を削除しますか？
          </p>

          <div className='relative mt-4 flex justify-between gap-2 pb-2 lg:mt-6'>
            <Button data-autofocus variant='text' size='md' onClick={() => setIsOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant='solid-fill'
              size='md'
              aria-disabled={isDeleting ? 'true' : undefined}
              onClick={async () => {
                setIsDeleting(true);
                await deleteHistory(history);
                setIsDeleting(false);
                onDeleted();
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
