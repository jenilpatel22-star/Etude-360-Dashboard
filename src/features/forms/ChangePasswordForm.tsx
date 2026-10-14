import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { passwordProblem } from '@/lib/auth';
import { FormFooter, SubmitError } from './FormFooter';

type Values = { current: string; next: string; confirm: string };

const validate = (v: Values): Errors<Values> => ({
  current: required(v.current, 'Current password'),
  next: passwordProblem(v.next) ?? (v.next === v.current ? 'Choose a different password' : undefined),
  confirm: v.confirm !== v.next ? 'Passwords do not match' : undefined,
});

export function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const { changeOwnPassword } = useAuth();
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>({ current: '', next: '', confirm: '' }, validate);
  return (
    <Modal open title="Change password" onClose={onClose} footer={<FormFooter formId="pw-form" onCancel={onClose} submitting={submitting} submitLabel="Change password" />}>
      <form
        id="pw-form"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(async (v) => {
            await changeOwnPassword(v.current, v.next);
            onClose();
          });
        }}
      >
        <SubmitError message={submitError} />
        <Field label="Current password" htmlFor="current" error={errors.current} required>
          <input type="password" autoComplete="current-password" {...inputProps('current', errors.current)} value={values.current} onChange={(e) => set('current', e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="next" error={errors.next} hint="At least 8 characters, with a letter and a number" required>
          <input type="password" autoComplete="new-password" {...inputProps('next', errors.next)} value={values.next} onChange={(e) => set('next', e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm} required>
          <input type="password" autoComplete="new-password" {...inputProps('confirm', errors.confirm)} value={values.confirm} onChange={(e) => set('confirm', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
