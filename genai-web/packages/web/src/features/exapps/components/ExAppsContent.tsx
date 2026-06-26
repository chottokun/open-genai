import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { useExApps } from '@/features/exapps/hooks/useExApps';
import { ExAppList } from './ExAppList';

export const ExAppsContent = () => {
  const { exAppOptions, setTeamId, setExAppId } = useExApps();

  return (
    <>
      <PageTitle title={`AIアプリ一覧${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[{ label: 'ホーム', to: '/' }, { label: 'AIアプリ' }]}
          className='mb-4'
        />
        <h1 className='mb-6 flex justify-start text-std-20B-160 lg:text-std-24B-150'>AIアプリ</h1>
        <div>
          <ExAppList exAppOptions={exAppOptions} setTeamId={setTeamId} setExAppId={setExAppId} />
        </div>
      </div>
    </>
  );
};
