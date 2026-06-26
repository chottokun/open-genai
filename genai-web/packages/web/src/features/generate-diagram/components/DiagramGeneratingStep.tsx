import { useLocation } from 'react-router';
import { ProgressIndicator } from '@/components/ui/dads/ProgressIndicator';
import { useDiagram } from '@/features/generate-diagram/hooks/useDiagram';

export const DiagramGeneratingStep = () => {
  const { pathname } = useLocation();
  const { diagramType } = useDiagram(pathname);

  if (diagramType === '') {
    return null;
  }

  return (
    <div className='flex min-h-10 items-center justify-center rounded-6 bg-solid-gray-50 p-3'>
      <ProgressIndicator label='ステップ２: 図を生成しています' />
    </div>
  );
};
