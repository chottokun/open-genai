import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/dads/Button';
import { APP_TITLE } from '@/constants';
import { login } from '@/local/localAuth';

export const SignedOutPage = () => {
  const PAGE_TITLE = 'サインアウトが完了しました';

  return (
    <>
      <PageTitle title={`${PAGE_TITLE}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='m-8'>
        <main id='mainContents' className='flex flex-col gap-4'>
          <h1 className='mb-8 text-std-28B-150 lg:text-std-45B-140'>サインアウトが完了しました</h1>

          <p className='text-std-18N-160'>再度ログインするには以下のボタンを押してください。</p>

          <div>
            <Button size='lg' variant='solid-fill' onClick={() => login()}>
              再ログイン
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};
