import { NotificationsPage } from '../notifications/NotificationsPage';

export function JobSeekerNotificationsPage() {
  return (
    <NotificationsPage
      breadcrumbs={[{ label: 'Job Seeker' }, { label: 'Notifications' }]}
    />
  );
}
