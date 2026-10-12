import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PERMISSIONS, ROLES, type Permissions, type Role } from '@/lib/permissions';

const RoleContext = createContext<{ role: Role; setRole: (r: Role) => void; can: Permissions } | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    try {
      const saved = localStorage.getItem('etude.role') as Role | null;
      if (saved && (ROLES as readonly string[]).includes(saved)) return saved;
    } catch {
      /* ignore */
    }
    return 'Admin';
  });
  useEffect(() => {
    try {
      localStorage.setItem('etude.role', role);
    } catch {
      /* ignore */
    }
  }, [role]);
  return <RoleContext.Provider value={{ role, setRole, can: PERMISSIONS[role] }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
