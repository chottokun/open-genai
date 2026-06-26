import { sleep } from '@/utils/sleep';

export const focus = async (id: string) => {
  await sleep(1);
  const e = document.getElementById(id);
  e?.focus();
};
