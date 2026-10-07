export type UserRole = "admin";

export interface SessionUser {
  userId: number;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface Session {
  user: SessionUser;
}

export interface LoginResult {
  success: true;
  user: SessionUser;
}

export interface LoginError {
  success: false;
  error: string;
  retryAfter?: number;
}
