// constants.ts
import {UserRole, GroupRole} from "../../generated/prisma/enums"

export { UserRole, GroupRole };
export const USER_ROLES = Object.values(UserRole);
export const GROUP_ROLES = Object.values(GroupRole);


// cookie options for JWT refresh token, used repeatedly across auth controllers
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

// pagination defaults
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;