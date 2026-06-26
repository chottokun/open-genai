import * as crypto from 'crypto';

export const generateTeamId = () => `team#${crypto.randomUUID()}`;
export const getTeamId = (_teamId: string) => `team#${_teamId}`;
export const getUserId = (_userId: string) => `user#${_userId}`;
export const generateExAppId = () => `exapp#${crypto.randomUUID()}`;
export const getExAppId = (_exAppId: string) => `exapp#${_exAppId}`;
