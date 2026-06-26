import { createWithEqualityFn as create } from 'zustand/traditional';
import type { DiagramType, MermaidDiagramType } from '@/features/generate-diagram/types';

type DiagramState = {
  content: string;
  selectedType: DiagramType;
  diagramGenerationError: Error | null;
  /** AI が決定したダイアグラムタイプ（API 結果） */
  diagramType: MermaidDiagramType | '';
};

type DiagramActions = {
  setContent: (content: string) => void;
  setSelectedType: (selectedType: DiagramType) => void;
  setDiagramGenerationError: (diagramGenerationError: Error | null) => void;
  setDiagramType: (diagramType: MermaidDiagramType | '') => void;
  clear: () => void;
};

type DiagramStore = DiagramState & DiagramActions;

const initialState: DiagramState = {
  content: '',
  selectedType: 'AI',
  diagramGenerationError: null,
  diagramType: '',
};

export const useDiagramStore = create<DiagramStore>((set) => ({
  ...initialState,
  setContent: (content) => set({ content }),
  setSelectedType: (selectedType) => set({ selectedType }),
  setDiagramGenerationError: (diagramGenerationError) => set({ diagramGenerationError }),
  setDiagramType: (diagramType) => set({ diagramType }),
  clear: () => set(initialState),
}));
