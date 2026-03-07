import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthUser } from './auth';

export interface PermissionsContextType {
  permissions: string[];
  roles: string[];
  setPermissions: (permissions: string[]) => void;
  setRoles: (roles: string[]) => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

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

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authUser = useMemo(() => getAuthUser(), []);
  const [permissions, setPermissionsState] = useState<string[]>(toNameList(authUser?.permissions));
  const [roles, setRolesState] = useState<string[]>(toNameList(authUser?.roles));

  const setPermissions = (next: string[]) => {
    setPermissionsState(toNameList(next));
  };

  const setRoles = (next: string[]) => {
    setRolesState(toNameList(next));
  };

  useEffect(() => {
    const stored = getAuthUser();
    if (!stored) return;
    const storedPermissions = toNameList(stored.permissions);
    const storedRoles = toNameList(stored.roles);
    setPermissionsState(storedPermissions);
    setRolesState(storedRoles);
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, roles, setPermissions, setRoles }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
