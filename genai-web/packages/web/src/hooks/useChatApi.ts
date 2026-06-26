import { FindChatByIdResponse, ListChatsResponse, ListMessagesResponse } from 'genai-web';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import {
  createChat,
  createMessages,
  deleteChat,
  predict,
  predictStream,
  predictTitle,
  updateTitle,
} from '@/lib/chatApi';
import { genUApiFetcher } from '@/lib/fetcher';

export const useChatApi = () => {
  return {
    createChat,
    createMessages,
    deleteChat,
    listChats: () => {
      const getKey = (pageIndex: number, previousPageData: ListChatsResponse) => {
        if (previousPageData && !previousPageData.lastEvaluatedKey) {
          return null;
        }

        if (pageIndex === 0) {
          return 'chats';
        }

        return `chats?exclusiveStartKey=${previousPageData.lastEvaluatedKey}`;
      };

      return useSWRInfinite<ListChatsResponse>(getKey, genUApiFetcher, {
        revalidateIfStale: false,
      });
    },
    findChatById: (chatId?: string) => {
      return useSWR<FindChatByIdResponse>(chatId ? `chats/${chatId}` : null, genUApiFetcher);
    },
    listMessages: (chatId?: string) => {
      return useSWR<ListMessagesResponse>(
        chatId ? `chats/${chatId}/messages` : null,
        genUApiFetcher,
      );
    },
    updateTitle,
    predict,
    predictStream,
    predictTitle,
  };
};
