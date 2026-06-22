import { clsx } from 'clsx';

const statusMap = {
  active:       'status-active',
  inactive:     'status-inactive',
  pending:      'status-pending',
  rejected:     'status-rejected',
  approved:     'status-active',
  open:         'status-active',
  closed:       'status-inactive',
  draft:        'status-inactive',
  shortlisted:  'status-info',
  accepted:     'status-active',
  under_review: 'status-pending',
  invited:      'status-info',
  info:         'status-info',
  success:      'status-active',
  warning:      'status-pending',
  danger:       'status-rejected',
};

export function Badge({ children, variant, status, className }) {
  const cls = statusMap[status ?? variant] ?? 'status-inactive';
  return (
    <span className={clsx('status-badge', cls, className)}>
      {children}
    </span>
  );
}
