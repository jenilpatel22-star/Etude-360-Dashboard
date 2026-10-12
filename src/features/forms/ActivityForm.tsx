import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/context/RoleContext';
import { useData } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { capitalise } from '@/lib/format';
import { ACTIVITY_STATUSES, ACTIVITY_TYPES, type Activity, type Program } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = {
  title: string;
  type: Activity['type'];
  date: string;
  startTime: string;
  endTime: string;
  ownerId: string;
  location: string;
  status: Activity['status'];
};

const validate = (v: Values): Errors<Values> => ({
  title: required(v.title, 'Title'),
  date: required(v.date, 'Date'),
  startTime: required(v.startTime, 'Start time'),
  endTime: required(v.endTime, 'End time') ?? (v.startTime && v.endTime <= v.startTime ? 'End time must be after start time' : undefined),
  ownerId: required(v.ownerId, 'Owner'),
});

export function ActivityForm({ program, activity, onClose }: { program: Program; activity?: Activity; onClose: () => void }) {
  const { create, update, remove, data } = useData();
  const { can } = useRole();
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      title: activity?.title ?? '',
      type: activity?.type ?? 'session',
      date: activity?.start.slice(0, 10) ?? program.startDate,
      startTime: activity?.start.slice(11, 16) ?? '09:00',
      endTime: activity?.end.slice(11, 16) ?? '10:30',
      ownerId: activity?.ownerId ?? program.trainerIds[0] ?? '',
      location: activity?.location ?? program.venue,
      status: activity?.status ?? 'Planned',
    },
    validate,
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      const payload = {
        programId: program.id,
        title: v.title.trim(),
        type: v.type,
        start: `${v.date}T${v.startTime}:00`,
        end: `${v.date}T${v.endTime}:00`,
        ownerId: v.ownerId,
        location: v.location.trim(),
        status: v.status,
      };
      if (activity) await update('activities', activity.id, payload);
      else await create('activities', payload);
      onClose();
    });
  };

  const outside = values.date && (values.date < program.startDate || values.date > program.endDate);

  return (
    <Modal
      open
      title={activity ? 'Edit activity' : 'Add activity'}
      onClose={onClose}
      footer={
        <FormFooter
          formId="activity-form"
          onCancel={onClose}
          submitting={submitting}
          submitLabel={activity ? 'Save' : 'Add activity'}
          onDelete={activity && can.delete ? () => confirm('Delete this activity?') && void remove('activities', activity.id).then(onClose) : undefined}
        />
      }
    >
      <form id="activity-form" onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Title" htmlFor="title" error={errors.title} required className="col-span-2">
          <input {...inputProps('title', errors.title)} value={values.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Type" htmlFor="type" required>
          <select {...inputProps('type')} value={values.type} onChange={(e) => set('type', e.target.value as Values['type'])}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {capitalise(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select {...inputProps('status')} value={values.status} onChange={(e) => set('status', e.target.value as Values['status'])}>
            {ACTIVITY_STATUSES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Date"
          htmlFor="date"
          error={errors.date}
          required
          className="col-span-2"
          hint={outside ? 'Note: this date is outside the programme dates.' : undefined}
        >
          <input type="date" {...inputProps('date', errors.date)} value={values.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Start" htmlFor="startTime" error={errors.startTime} required>
          <input type="time" {...inputProps('startTime', errors.startTime)} value={values.startTime} onChange={(e) => set('startTime', e.target.value)} />
        </Field>
        <Field label="End" htmlFor="endTime" error={errors.endTime} required>
          <input type="time" {...inputProps('endTime', errors.endTime)} value={values.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </Field>
        <Field label="Owner" htmlFor="ownerId" error={errors.ownerId} required>
          <select {...inputProps('ownerId', errors.ownerId)} value={values.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
            <option value="">Select…</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location" htmlFor="location">
          <input {...inputProps('location')} value={values.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
