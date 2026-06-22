import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState }  from '../feedback/EmptyState';
import { ErrorState }  from '../feedback/ErrorState';
import { Pagination }  from '../ui/Pagination';

/**
 * columns: [{ key, label, render, width, align }]
 * data:    array of row objects
 */
export function DataTable({
  columns,
  data,
  loading,
  error,
  onRetry,
  pagination,
  onPageChange,
  emptyTitle,
  emptyDescription,
  emptyAction,
  keyField = 'id',
  debugLabel,
}) {
  // [DEBUG] Render counter — gated on debugLabel, remove when verified
  const renderCount = useRef(0);
  renderCount.current += 1;
  const { t } = useTranslation();

  if (debugLabel) {
    console.log(
      `%c[DataTable:${debugLabel}] render #${renderCount.current} | rows = ${data?.length ?? 0}`,
      'color: #e67e22; font-weight: bold;',
    );
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto" style={{ borderRadius: 12 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-semibold"
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: col.width,
                    textAlign: col.align || 'left',
                    background: 'var(--bg-hover)',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} columns={columns} />
                ))
              : data.map((row) => (
                  <tr
                    key={row[keyField]}
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3"
                        style={{ color: 'var(--text-primary)', textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Empty state (not loading) */}
      {!loading && !error && data.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('table.results', { from: pagination.from, to: pagination.to, total: pagination.total })}
          </span>
          <Pagination
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

function SkeletonRow({ columns }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: '80%' }} />
        </td>
      ))}
    </tr>
  );
}
