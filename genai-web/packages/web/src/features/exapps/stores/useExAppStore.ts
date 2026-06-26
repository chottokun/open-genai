import type { ListExAppsResponse } from 'genai-web';
import { createWithEqualityFn as create } from 'zustand/traditional';
import type { ExAppOptions, TeamOption } from '../types';

type ExAppState = {
  exApps: ListExAppsResponse;
  teamId: string;
  exAppId: string;
  teamOptions: TeamOption[];
  exAppOptions: ExAppOptions;
};

type ExAppActions = {
  setExApps: (exApps: ListExAppsResponse) => void;
  setTeamId: (teamId: string) => void;
  setExAppId: (exAppId: string) => void;
  setTeamOptions: (teamOptions: TeamOption[]) => void;
  setExAppOptions: (exAppOptions: ExAppOptions) => void;
};

type ExAppStore = ExAppState & ExAppActions;

const initialState: ExAppState = {
  exApps: [],
  teamId: '',
  exAppId: '',
  teamOptions: [],
  exAppOptions: {},
};

export const useExAppStore = create<ExAppStore>((set) => ({
  ...initialState,
  setExApps: (exApps) => set({ exApps }),
  setTeamId: (teamId) =>
    set((state) => ({
      teamId,
      exAppId: state.exAppOptions[teamId]?.exApps[0]?.value ?? '',
    })),
  setExAppId: (exAppId) => set({ exAppId }),
  setTeamOptions: (teamOptions) => set({ teamOptions }),
  setExAppOptions: (exAppOptions) => set({ exAppOptions }),
}));
