import { ExApp } from 'genai-web';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { ExAppUsageMarkdownRenderer } from './ExAppUsageMarkdownRenderer';

type Props = {
  exApp: ExApp;
};

export const ExAppHeader = (props: Props) => {
  const { exApp } = props;

  return (
    <div className='mb-6 flex flex-col gap-4'>
      <BreadcrumbsNav
        items={[
          { label: 'ホーム', to: '/' },
          { label: 'AIアプリ', to: '/apps' },
          { label: exApp.exAppName },
        ]}
      />
      <div className='flex items-baseline gap-1'>
        <h1 className='mb-2 flex justify-start text-std-20B-160 lg:text-std-24B-150'>
          {exApp?.exAppName}
        </h1>
      </div>
      {exApp?.howToUse && <ExAppUsageMarkdownRenderer content={exApp.howToUse} size='sm' />}
    </div>
  );
};
