export const TASK_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  posted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  posted: 'Posted',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const APP_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
};

export const DISPUTE_STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved_refund: 'bg-green-100 text-green-700',
  resolved_release: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
};
