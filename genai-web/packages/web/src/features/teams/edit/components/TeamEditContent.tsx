import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { APP_TITLE } from '@/constants';
import { usePageTitle } from '../hooks/usePageTitle';
import { TeamEditForm } from './TeamEditForm';

export const TeamEditContent = () => {
  const PAGE_TITLE = 'チーム名の変更';
  const { pageTitle } = usePageTitle();

  return (
    <>
      <PageTitle title={`${pageTitle}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
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

        <TeamEditForm />
      </div>
    </>
  );
};
