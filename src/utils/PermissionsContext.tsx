import React, { createContext, useContext, useState } from 'react';

export interface PermissionsContextType {
  permissions: string[];
  roles: string[];
  setPermissions: (permissions: string[]) => void;
  setRoles: (roles: string[]) => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

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
