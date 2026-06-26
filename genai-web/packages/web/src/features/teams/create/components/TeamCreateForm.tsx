import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { RequirementBadge } from '@/components/ui/dads/RequirementBadge';
import { SupportText } from '@/components/ui/dads/SupportText';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { isApiError } from '@/lib/fetcher';
import { focus } from '@/utils/focus';
import { useCreateTeam } from '../hooks/useCreateTeam';
import { TeamCreateSchema, teamCreateSchema } from '../schema';

export const TeamCreateForm = () => {
  const navigate = useNavigate();

  const { createTeam, mutateTeams } = useCreateTeam();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamCreateSchema>({
    mode: 'onSubmit',
    resolver: zodResolver(teamCreateSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      setError('');
      setIsLoading(true);
      const newTeam = await createTeam({
        teamName: data.name,
        teamAdminEmail: data.email,
      });
      await mutateTeams();
      navigate(`/teams/${newTeam.teamId}/apps`);
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
        <Label htmlFor={`team-name-input`} size='lg'>
          チーム名<RequirementBadge>※必須</RequirementBadge>
        </Label>
        <Input
          id={`team-name-input`}
          type='text'
          required
          data-autofocus
          className='w-full'
          aria-describedby={errors.name ? 'team-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && <ErrorText id={`team-name-error`}>＊{errors.name.message}</ErrorText>}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`team-admin-email-input`} size='lg'>
          チーム管理者のメールアドレス
          <RequirementBadge>※必須</RequirementBadge>
        </Label>
        <SupportText id={`team-admin-email-input-support`}>
          チーム管理者として登録するユーザーのメールアドレスを入力してください
        </SupportText>
        <Input
          id={`team-admin-email-input`}
          type='email'
          required
          className='w-full'
          aria-describedby={
            errors.email
              ? 'team-admin-email-input-support team-email-error'
              : 'team-admin-email-input-support'
          }
          {...register('email')}
        />
        {errors.email && <ErrorText id={`team-email-error`}>＊{errors.email.message}</ErrorText>}
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
          {isLoading ? '作成中' : '作成'}
        </LoadingButton>
      </div>
    </form>
  );
};
