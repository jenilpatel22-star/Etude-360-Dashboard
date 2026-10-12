import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useData } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import type { TimelinePhase } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = { startDate: string; endDate: string; percentComplete: string; milestoneLabel: string; milestoneDate: string };

function validate(v: Values): Errors<Values> {
  const pct = Number(v.percentComplete);
  return {
    startDate: required(v.startDate, 'Start date'),
    endDate: required(v.endDate, 'End date') ?? (v.endDate < v.startDate ? 'End date must be on or after start date' : undefined),
    percentComplete: v.percentComplete === '' || !Number.isFinite(pct) || pct < 0 || pct > 100 ? 'Enter a value from 0 to 100' : undefined,
    milestoneDate: v.milestoneLabel.trim() && !v.milestoneDate ? 'Milestone date is required' : undefined,
  };
}

export function PhaseForm({ phase, onClose }: { phase: TimelinePhase; onClose: () => void }) {
  const { update } = useData();
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      startDate: phase.startDate,
      endDate: phase.endDate,
      percentComplete: String(phase.percentComplete),
      milestoneLabel: phase.milestone?.label ?? '',
      milestoneDate: phase.milestone?.date ?? '',
    },
    validate,
  );
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      await update('phases', phase.id, {
        startDate: v.startDate,
        endDate: v.endDate,
        percentComplete: Math.round(Number(v.percentComplete)),
        milestone: v.milestoneLabel.trim() ? { label: v.milestoneLabel.trim(), date: v.milestoneDate } : undefined,
      });
      onClose();
    });
  };
  return (
    <Modal open title={`Update phase: ${phase.phase}`} onClose={onClose} footer={<FormFooter formId="phase-form" onCancel={onClose} submitting={submitting} submitLabel="Save" />}>
      <form id="phase-form" onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Start date" htmlFor="startDate" error={errors.startDate} required>
          <input type="date" {...inputProps('startDate', errors.startDate)} value={values.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="End date" htmlFor="endDate" error={errors.endDate} required>
          <input type="date" {...inputProps('endDate', errors.endDate)} value={values.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </Field>
        <Field label={`Progress: ${values.percentComplete || 0}%`} htmlFor="percentComplete" error={errors.percentComplete} required className="col-span-2">
          <input type="range" min={0} max={100} step={5} {...inputProps('percentComplete', errors.percentComplete)} className="w-full accent-brand-600" value={values.percentComplete} onChange={(e) => set('percentComplete', e.target.value)} />
        </Field>
        <Field label="Milestone" htmlFor="milestoneLabel">
          <input {...inputProps('milestoneLabel')} value={values.milestoneLabel} onChange={(e) => set('milestoneLabel', e.target.value)} />
        </Field>
        <Field label="Milestone date" htmlFor="milestoneDate" error={errors.milestoneDate}>
          <input type="date" {...inputProps('milestoneDate', errors.milestoneDate)} value={values.milestoneDate} onChange={(e) => set('milestoneDate', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
