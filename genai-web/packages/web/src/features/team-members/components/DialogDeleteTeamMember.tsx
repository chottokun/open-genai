import { useState } from 'react';
import { useParams } from 'react-router';
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { isApiError } from '@/lib/fetcher';
import { focus } from '@/utils/focus';
import { useDeleteTeamMember } from '../hooks/useDeleteTeamMember';
import { useFetchTeamMember } from '../hooks/useFetchTeamMember';

type Props = {
  isOpen: boolean;
  userId: string;
  onDeleted: () => void;
  onClose: () => void;
};

export const DialogDeleteTeamMember = (props: Props) => {
  const { isOpen, userId, onDeleted, onClose } = props;

  const { teamId } = useParams();
  const { teamMember } = useFetchTeamMember(teamId ?? '', userId);
  const { deleteTeamMember } = useDeleteTeamMember();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!teamMember) {
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await deleteTeamMember(teamMember.teamId, teamMember.userId);
      onDeleted();

      focus('user-list-heading');
    } catch (e) {
      if (isApiError(e)) {
        setError((e.data as { error?: string })?.error ?? '');
      } else {
        setError('システムエラーが発生しました。ページをリロードして再度お試しください。');
      }
      focus('server-error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomDialog isOpen={isOpen} onClose={onClose}>
      <CustomDialogPanel>
        <CustomDialogHeader>メンバーの削除</CustomDialogHeader>
        <CustomDialogBody>
          <p>メンバー「{teamMember?.username}」を削除しますか？</p>

          {error && (
            <section className='my-4'>
              <h3 id='server-error' className='sr-only' tabIndex={-1}>
                システムエラー
              </h3>
              <div
                className={`mx-auto flex w-full flex-col gap-2 rounded-6 bg-red-50 p-4 text-center text-error-1`}
              >
                <p>{error}</p>
              </div>
            </section>
          )}

          <div className='mt-4 flex justify-between gap-2'>
            <Button data-autofocus variant='text' size='md' onClick={onClose}>
              キャンセル
            </Button>
            <LoadingButton
              variant='solid-fill'
              size='md'
              onClick={() => handleDelete()}
              className='flex min-w-32 items-center justify-center bg-error-1!'
              loading={isLoading}
            >
              {isLoading ? '削除中' : '削除'}
            </LoadingButton>
          </div>
        </CustomDialogBody>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
