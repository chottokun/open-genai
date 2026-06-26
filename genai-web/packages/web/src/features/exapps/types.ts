import { ExAppStatus } from 'genai-web';

export type ExAppOptions = {
  [key: string]: {
    teamName: string;
    exApps: { label: string; value: string; description: string; status?: ExAppStatus }[];
  };
};

export type TeamOption = {
  value: string;
  label: string;
};
