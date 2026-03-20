export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string | null;
  nickname?: string | null;
  role?: string | null;
  status?: UserStatus | null;
  provider?: string | null;
  defaultTee?: string | null;
  customerName?: string | null;
  roundCount?: number;
  lastLoginAt?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}

export interface AdminUserUpdateInput {
  role?: string;
  status?: UserStatus;
  defaultTee?: string;
  customerName?: string;
}
