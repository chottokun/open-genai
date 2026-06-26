import { useChatApi } from '@/hooks/useChatApi';

const DISPLAY_COUNT = 5;

export const useChatHistorySidebar = () => {
  const { listChats } = useChatApi();
  const { data, isLoading } = listChats();

  const allChats = data?.flatMap((page) => page.data) ?? [];
  const displayedChats = allChats.slice(0, DISPLAY_COUNT);

  return { displayedChats, isLoading };
};
