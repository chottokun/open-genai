import { TeamUser, UpdateTeamUserRequest } from 'genai-web';
import { useParams } from 'react-router';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useUpdateTeamMember = () => {
  const { teamId } = useParams();
  const { mutate } = useSWRConfig();

  return {
    updateTeamMember: async (teamId: string, userId: string, req: UpdateTeamUserRequest) => {
      const res = await teamApi.put<TeamUser>(`teams/${teamId}/users/${userId}`, req);
      return res.data;
    },
    mutateTeamMembers: async () => {
      await mutate(
        (key) => {
          if (typeof key === 'string') {
            return key.startsWith(`teams/${teamId}/users`);
          }
          return false;
        },
        undefined,
        { revalidate: true },
      );
    },
  };
};
