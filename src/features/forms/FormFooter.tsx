export function FormFooter({
  onCancel,
  submitting,
  submitLabel,
  formId,
  onDelete,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
  formId: string;
  onDelete?: () => void;
}) {
  return (
    <>
      {onDelete && (
        <button type="button" className="btn-danger mr-auto" onClick={onDelete}>
          Delete
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" form={formId} className="btn-primary" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </>
  );
}

export function SubmitError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {message}
    </p>
  );
}
