import { useCallback } from 'react';
import { Users, ClipboardList, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../api/adminApi';
import { useFetch } from '../../hooks/useFetch';
import { StatCard } from '../../components/layout/StatCard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/feedback/ErrorState';
import { formatDate, extractPagination } from '../../utils/formatters';
import { getUserDisplayName } from '../../app/useAuthStore';

/**
 * The backend has no /admin/dashboard endpoint.
 * We compose the dashboard from real endpoints:
 *   GET /admin/users              → total users + recent list
 *   GET /admin/company-registration-requests (status=pending) → pending count
 *   GET /courses                  → course count
 */
export function AdminDashboardPage() {
  const { t } = useTranslation();
  const fetchUsers    = useCallback(() => adminApi.getUsers({ per_page: 5 }), []);
  const fetchPending  = useCallback(() => adminApi.getCompanyRequests({ status: 'pending', per_page: 5 }), []);
  const fetchCourses  = useCallback(() => adminApi.getCourses({ per_page: 1 }), []);

  const { data: usersData,   loading: usersLoading,   error: usersError,   refetch: refetchUsers }   = useFetch(fetchUsers);
  const { data: pendingData, loading: pendingLoading, error: pendingError, refetch: refetchPending } = useFetch(fetchPending);
  const { data: coursesData, loading: coursesLoading                                               } = useFetch(fetchCourses);

  const { data: recentUsers, pagination: usersMeta }    = extractPagination(usersData);
  const { data: pendingReqs, pagination: pendingMeta }  = extractPagination(pendingData);
  const coursesTotal = coursesData?.meta?.total ?? coursesData?.data?.meta?.total ?? 0;

  const hasError = usersError || pendingError;
  if (hasError) return <ErrorState message={usersError || pendingError} onRetry={() => { refetchUsers(); refetchPending(); }} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('adminDashboard.title')}
        subtitle={t('adminDashboard.subtitle')}
        breadcrumbs={[{ label: t('adminDashboard.breadAdmin') }, { label: t('adminDashboard.breadDashboard') }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label={t('adminDashboard.totalUsers')}
          value={usersMeta?.total}
          icon={Users}
          loading={usersLoading}
          color={{ bg: 'var(--primary-light)', icon: 'var(--primary)' }}
        />
        <StatCard
          label={t('adminDashboard.pendingRequests')}
          value={pendingMeta?.total}
          icon={ClipboardList}
          loading={pendingLoading}
          color={{ bg: 'var(--status-pending-bg)', icon: 'var(--status-pending-text)' }}
        />
        <StatCard
          label={t('adminDashboard.availableCourses')}
          value={coursesTotal || undefined}
          icon={BookOpen}
          loading={coursesLoading}
          color={{ bg: 'var(--status-active-bg)', icon: 'var(--status-active-text)' }}
        />
      </div>

      {/* Recent sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Company Requests */}
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('adminDashboard.pendingCompanyRequests')}</h3>
            <a href="/admin/company-requests" className="text-sm" style={{ color: 'var(--primary)' }}>{t('common.viewAll')}</a>
          </div>
          <div>
            {pendingLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="skeleton h-4 flex-1 rounded" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                ))
              : pendingReqs.length === 0
              ? <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{t('adminDashboard.noPendingRequests')}</p>
              : pendingReqs.map((req) => (
                  <div
                    key={req.id}
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {req.company_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {req.requester_first_name} {req.requester_last_name} · {formatDate(req.created_at)}
                      </p>
                    </div>
                    <Badge status={req.status}>{req.status}</Badge>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Recent Users */}
        <div className="card">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('adminDashboard.recentUsers')}</h3>
            <a href="/admin/users" className="text-sm" style={{ color: 'var(--primary)' }}>{t('common.viewAll')}</a>
          </div>
          <div>
            {usersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="skeleton w-8 h-8 rounded-full" />
                    <div className="skeleton h-4 flex-1 rounded" />
                  </div>
                ))
              : recentUsers.length === 0
              ? <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{t('adminDashboard.noUsersYet')}</p>
              : recentUsers.map((user) => {
                  const name = getUserDisplayName(user);
                  return (
                    <div
                      key={user.id}
                      className="px-5 py-3 flex items-center justify-between"
                      style={{ borderBottom: '1px solid var(--border-default)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                        >
                          {(name || user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {name || user.email}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {user.role?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Badge status={user.is_active ? 'active' : 'inactive'}>
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
