import { CreateTeamUserRequest, TeamUser } from 'genai-web';
import { useParams } from 'react-router';
import { useSWRConfig } from 'swr';
import { teamApi } from '@/lib/fetcher';

export const useCreateTeamMember = () => {
  const { teamId } = useParams();
  const { mutate } = useSWRConfig();

  return {
    createTeamMember: async (teamId: string, req: CreateTeamUserRequest) => {
      const res = await teamApi.post<TeamUser>(`teams/${teamId}/users`, req);
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
