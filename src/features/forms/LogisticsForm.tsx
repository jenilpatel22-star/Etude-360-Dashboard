import { Field, inputProps } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/context/RoleContext';
import { useData } from '@/data/DataProvider';
import { required, useForm, type Errors } from '@/hooks/useForm';
import { LOGISTICS_CATEGORIES, LOGISTICS_STATUSES, type LogisticsItem, type Program } from '@/types';
import { FormFooter, SubmitError } from './FormFooter';

type Values = {
  category: LogisticsItem['category'];
  description: string;
  vendor: string;
  plannedCost: string;
  actualCost: string;
  dueDate: string;
  status: LogisticsItem['status'];
};

function validate(v: Values): Errors<Values> {
  const e: Errors<Values> = {
    description: required(v.description, 'Description'),
    vendor: required(v.vendor, 'Vendor'),
    dueDate: required(v.dueDate, 'Due date'),
  };
  const planned = Number(v.plannedCost);
  if (v.plannedCost === '' || !Number.isFinite(planned) || planned < 0) e.plannedCost = 'Planned cost must be ≥ 0';
  if (v.actualCost !== '') {
    const actual = Number(v.actualCost);
    if (!Number.isFinite(actual) || actual < 0) e.actualCost = 'Actual cost must be ≥ 0';
  } else if (v.status === 'Done') e.actualCost = 'Enter the actual cost before marking as done';
  return e;
}

export function LogisticsForm({ program, item, onClose }: { program: Program; item?: LogisticsItem; onClose: () => void }) {
  const { create, update, remove } = useData();
  const { can } = useRole();
  const { values, set, errors, submit, submitting, submitError } = useForm<Values>(
    {
      category: item?.category ?? 'venue',
      description: item?.description ?? '',
      vendor: item?.vendor ?? '',
      plannedCost: String(item?.plannedCost ?? ''),
      actualCost: item?.actualCost == null ? '' : String(item.actualCost),
      dueDate: item?.dueDate ?? program.startDate,
      status: item?.status ?? 'Pending',
    },
    validate,
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(async (v) => {
      const payload = {
        programId: program.id,
        category: v.category,
        description: v.description.trim(),
        vendor: v.vendor.trim(),
        plannedCost: Number(v.plannedCost),
        actualCost: v.actualCost === '' ? null : Number(v.actualCost),
        dueDate: v.dueDate,
        status: v.status,
      };
      if (item) await update('logistics', item.id, payload);
      else await create('logistics', payload);
      onClose();
    });
  };

  return (
    <Modal
      open
      title={item ? 'Edit logistics item' : 'Add logistics item'}
      onClose={onClose}
      footer={
        <FormFooter
          formId="logistics-form"
          onCancel={onClose}
          submitting={submitting}
          submitLabel={item ? 'Save' : 'Add item'}
          onDelete={item && can.delete ? () => confirm('Delete this logistics item?') && void remove('logistics', item.id).then(onClose) : undefined}
        />
      }
    >
      <form id="logistics-form" onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <SubmitError message={submitError} />
        </div>
        <Field label="Category" htmlFor="category" required>
          <select {...inputProps('category')} value={values.category} onChange={(e) => set('category', e.target.value as Values['category'])}>
            {LOGISTICS_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status" required>
          <select {...inputProps('status')} value={values.status} onChange={(e) => set('status', e.target.value as Values['status'])}>
            {LOGISTICS_STATUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description} required className="col-span-2">
          <input {...inputProps('description', errors.description)} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Vendor" htmlFor="vendor" error={errors.vendor} required className="col-span-2">
          <input {...inputProps('vendor', errors.vendor)} value={values.vendor} onChange={(e) => set('vendor', e.target.value)} />
        </Field>
        <Field label="Planned cost (£)" htmlFor="plannedCost" error={errors.plannedCost} required>
          <input type="number" min={0} step={10} {...inputProps('plannedCost', errors.plannedCost)} value={values.plannedCost} onChange={(e) => set('plannedCost', e.target.value)} />
        </Field>
        <Field label="Actual cost (£)" htmlFor="actualCost" error={errors.actualCost} hint="Leave blank until invoiced">
          <input type="number" min={0} step={10} {...inputProps('actualCost', errors.actualCost)} value={values.actualCost} onChange={(e) => set('actualCost', e.target.value)} />
        </Field>
        <Field label="Due date" htmlFor="dueDate" error={errors.dueDate} required className="col-span-2">
          <input type="date" {...inputProps('dueDate', errors.dueDate)} value={values.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
