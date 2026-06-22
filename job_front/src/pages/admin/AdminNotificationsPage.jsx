import { NotificationsPage } from '../notifications/NotificationsPage';

export function AdminNotificationsPage() {
  return (
    <NotificationsPage
      breadcrumbs={[{ label: 'Admin' }, { label: 'Notifications' }]}
    />
  );
}
