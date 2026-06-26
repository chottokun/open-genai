import { PageTitle } from '@/components/PageTitle';
import { APP_TITLE } from '@/constants';

export const AuthErrorPage = () => {
  const PAGE_TITLE = '認証エラー';

  return (
    <>
      <PageTitle title={`${PAGE_TITLE}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='m-8'>
        <main id='mainContents' className='flex flex-col gap-4'>
          <h1 className='mb-8 text-std-28B-150 lg:text-std-45B-140'>認証エラー</h1>

          <p className='text-std-18N-160'>
            認証に失敗しました。しばらく時間をおいて再度お試しいただき、それでも解消しない場合、管理者にお問い合わせください。
          </p>
        </main>
      </div>
    </>
  );
};
