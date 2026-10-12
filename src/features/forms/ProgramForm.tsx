import { useNavigate } from 'react-router-dom';
import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/context/RoleContext';
import { useData, useLookups } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { capitalise } from '@/lib/format';
import { DELIVERY_MODES, PROGRAM_CATEGORIES, PROGRAM_STATUSES, type Program } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = {
  title: string;
  code: string;
  category: Program['category'];
  status: Program['status'];
  startDate: string;
  endDate: string;
  mode: Program['mode'];
  venue: string;
  trainerIds: string[];
  coordinatorId: string;
  capacity: string;
  enrolled: string;
  budget: string;
  objectives: string;
  description: string;
};

function validate(v: Values): Errors<Values> {
  const e: Errors<Values> = {};
  e.title = required(v.title, 'Title') ?? (v.title.trim().length < 3 ? 'Title must be at least 3 characters' : undefined);
  e.startDate = required(v.startDate, 'Start date');
  e.endDate = required(v.endDate, 'End date') ?? (v.startDate && v.endDate < v.startDate ? 'End date must be on or after the start date' : undefined);
  e.venue = required(v.venue, 'Venue / platform');
  e.coordinatorId = required(v.coordinatorId, 'Coordinator');
  if (!v.trainerIds.length) e.trainerIds = 'Select at least one trainer';
  const cap = Number(v.capacity);
  const enr = Number(v.enrolled);
  const bud = Number(v.budget);
  if (!Number.isInteger(cap) || cap < 1) e.capacity = 'Capacity must be a whole number ≥ 1';
  if (!Number.isInteger(enr) || enr < 0) e.enrolled = 'Enrolled must be a whole number ≥ 0';
  else if (cap >= 1 && enr > cap) e.enrolled = 'Enrolled cannot exceed capacity';
  if (!Number.isFinite(bud) || bud < 0 || v.budget === '') e.budget = 'Budget must be ≥ 0';
  return e;
}

export function ProgramForm({ program, onClose }: { program?: Program; onClose: () => void }) {
  const { create, update, remove, data } = useData();
  const { trainers } = useLookups();
  const { can } = useRole();
  const navigate = useNavigate();
  const coordinators = data.staff.filter((s) => s.role === 'Coordinator' || s.role === 'Manager');

  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      title: program?.title ?? '',
      code: program?.code ?? '',
      category: program?.category ?? 'Leadership',
      status: program?.status ?? 'Potential',
      startDate: program?.startDate ?? '',
      endDate: program?.endDate ?? '',
      mode: program?.mode ?? 'onsite',
      venue: program?.venue ?? '',
      trainerIds: program?.trainerIds ?? [],
      coordinatorId: program?.coordinatorId ?? '',
      capacity: String(program?.capacity ?? 20),
      enrolled: String(program?.enrolled ?? 0),
      budget: String(program?.budget ?? 0),
      objectives: program?.objectives.join('\n') ?? '',
      description: program?.description ?? '',
    },
    validate,
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      const payload: Omit<Program, 'id'> = {
        title: v.title.trim(),
        code: v.code.trim() || `${v.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        category: v.category,
        status: v.status,
        startDate: v.startDate,
        endDate: v.endDate,
        mode: v.mode,
        venue: v.venue.trim(),
        trainerIds: v.trainerIds,
        coordinatorId: v.coordinatorId,
        capacity: Number(v.capacity),
        enrolled: Number(v.enrolled),
        budget: Number(v.budget),
        objectives: v.objectives.split('\n').map((s) => s.trim()).filter(Boolean),
        description: v.description.trim(),
        pastRuns: program?.pastRuns ?? [],
      };
      if (program) await update('programs', program.id, payload);
      else {
        const created = await create('programs', payload);
        navigate(`/programs/${created.id}/logistics`);
      }
      onClose();
    });
  };

  const budgetLocked = !!program && !can.manageBudget;

  return (
    <Modal
      open
      wide
      title={program ? `Edit programme` : 'New programme'}
      onClose={onClose}
      footer={
        <FormFooter
          formId="program-form"
          onCancel={onClose}
          submitting={submitting}
          submitLabel={program ? 'Save changes' : 'Create programme'}
          onDelete={
            program && can.delete
              ? () => {
                  if (confirm(`Delete “${program.title}” and all its activities, logistics and feedback?`)) {
                    void remove('programs', program.id).then(() => {
                      onClose();
                      navigate('/');
                    });
                  }
                }
              : undefined
          }
        />
      }
    >
      <form id="program-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SubmitError message={submitError} />
        <Field label="Title" htmlFor="title" error={errors.title} required className="sm:col-span-2">
          <input {...inputProps('title', errors.title)} value={values.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Code" htmlFor="code" hint="Auto-generated if left blank">
          <input {...inputProps('code')} value={values.code} onChange={(e) => set('code', e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="category" required>
          <select {...inputProps('category')} value={values.category} onChange={(e) => set('category', e.target.value as Values['category'])}>
            {PROGRAM_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select {...inputProps('status')} value={values.status} onChange={(e) => set('status', e.target.value as Values['status'])}>
            {PROGRAM_STATUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Delivery mode" htmlFor="mode" required>
          <select {...inputProps('mode')} value={values.mode} onChange={(e) => set('mode', e.target.value as Values['mode'])}>
            {DELIVERY_MODES.map((c) => (
              <option key={c} value={c}>
                {capitalise(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date" htmlFor="startDate" error={errors.startDate} required>
          <input type="date" {...inputProps('startDate', errors.startDate)} value={values.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="End date" htmlFor="endDate" error={errors.endDate} required>
          <input type="date" {...inputProps('endDate', errors.endDate)} value={values.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </Field>
        <Field label="Venue / platform" htmlFor="venue" error={errors.venue} required className="sm:col-span-2">
          <input {...inputProps('venue', errors.venue)} value={values.venue} onChange={(e) => set('venue', e.target.value)} />
        </Field>
        <Field label="Coordinator" htmlFor="coordinatorId" error={errors.coordinatorId} required>
          <select {...inputProps('coordinatorId', errors.coordinatorId)} value={values.coordinatorId} onChange={(e) => set('coordinatorId', e.target.value)}>
            <option value="">Select…</option>
            {coordinators.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget (£)" htmlFor="budget" error={errors.budget} required hint={budgetLocked ? 'Only admins can change budgets' : undefined}>
          <input type="number" min={0} step={100} disabled={budgetLocked} {...inputProps('budget', errors.budget)} value={values.budget} onChange={(e) => set('budget', e.target.value)} />
        </Field>
        <Field label="Capacity" htmlFor="capacity" error={errors.capacity} required>
          <input type="number" min={1} {...inputProps('capacity', errors.capacity)} value={values.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </Field>
        <Field label="Enrolled" htmlFor="enrolled" error={errors.enrolled} required>
          <input type="number" min={0} {...inputProps('enrolled', errors.enrolled)} value={values.enrolled} onChange={(e) => set('enrolled', e.target.value)} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="label">
            Trainers <span className="text-red-600" aria-hidden>*</span>
          </legend>
          <div
            id="trainerIds"
            tabIndex={-1}
            className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-stone-300 p-2 dark:border-stone-700 sm:grid-cols-2"
            aria-invalid={!!errors.trainerIds || undefined}
            aria-describedby={errors.trainerIds ? 'trainerIds-error' : undefined}
          >
            {trainers.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-stone-50 dark:hover:bg-stone-800">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={values.trainerIds.includes(t.id)}
                  onChange={(e) =>
                    set('trainerIds', e.target.checked ? [...values.trainerIds, t.id] : values.trainerIds.filter((x) => x !== t.id))
                  }
                />
                <span className="truncate">{t.name}</span>
                <span className="ml-auto hidden truncate text-xs muted sm:inline">{t.specialties[0]}</span>
              </label>
            ))}
          </div>
          {errors.trainerIds && (
            <p id="trainerIds-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {errors.trainerIds}
            </p>
          )}
        </fieldset>
        <Field label="Objectives" htmlFor="objectives" hint="One per line" className="sm:col-span-2">
          <textarea rows={3} {...inputProps('objectives')} value={values.objectives} onChange={(e) => set('objectives', e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2">
          <textarea rows={2} {...inputProps('description')} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
