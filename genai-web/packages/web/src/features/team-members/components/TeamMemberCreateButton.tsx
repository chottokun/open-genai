import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/dads/Button';
import { useFetchLoginUser } from '../hooks/useFetchLoginUser';

export const TeamMemberCreateButton = () => {
  const { teamId } = useParams();
  const { isSystemAdminGroup, loginUser } = useFetchLoginUser();

  const canCreateTeamMember = isSystemAdminGroup || loginUser?.isAdmin;

  return (
    <div className='my-4 flex gap-0'>
      {canCreateTeamMember && (
        <Button
          asChild
          className='inline-flex justify-center items-center gap-2 w-48'
          variant='outline'
          size='lg'
        >
          <Link to={`/teams/${teamId}/members/create`}>メンバーを追加</Link>
        </Button>
      )}
    </div>
  );
};
