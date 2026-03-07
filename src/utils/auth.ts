export type AuthUser = {
  id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
};

const STORAGE_KEY = "auth_user";
const TOKEN_KEY = "auth_token";

const toNameList = (list: any): string[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return String(item.name || item.role || item.permission || "");
    })
    .filter(Boolean);
};

export const normalizeAuthUser = (raw: any): AuthUser | null => {
  if (!raw || typeof raw !== "object") return null;

  const user = raw.user && typeof raw.user === "object" ? raw.user : raw;
  const roles = toNameList(raw.roles ?? user.roles);
  const permissions = toNameList(raw.permissions ?? user.permissions);

  return {
    ...user,
    roles,
    permissions,
  };
};

export const setAuthUser = (user: AuthUser | null) => {
  if (!user) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const getAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const clearAuthUser = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  try {
    const direct = localStorage.getItem(TOKEN_KEY);
    if (direct) return direct;
    const rawUser = localStorage.getItem(STORAGE_KEY);
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser) as Record<string, any>;
    return (
      parsed?.token ||
      parsed?.access_token ||
      parsed?.jwt ||
      parsed?.api_token ||
      null
    );
  } catch {
    return null;
  }
};

export const hasRole = (user: AuthUser | null, role: string): boolean => {
  if (!user || !role) return false;
  return Array.isArray(user.roles) && user.roles.includes(role);
};

export const hasPermission = (user: AuthUser | null, permission: string): boolean => {
  if (!user || !permission) return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};
