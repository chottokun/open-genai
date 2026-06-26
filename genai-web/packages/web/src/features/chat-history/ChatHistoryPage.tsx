import { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { Input } from '@/components/ui/dads/Input';
import { Label } from '@/components/ui/dads/Label';
import { SearchIcon } from '@/components/ui/icons/SearchIcon';
import { APP_TITLE } from '@/constants';
import { ChatList } from '@/features/chat-history/components/ChatList';
import { LayoutBody } from '@/layout/LayoutBody';

export const ChatHistoryPage = () => {
  const PAGE_TITLE = '利用履歴';
  const [searchQuery, setSearchQuery] = useState('');

  const searchWords = searchQuery
    .split(' ')
    .flatMap((q) => q.split('　'))
    .filter((q) => q !== '');

  return (
    <LayoutBody>
      <PageTitle title={`${PAGE_TITLE}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[{ label: 'ホーム', to: '/' }, { label: PAGE_TITLE }]}
          className='mb-4'
        />
        <h1 className='mb-6 flex justify-start text-std-20B-160 lg:text-std-24B-150'>
          {PAGE_TITLE}
        </h1>
        <p className='mb-4 lg:mb-6'>
          このページに表示されない履歴は、利用した各AIアプリのページ下部で確認できます。
        </p>
        <div className='flex flex-col gap-3'>
          <search className='relative mb-2 flex w-full flex-col gap-1.5'>
            <Label htmlFor='search-chat-input' size='md'>
              件名で履歴を絞り込む
            </Label>
            <div className='relative'>
              <Input
                className='w-full pl-10'
                id='search-chat-input'
                type='text'
                blockSize='md'
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value ?? '');
                }}
              />
              <SearchIcon
                aria-hidden={true}
                className='pointer-events-none absolute top-3.5 left-3 size-5'
              />
            </div>
          </search>
          <div>
            <h2 id='chat-history-list' className='sr-only' tabIndex={-1}>
              利用履歴一覧
            </h2>
            <ChatList searchWords={searchWords} />
          </div>
        </div>
      </div>
    </LayoutBody>
  );
};
