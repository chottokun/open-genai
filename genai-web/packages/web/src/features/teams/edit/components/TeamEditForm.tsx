import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { isApiError } from '@/lib/fetcher';
import { focus } from '@/utils/focus';
import { useTeamName } from '../hooks/useTeamName';
import { useUpdateTeam } from '../hooks/useUpdateTeam';
import { TeamUpdateSchema, teamUpdateSchema } from '../schema';

export const TeamEditForm = () => {
  const navigate = useNavigate();

  const { teamId } = useParams();
  const { teamName } = useTeamName();
  const { updateTeam, mutateTeams } = useUpdateTeam();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamUpdateSchema>({
    mode: 'onSubmit',
    resolver: zodResolver(teamUpdateSchema),
    values: {
      name: teamName,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      setError('');
      setIsLoading(true);
      await updateTeam(teamId ?? '', {
        teamName: data.name,
      });
      await mutateTeams();
      navigate('/teams');
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
  });

  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-3 my-6'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`team-edit-name-input`} size='lg'>
          チーム名<RequirementBadge>※必須</RequirementBadge>
        </Label>
        <Input
          id={`team-edit-name-input`}
          type='text'
          required
          data-autofocus
          className='w-full'
          aria-describedby={errors.name ? `team-edit-name-error` : undefined}
          {...register('name')}
        />
        {errors.name && <ErrorText id={`team-edit-name-error`}>＊{errors.name.message}</ErrorText>}
      </div>

      {error && (
        <section className='my-4'>
          <h2 id='server-error' className='sr-only' tabIndex={-1}>
            システムエラー
          </h2>
          <div
            className={`mx-auto flex w-full flex-col gap-2 rounded-6 bg-red-50 p-4 text-center text-error-1`}
          >
            <p>{error}</p>
          </div>
        </section>
      )}

      <div className='mt-4 flex justify-center gap-2'>
        <LoadingButton
          type='submit'
          variant='solid-fill'
          size='lg'
          className='w-60'
          loading={isLoading}
        >
          {isLoading ? '変更中' : '変更'}
        </LoadingButton>
      </div>
    </form>
  );
};
