import { useState, useCallback } from 'react';
import { ExternalLink, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyApi } from '../../api/companyApi';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { extractPagination } from '../../utils/formatters';
import { Pagination } from '../../components/ui/Pagination';

const LEVEL_BADGE_STATUS = {
  beginner:     'success',
  intermediate: 'info',
  advanced:     'warning',
};

export function CompanyCoursesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const fetchFn = useCallback(
    () => companyApi.getCourses({ search: debouncedSearch, page }),
    [debouncedSearch, page],
  );
  const { data, loading, error, refetch } = useFetch(fetchFn, { deps: [debouncedSearch, page] });
  const { data: courses, pagination } = extractPagination(data);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('companyCourses.title')}
        subtitle={t('companyCourses.subtitle')}
        breadcrumbs={[{ label: t('companyDashboard.breadCompany') }, { label: t('companyCourses.breadCourses') }]}
      />

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('companyCourses.searchPlaceholder')} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-32 rounded-lg" />
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-10 rounded" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState icon={BookOpen} title={t('companyCourses.emptyTitle')} description={t('companyCourses.emptyDesc')} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="card flex flex-col hover:shadow-md transition-shadow overflow-hidden">
                {/* Course image */}
                {course.course_image_url && (
                  <img
                    src={course.course_image_url}
                    alt={course.title}
                    className="w-full object-cover"
                    style={{ height: 140 }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{course.title}</h3>
                      {course.level && (
                        <Badge status={LEVEL_BADGE_STATUS[course.level] ?? 'info'} className="shrink-0 capitalize">
                          {course.level}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{course.provider}</p>
                  </div>

                  {course.description && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {course.description.length > 100
                        ? `${course.description.slice(0, 100)}…`
                        : course.description}
                    </p>
                  )}

                  {/* Learning materials */}
                  {Array.isArray(course.learning_material) && course.learning_material.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                        What you'll learn
                      </p>
                      <ul className="space-y-0.5">
                        {course.learning_material.slice(0, 4).map((item, i) => (
                          <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                        {course.learning_material.length > 4 && (
                          <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            +{course.learning_material.length - 4} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {course.link && (
                    <a
                      href={course.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'var(--primary)' }}
                    >
                      <ExternalLink size={14} /> {t('companyCourses.viewCourse')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="flex justify-center">
              <Pagination currentPage={pagination.current_page} lastPage={pagination.last_page} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
