import type { ElementType } from 'react';

export type DiagramType =
  | 'AI'
  | 'flowchart'
  | 'piechart'
  | 'mindmap'
  | 'quadrantchart'
  | 'sequencediagram'
  | 'timeline'
  | 'gitgraph'
  | 'erdiagram'
  | 'classdiagram'
  | 'statediagram'
  | 'xychart'
  | 'blockdiagram'
  | 'architecture'
  | 'ganttchart'
  | 'userjourney'
  | 'sankeychart'
  | 'requirementdiagram'
  | 'networkpacket';

/** DiagramType から 'AI' を除いた Mermaid ダイアグラムタイプ */
export type MermaidDiagramType = Exclude<DiagramType, 'AI'>;

export type DiagramInfo = {
  id: DiagramType;
  icon: ElementType;
  title: string;
  description: string;
  example: {
    title: string;
    content: string;
  };
  category: 'main' | 'other';
};

export type DiagramPageQueryParams = {
  modelId?: string;
  content: string;
};
