import { NotificationsPage } from '../notifications/NotificationsPage';

export function CompanyNotificationsPage() {
  return (
    <NotificationsPage
      breadcrumbs={[{ label: 'Company' }, { label: 'Notifications' }]}
    />
  );
}
