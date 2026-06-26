import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/dads/Button';
import { useFetchLoginUser } from '../hooks/useFetchLoginUser';

export const TeamAppCreateButton = () => {
  const { teamId } = useParams();
  const { isSystemAdminGroup, loginUser } = useFetchLoginUser();

  const canCreateApp = isSystemAdminGroup || loginUser?.isAdmin;

  return (
    <div className='my-4 flex gap-0'>
      {canCreateApp && (
        <Button
          asChild
          className='inline-flex justify-center items-center gap-2 w-48'
          variant='outline'
          size='lg'
        >
          <Link to={`/teams/${teamId}/apps/create`}>AIアプリを作成</Link>
        </Button>
      )}
    </div>
  );
};
