import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useData } from '@/data/DataProvider';
import { createCredentials, normaliseUsername, verifyPassword } from '@/lib/auth';
import { permissionsFor, type Permissions } from '@/lib/permissions';
import type { Account, StaffRole, UserRole } from '@/types';

const SESSION_KEY = 'etude.session';
const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

interface Session {
  accountId: string;
  expiresAt: number;
}

export interface NewAccount {
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  password: string;
  department?: string;
  specialties?: string[];
}

interface AuthContextValue {
  account: Account | null;
  role: UserRole | null;
  can: Permissions;
  /** True when no accounts exist yet and the first Admin must be created. */
  needsSetup: boolean;
  login(username: string, password: string): Promise<void>;
  logout(): void;
  createAccount(input: NewAccount): Promise<Account>;
  updateAccount(id: string, patch: Partial<Pick<Account, 'displayName' | 'email' | 'role' | 'active' | 'username'>>): Promise<void>;
  setPassword(id: string, password: string): Promise<void>;
  changeOwnPassword(current: string, next: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;
}

const STAFF_ROLE: Record<Exclude<UserRole, 'Trainee'>, StaffRole> = {
  Admin: 'Manager',
  'Program Executive': 'Coordinator',
  Trainer: 'Trainer',
};

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, loading, create, update, remove } = useData();
  const [session, setSession] = useState<Session | null>(readSession);
  const attempts = useRef({ count: 0, lockedUntil: 0 });

  const account = useMemo(() => {
    const a = session ? data.accounts.find((x) => x.id === session.accountId) : undefined;
    return a && a.active ? a : null;
  }, [session, data.accounts]);

  // Drop a session whose account was removed or deactivated (e.g. after "Clear all data").
  useEffect(() => {
    if (!loading && session && !account) {
      writeSession(null);
      setSession(null);
    }
  }, [loading, session, account]);

  const startSession = (id: string) => {
    const s = { accountId: id, expiresAt: Date.now() + SESSION_HOURS * 3_600_000 };
    writeSession(s);
    setSession(s);
  };

  const login = useCallback(
    async (username: string, password: string) => {
      const now = Date.now();
      if (attempts.current.lockedUntil > now) {
        throw new Error(`Too many attempts. Try again in ${Math.ceil((attempts.current.lockedUntil - now) / 1000)} seconds.`);
      }
      const a = data.accounts.find((x) => x.username === normaliseUsername(username));
      // Always run the hash so a missing user takes as long as a wrong password.
      const ok = await verifyPassword(password, a ?? { passwordHash: '', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iterations: 210_000 });
      if (!a || !ok || !a.active) {
        attempts.current.count += 1;
        if (attempts.current.count >= MAX_ATTEMPTS) {
          attempts.current = { count: 0, lockedUntil: now + LOCKOUT_MS };
        }
        throw new Error(a && ok && !a.active ? 'This account is deactivated. Contact your administrator.' : 'Username or password is incorrect.');
      }
      attempts.current = { count: 0, lockedUntil: 0 };
      startSession(a.id);
    },
    [data.accounts],
  );

  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  const createAccount = useCallback(
    async (input: NewAccount) => {
      const username = normaliseUsername(input.username);
      if (data.accounts.some((a) => a.username === username)) throw new Error('That username is already taken.');
      let staffId: string | undefined;
      let participantId: string | undefined;
      if (input.role === 'Trainee') {
        const p = await create('participants', {
          name: input.displayName,
          email: input.email,
          organisation: '',
          department: input.department ?? '',
          jobTitle: '',
          programIds: [],
        });
        participantId = p.id;
      } else {
        const s = await create('staff', {
          name: input.displayName,
          role: STAFF_ROLE[input.role],
          email: input.email,
          department: input.department ?? '',
          specialties: input.specialties ?? [],
        });
        staffId = s.id;
      }
      const creds = await createCredentials(input.password);
      const created = await create('accounts', {
        username,
        displayName: input.displayName,
        email: input.email,
        role: input.role,
        ...creds,
        staffId,
        participantId,
        active: true,
        createdAt: new Date().toISOString(),
      });
      // First-run setup: sign the new Admin straight in.
      if (data.accounts.length === 0) startSession(created.id);
      return created;
    },
    [data.accounts, create],
  );

  const updateAccount = useCallback<AuthContextValue['updateAccount']>(
    async (id, patch) => {
      const a = data.accounts.find((x) => x.id === id);
      if (!a) throw new Error('Account not found.');
      const next = { ...patch };
      if (patch.username !== undefined) {
        next.username = normaliseUsername(patch.username);
        if (data.accounts.some((x) => x.id !== id && x.username === next.username)) throw new Error('That username is already taken.');
      }
      const role = patch.role ?? a.role;
      const lastAdmin = a.role === 'Admin' && data.accounts.filter((x) => x.role === 'Admin' && x.active).length === 1;
      if (lastAdmin && (role !== 'Admin' || patch.active === false)) throw new Error('Keep at least one active Admin account.');

      // Keep the linked staff / participant profile in sync.
      let { staffId, participantId } = a;
      const name = patch.displayName ?? a.displayName;
      const email = patch.email ?? a.email;
      if (role === 'Trainee') {
        if (participantId) await update('participants', participantId, { name, email });
        else participantId = (await create('participants', { name, email, organisation: '', department: '', jobTitle: '', programIds: [] })).id;
      } else if (staffId) {
        await update('staff', staffId, { name, email, role: STAFF_ROLE[role] });
      } else {
        staffId = (await create('staff', { name, email, role: STAFF_ROLE[role], department: '', specialties: [] })).id;
      }
      await update('accounts', id, { ...next, staffId, participantId });
    },
    [data.accounts, create, update],
  );

  const setPassword = useCallback(
    async (id: string, password: string) => {
      await update('accounts', id, await createCredentials(password));
    },
    [update],
  );

  const changeOwnPassword = useCallback(
    async (current: string, next: string) => {
      if (!account) throw new Error('Not signed in.');
      if (!(await verifyPassword(current, account))) throw new Error('Current password is incorrect.');
      await setPassword(account.id, next);
    },
    [account, setPassword],
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const a = data.accounts.find((x) => x.id === id);
      if (!a) return;
      if (a.id === account?.id) throw new Error('You cannot delete the account you are signed in with.');
      if (a.role === 'Admin' && data.accounts.filter((x) => x.role === 'Admin' && x.active).length <= 1) {
        throw new Error('Keep at least one active Admin account.');
      }
      // The linked staff/participant profile is kept so programme history stays intact.
      await remove('accounts', id);
    },
    [data.accounts, account, remove],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      role: account?.role ?? null,
      can: permissionsFor(account?.role ?? null, account?.staffId),
      needsSetup: data.accounts.length === 0,
      login,
      logout,
      createAccount,
      updateAccount,
      setPassword,
      changeOwnPassword,
      deleteAccount,
    }),
    [account, data.accounts.length, login, logout, createAccount, updateAccount, setPassword, changeOwnPassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
