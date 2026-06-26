import { useLocation } from 'react-router';
import { getPrompter } from '@/prompts';
import { useChat } from './useChat';

export const usePrompter = () => {
  const { pathname } = useLocation();
  const { getModelId } = useChat(pathname);
  const prompter = getPrompter(getModelId());

  return { prompter };
};
