interface UserPoolUsersItem {
  Users: {
    Attributes: {
      Name: string;
      Value: string;
    }[];
    Enabled: boolean;
    UserCreateDate: string;
    UserLastModifiedDate: string;
    UserStatus: string;
    Username: string;
  }[];
}

interface RequestBody {
  appEnv: string;
  userPoolId: string;
  userPoolUsers: UserPoolUsersItem;
  year: string;
  month: string;
  day: string;
}

export type { UserPoolUsersItem, RequestBody };
