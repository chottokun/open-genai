import { createWithEqualityFn as create } from 'zustand/traditional';

type TranscribeState = {
  speakerLabel: boolean;
  maxSpeakers: number;
  speakers: string;
  showModal: boolean;
  loading: boolean;
  file: File | null;
  jobName: string | null;
  status: string;
};

type TranscribeActions = {
  setSpeakerLabel: (speakerLabel: boolean) => void;
  setMaxSpeakers: (maxSpeakers: number) => void;
  setSpeakers: (speakers: string) => void;
  setShowModal: (showModal: boolean) => void;
  setLoading: (loading: boolean) => void;
  setFile: (file: File) => void;
  setJobName: (jobName: string | null) => void;
  setStatus: (status: string) => void;
  clear: () => void;
};

type TranscribeStore = TranscribeState & TranscribeActions;

const initialState: TranscribeState = {
  speakerLabel: false,
  maxSpeakers: 2,
  speakers: '',
  showModal: false,
  loading: false,
  file: null,
  jobName: null,
  status: '',
};

export const useTranscribeStore = create<TranscribeStore>((set) => ({
  ...initialState,
  setSpeakerLabel: (speakerLabel) => set({ speakerLabel }),
  setMaxSpeakers: (maxSpeakers) => set({ maxSpeakers }),
  setSpeakers: (speakers) => set({ speakers }),
  setShowModal: (showModal) => set({ showModal }),
  setLoading: (loading) => set({ loading }),
  setFile: (file) => set({ file }),
  setJobName: (jobName) => set({ jobName }),
  setStatus: (status) =>
    set({
      status,
      loading: status === 'COMPLETED' ? false : true,
    }),
  clear: () => set(initialState),
}));
