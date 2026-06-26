import { useEffect } from 'react';
import { useAccessibilityAnnouncer } from '@/hooks/useAccessibilityAnnouncer';
import { useChatList } from '@/hooks/useChatList';
import { decomposeId } from '@/utils/decomposeId';
import { ChatListItem } from './ChatListItem';

type Props = {
  className?: string;
  searchWords: string[];
};

export const ChatList = (props: Props) => {
  const { chats, loading, updateChatTitle, canLoadMore, loadMore } = useChatList();
  const { announceMessage, announce, clearAnnounce } = useAccessibilityAnnouncer();

  const searchedChats =
    props.searchWords.length === 0
      ? chats
      : // OR 検索にしています
        chats.filter((c) => {
          return props.searchWords.some((w) => c.title.toLowerCase().includes(w.toLowerCase()));
        });

  const searchedChatsCount = searchedChats.length;

  useEffect(() => {
    if (loading) return; // ローディング中は読み上げしない

    if (props.searchWords.length === 0) {
      clearAnnounce();
      return;
    }

    const searchTerm = props.searchWords.join(' ');

    if (searchedChatsCount === 0) {
      announce(`「${searchTerm}」に該当する履歴が見つかりません`);
    } else {
      announce(`「${searchTerm}」で${searchedChatsCount}件の履歴が絞り込まれました`);
    }
  }, [props.searchWords, searchedChatsCount, loading, announce, clearAnnounce]);

  return (
    <>
      {!loading && searchedChats.length === 0 && (
        <p className='text-std-16N-170'>
          {props.searchWords.length !== 0 ? (
            <>
              該当する履歴が見つかりません。
              <br />
              もし「さらに読み込む」が表示されている場合は、過去の履歴を読み込んで再度お試しください。
            </>
          ) : (
            <>利用履歴はありません。</>
          )}
        </p>
      )}
      <ul className={`${props.className ?? ''} flex flex-col py-1 pr-1`}>
        {searchedChats.map((chat) => {
          const _chatId = decomposeId(chat.chatId);
          return (
            <li key={_chatId} className='border-b border-b-solid-gray-420'>
              <ChatListItem
                chat={chat}
                onUpdateTitle={updateChatTitle}
                highlightWords={props.searchWords}
              />
            </li>
          );
        })}
        {canLoadMore && !loading && (
          <li className='my-1 flex w-full justify-center'>
            <button
              type='button'
              className='rounded-4 p-4 text-dns-16B-130 underline underline-offset-[calc(3/16*1rem)] hover:decoration-[calc(3/16*1rem)] focus-visible:bg-yellow-300 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-0 focus-visible:outline-black focus-visible:outline-solid focus-visible:ring-inset'
              onClick={() => {
                loadMore();
              }}
            >
              さらに読み込む
            </button>
          </li>
        )}
        {loading &&
          new Array(10)
            .fill('')
            .map((_, idx) => (
              <li key={idx} className='my-1 h-6 w-full animate-pulse rounded-sm bg-blue-50' />
            ))}
      </ul>
      <div role='status' className='sr-only'>
        {announceMessage}
      </div>
    </>
  );
};
