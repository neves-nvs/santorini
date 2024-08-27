type UserBase = {
  id: number;
  display_name: string;
  username: string;
  created_at: Date;
};

export type CredentialsUser = UserBase & {
  password: string;
  google_id: null;
};

export function isCredentialsUser(user: AppUser): user is CredentialsUser {
  return (user as CredentialsUser).password !== undefined;
}

export type GoogleUser = UserBase & {
  google_id: string;
};

export function isGoogleUser(user: AppUser): user is GoogleUser {
  return (user as GoogleUser).google_id !== undefined;
}

export type AppUser = CredentialsUser | GoogleUser;
