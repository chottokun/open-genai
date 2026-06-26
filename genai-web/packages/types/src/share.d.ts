import { PrimaryKey } from './base';

export type UserIdAndChatId = PrimaryKey & {
  userId: string;
  chatId: string;
};
