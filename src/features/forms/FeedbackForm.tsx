import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { DIMENSION_LABELS } from '@/lib/chartTheme';
import { toISODate, today } from '@/lib/dates';
import { cx } from '@/lib/format';
import { RATING_DIMENSIONS, RESPONDENT_ROLES, type Feedback, type Program, type RatingDimension } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = {
  respondentRole: Feedback['respondentRole'];
  submittedAt: string;
  nps: string;
  comment: string;
} & Record<RatingDimension, string>;

function validate(v: Values): Errors<Values> {
  const e: Errors<Values> = { submittedAt: required(v.submittedAt, 'Date') };
  if (v.submittedAt && v.submittedAt > toISODate(today())) e.submittedAt = 'Date cannot be in the future';
  for (const d of RATING_DIMENSIONS) if (!v[d]) e[d] = `Rate ${DIMENSION_LABELS[d].toLowerCase()}`;
  const n = Number(v.nps);
  if (v.nps === '' || !Number.isInteger(n) || n < 0 || n > 10) e.nps = 'Choose a score from 0 to 10';
  if (v.comment.length > 1000) e.comment = 'Keep comments under 1000 characters';
  return e;
}

export function Scale({ id, value, onChange, max, min = 1, error, label }: { id: string; value: string; onChange: (v: string) => void; max: number; min?: number; error?: string; label: string }) {
  return (
    <div role="radiogroup" id={id} tabIndex={-1} aria-label={label} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} className="flex flex-wrap gap-1">
      {Array.from({ length: max - min + 1 }, (_, i) => String(i + min)).map((n) => (
        <label
          key={n}
          className={cx(
            'flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-sm tabular-nums transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
            value === n ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800',
            error && value !== n && 'border-red-400',
          )}
        >
          <input type="radio" className="sr-only" name={id} value={n} checked={value === n} onChange={() => onChange(n)} />
          {n}
        </label>
      ))}
    </div>
  );
}

export function FeedbackForm({ program, onClose }: { program: Program; onClose: () => void }) {
  const { create } = useData();
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      respondentRole: 'Participant',
      submittedAt: toISODate(today()),
      nps: '',
      comment: '',
      content: '',
      trainer: '',
      logistics: '',
      relevance: '',
      overall: '',
    },
    validate,
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      await create('feedback', {
        programId: program.id,
        respondentRole: v.respondentRole,
        submittedAt: v.submittedAt,
        ratings: Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, Number(v[d])])) as Feedback['ratings'],
        nps: Number(v.nps),
        comment: v.comment.trim(),
      });
      onClose();
    });
  };

  return (
    <Modal open title="Record feedback" onClose={onClose} footer={<FormFooter formId="feedback-form" onCancel={onClose} submitting={submitting} submitLabel="Save response" />}>
      <form id="feedback-form" onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Respondent role" htmlFor="respondentRole" required>
          <select {...inputProps('respondentRole')} value={values.respondentRole} onChange={(e) => set('respondentRole', e.target.value as Values['respondentRole'])}>
            {RESPONDENT_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" htmlFor="submittedAt" error={errors.submittedAt} required>
          <input type="date" {...inputProps('submittedAt', errors.submittedAt)} value={values.submittedAt} onChange={(e) => set('submittedAt', e.target.value)} />
        </Field>
        {RATING_DIMENSIONS.map((d) => (
          <Field key={d} label={`${DIMENSION_LABELS[d]} (1 = poor, 5 = excellent)`} htmlFor={d} error={errors[d]} required className="col-span-2 sm:col-span-1">
            <Scale id={d} label={DIMENSION_LABELS[d]} value={values[d]} onChange={(v) => set(d, v)} max={5} error={errors[d]} />
          </Field>
        ))}
        <Field label="How likely are you to recommend this programme? (0–10)" htmlFor="nps" error={errors.nps} required className="col-span-2">
          <Scale id="nps" label="Likelihood to recommend" value={values.nps} onChange={(v) => set('nps', v)} min={0} max={10} error={errors.nps} />
        </Field>
        <Field label="Comments" htmlFor="comment" error={errors.comment} hint={`${values.comment.length}/1000`} className="col-span-2">
          <textarea rows={3} {...inputProps('comment', errors.comment)} value={values.comment} onChange={(e) => set('comment', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
