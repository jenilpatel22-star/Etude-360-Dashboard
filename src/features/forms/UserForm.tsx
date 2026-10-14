import { useState } from 'react';
import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/features/auth/AuthShell';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { normaliseUsername, passwordProblem, USERNAME_RE } from '@/lib/auth';
import { USER_ROLES, type Account, type UserRole } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = {
  displayName: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  specialties: string;
  password: string;
};

export const ROLE_HELP: Record<UserRole, string> = {
  Admin: 'Full access: programmes, activities, logistics, timeline, feedback, Activity Depository and users.',
  'Program Executive': 'Edits activities, logistics and structure & timeline on all programmes; imports the Activity Depository.',
  Trainer: 'Edits activities on the programmes they are assigned to. Can download Activity Depository checklists.',
  Trainee: 'View only. Can download Activity Depository checklists.',
};

export function UserForm({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { createAccount, updateAccount, setPassword } = useAuth();
  const [show, setShow] = useState(false);
  const validate = (v: Values): Errors<Values> => ({
    displayName: required(v.displayName, 'Name'),
    username: required(v.username, 'Username') ?? (USERNAME_RE.test(normaliseUsername(v.username)) ? undefined : 'Use 3–32 letters, numbers, dots, dashes or underscores'),
    email: v.email && !/^\S+@\S+\.\S+$/.test(v.email) ? 'Enter a valid email address' : undefined,
    password: account && !v.password ? undefined : passwordProblem(v.password),
  });
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      displayName: account?.displayName ?? '',
      username: account?.username ?? '',
      email: account?.email ?? '',
      role: account?.role ?? 'Trainer',
      department: '',
      specialties: '',
      password: '',
    },
    validate,
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      if (account) {
        await updateAccount(account.id, { displayName: v.displayName.trim(), username: v.username, email: v.email.trim(), role: v.role });
        if (v.password) await setPassword(account.id, v.password);
      } else {
        await createAccount({
          displayName: v.displayName.trim(),
          username: v.username,
          email: v.email.trim(),
          role: v.role,
          password: v.password,
          department: v.department.trim(),
          specialties: v.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        });
      }
      onClose();
    });
  };

  return (
    <Modal open title={account ? `Edit ${account.displayName}` : 'Add user'} onClose={onClose} footer={<FormFooter formId="user-form" onCancel={onClose} submitting={submitting} submitLabel={account ? 'Save changes' : 'Add user'} />}>
      <form id="user-form" onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Full name" htmlFor="displayName" error={errors.displayName} required className="col-span-2">
          <input {...inputProps('displayName', errors.displayName)} value={values.displayName} onChange={(e) => set('displayName', e.target.value)} />
        </Field>
        <Field label="Username" htmlFor="username" error={errors.username} required>
          <input {...inputProps('username', errors.username)} autoCapitalize="none" spellCheck={false} autoComplete="off" value={values.username} onChange={(e) => set('username', e.target.value)} />
        </Field>
        <Field label="Role" htmlFor="role" required>
          <select {...inputProps('role')} value={values.role} onChange={(e) => set('role', e.target.value as UserRole)}>
            {USER_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <p className="col-span-2 -mt-2 text-xs muted">{ROLE_HELP[values.role]}</p>
        <Field label="Email" htmlFor="email" error={errors.email} className="col-span-2">
          <input type="email" {...inputProps('email', errors.email)} value={values.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        {!account && (
          <Field label="Department" htmlFor="department" className={values.role === 'Trainer' ? '' : 'col-span-2'}>
            <input {...inputProps('department')} value={values.department} onChange={(e) => set('department', e.target.value)} />
          </Field>
        )}
        {!account && values.role === 'Trainer' && (
          <Field label="Specialties" htmlFor="specialties" hint="Comma-separated">
            <input {...inputProps('specialties')} value={values.specialties} onChange={(e) => set('specialties', e.target.value)} />
          </Field>
        )}
        <Field
          label={account ? 'New password' : 'Password'}
          htmlFor="password"
          error={errors.password}
          required={!account}
          hint={account ? 'Leave blank to keep the current password' : 'At least 8 characters, with a letter and a number. Share it with the user securely.'}
          className="col-span-2"
        >
          <PasswordInput {...inputProps('password', errors.password)} autoComplete="new-password" value={values.password} onChange={(e) => set('password', e.target.value)} show={show} onToggle={() => setShow((s) => !s)} />
        </Field>
      </form>
    </Modal>
  );
}
