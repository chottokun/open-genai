import { useEffect } from 'react';
import { focus } from '@/utils/focus';
import { PageTitle } from './PageTitle';

export const OfflineScreen = () => {
  useEffect(() => {
    focus('offline-title');
  }, []);

  return (
    <>
      <PageTitle title='インターネットに接続されていません' />
      <div className='m-8'>
        <main id='mainContents' className='flex flex-col gap-4'>
          <h1
            tabIndex={-1}
            id='offline-title'
            className='mb-8 text-std-28B-150 focus-visible:rounded-4 focus-visible:bg-yellow-300 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid lg:mt-12 lg:text-std-45B-140'
          >
            インターネットに接続されていません
          </h1>

          <p className='text-std-18N-160'>
            Wi-Fiまたはモバイルデータ通信が有効になっているかご確認ください。
          </p>
          <p className='text-std-18N-160'>接続が回復すると、自動的にページが表示されます。</p>
        </main>
      </div>
    </>
  );
};
