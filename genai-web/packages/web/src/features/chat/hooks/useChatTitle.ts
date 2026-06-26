import { useParams } from 'react-router';
import { useChatList } from '@/hooks/useChatList';

export const useChatTitle = (chatTitleFromStore?: string) => {
  const { chatId } = useParams();
  const { getChatTitle } = useChatList();

  const pageTitle = chatId ? getChatTitle(chatId) || 'チャット' : 'チャット';
  const title = chatId ? pageTitle : chatTitleFromStore || 'チャット';

  return {
    title,
    pageTitle,
  };
};
