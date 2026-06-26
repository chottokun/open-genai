import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { LayoutBody } from '@/layout/LayoutBody';
import { TeamCreateForm } from './components/TeamCreateForm';

export const TeamCreatePage = () => {
  const PAGE_TITLE = 'チームの作成';

  return (
    <LayoutBody>
      <PageTitle title={`${PAGE_TITLE} | チーム管理${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[
            { label: 'ホーム', to: '/' },
            { label: 'チーム管理', to: '/teams' },
            { label: PAGE_TITLE },
          ]}
          className='mb-4'
        />
        <h1 className='mb-6 text-std-20B-160 lg:text-std-24B-150'>{PAGE_TITLE}</h1>

        <TeamCreateForm />
      </div>
    </LayoutBody>
  );
};
