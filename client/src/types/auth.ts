export type ISO8601 = string;

export interface DirectorSession {
  user: { id: string; email: string };
  session: { access_token: string; expires_in: number };
  isCoOwner: boolean;
}

export interface MemberSession {
  memberId: string;
  memberName: string;
  ownerId: string;
  sessionToken: string;
  permissions: Record<string, boolean>;
  expiresAt: ISO8601;
}

export interface MemberInviteToken {
  token: string;
  email: string;
  pinTemporary?: string;
  expiresAt: ISO8601;
}

export enum AuthError {
  PIN_INCORRECT = "PIN_INCORRECT",
  PIN_NOT_SET = "PIN_NOT_SET",
  USER_INACTIVE = "USER_INACTIVE",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  RATE_LIMITED = "RATE_LIMITED",
  CSRF_INVALID = "CSRF_INVALID",
}
