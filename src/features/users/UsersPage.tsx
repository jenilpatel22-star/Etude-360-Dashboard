import { Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/data/DataProvider';
import { ROLE_HELP, UserForm } from '@/features/forms/UserForm';
import { formatDate } from '@/lib/dates';
import { USER_ROLES, type Account } from '@/types';

export default function UsersPage() {
  const { data, reset } = useData();
  const { can, account: me, updateAccount, deleteAccount } = useAuth();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!can.manageUsers) return <Navigate to="/" replace />;

  const run = (p: Promise<unknown>) => {
    setError(null);
    p.catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'User',
      value: (a) => a.displayName,
      render: (a) => (
        <div>
          <div className="font-medium">
            {a.displayName}
            {a.id === me?.id && <span className="ml-1.5 text-xs font-normal muted">(you)</span>}
          </div>
          <div className="text-xs muted">{a.email || '—'}</div>
        </div>
      ),
    },
    { key: 'username', header: 'Username', value: (a) => a.username, render: (a) => <code className="text-xs">{a.username}</code> },
    { key: 'role', header: 'Role', value: (a) => a.role, render: (a) => <RoleBadge role={a.role} /> },
    { key: 'status', header: 'Status', value: (a) => (a.active ? 'Active' : 'Deactivated'), render: (a) => <StatusBadge status={a.active ? 'Active' : 'Deactivated'} /> },
    { key: 'created', header: 'Added', value: (a) => a.createdAt, render: (a) => <span className="whitespace-nowrap">{formatDate(a.createdAt.slice(0, 10))}</span>, hideOnMobile: true },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      render: (a) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="btn-ghost p-1.5" onClick={() => setEditing(a)} aria-label={`Edit ${a.displayName}`} title="Edit or reset password">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {a.id !== me?.id && (
            <>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => run(updateAccount(a.id, { active: !a.active }))}
                aria-label={a.active ? `Deactivate ${a.displayName}` : `Reactivate ${a.displayName}`}
                title={a.active ? 'Deactivate' : 'Reactivate'}
              >
                {a.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
              </button>
              <ConfirmButton className="btn-ghost p-1.5 text-xs text-red-700 dark:text-red-400" ariaLabel={`Delete ${a.displayName}`} title="Delete" confirmLabel="Delete?" onConfirm={() => run(deleteAccount(a.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Accounts that can sign in to the dashboard"
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden /> Add user
          </button>
        }
      />
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardBody className="pt-4">
            <DataTable
              caption="User accounts"
              rows={data.accounts}
              columns={columns}
              rowKey={(a) => a.id}
              searchText={(a) => `${a.displayName} ${a.username} ${a.email} ${a.role}`}
              searchPlaceholder="Search users…"
              initialSort={{ key: 'role', dir: 'asc' }}
              pageSize={12}
              rowClassName={(a) => (a.active ? undefined : 'opacity-60')}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden />What each role can do</span>} />
            <CardBody>
              <dl className="space-y-3 text-sm">
                {USER_ROLES.map((r) => (
                  <div key={r}>
                    <dt>
                      <RoleBadge role={r} />
                    </dt>
                    <dd className="mt-1 muted">{ROLE_HELP[r]}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Clear all data" subtitle="Deletes every programme, activity, logistics item, phase, feedback response and user account in this browser. You'll be signed out and asked to create a new Admin." />
            <CardBody>
              <ConfirmButton className="btn-danger" confirmLabel="Click again to delete everything" onConfirm={() => void reset()}>
                <Trash2 className="h-4 w-4" aria-hidden /> Clear all data
              </ConfirmButton>
            </CardBody>
          </Card>
        </div>
      </div>
      {editing && <UserForm account={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
