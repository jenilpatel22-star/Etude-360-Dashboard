import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { DIMENSION_360_LABELS } from '@/lib/chartTheme';
import { toISODate, today } from '@/lib/dates';
import { DIMENSIONS_360, RESPONDENT_GROUPS, type Dimension360, type Feedback360, type RespondentGroup } from '@/types';
import { Scale } from './FeedbackForm';
import { FormFooter, SubmitError } from './FormFooter';

type Values = { programId: string; group: RespondentGroup; submittedAt: string; comment: string } & Record<Dimension360, string>;

function validate(v: Values): Errors<Values> {
  const e: Errors<Values> = { programId: required(v.programId, 'Programme'), submittedAt: required(v.submittedAt, 'Date') };
  if (v.submittedAt && v.submittedAt > toISODate(today())) e.submittedAt = 'Date cannot be in the future';
  for (const d of DIMENSIONS_360) if (!v[d]) e[d] = `Rate ${DIMENSION_360_LABELS[d].toLowerCase()}`;
  if (v.comment.length > 1000) e.comment = 'Keep comments under 1000 characters';
  return e;
}

export function Feedback360Form({ onClose }: { onClose: () => void }) {
  const { data, create } = useData();
  const programs = [...data.programs].filter((p) => p.status !== 'Potential').sort((a, b) => a.title.localeCompare(b.title));
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      programId: programs[0]?.id ?? '',
      group: 'Participants',
      submittedAt: toISODate(today()),
      comment: '',
      ...(Object.fromEntries(DIMENSIONS_360.map((d) => [d, ''])) as Record<Dimension360, string>),
    },
    validate,
  );
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      await create('feedback360', {
        programId: v.programId,
        group: v.group,
        submittedAt: v.submittedAt,
        scores: Object.fromEntries(DIMENSIONS_360.map((d) => [d, Number(v[d])])) as Feedback360['scores'],
        comment: v.comment.trim(),
      });
      onClose();
    });
  };
  return (
    <Modal open wide title="Record 360° response" onClose={onClose} footer={<FormFooter formId="f360-form" onCancel={onClose} submitting={submitting} submitLabel="Save response" />}>
      <form id="f360-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Programme" htmlFor="programId" error={errors.programId} required className="sm:col-span-2" hint={!programs.length ? 'Create a programme first (pipeline programmes are excluded).' : undefined}>
          <select {...inputProps('programId', errors.programId)} value={values.programId} onChange={(e) => set('programId', e.target.value)}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stakeholder group" htmlFor="group" required>
          <select {...inputProps('group')} value={values.group} onChange={(e) => set('group', e.target.value as RespondentGroup)}>
            {RESPONDENT_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" htmlFor="submittedAt" error={errors.submittedAt} required>
          <input type="date" {...inputProps('submittedAt', errors.submittedAt)} value={values.submittedAt} onChange={(e) => set('submittedAt', e.target.value)} />
        </Field>
        {DIMENSIONS_360.map((d) => (
          <Field key={d} label={`${DIMENSION_360_LABELS[d]} (1–5)`} htmlFor={d} error={errors[d]} required>
            <Scale id={d} label={DIMENSION_360_LABELS[d]} value={values[d]} onChange={(v) => set(d, v)} max={5} error={errors[d]} />
          </Field>
        ))}
        <Field label="Comments" htmlFor="comment" error={errors.comment} className="sm:col-span-2">
          <textarea rows={3} {...inputProps('comment', errors.comment)} value={values.comment} onChange={(e) => set('comment', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
