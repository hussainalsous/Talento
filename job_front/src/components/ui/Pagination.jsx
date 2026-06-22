import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ currentPage, lastPage, onPageChange, className }) {
  if (!lastPage || lastPage <= 1) return null;

  const pages = buildPageList(currentPage, lastPage);

  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      <PageBtn
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </PageBtn>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2" style={{ color: 'var(--text-muted)' }}>
            …
          </span>
        ) : (
          <PageBtn
            key={p}
            onClick={() => onPageChange(p)}
            active={p === currentPage}
          >
            {p}
          </PageBtn>
        ),
      )}

      <PageBtn
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === lastPage}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </PageBtn>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active, ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
      style={{
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        border: active ? 'none' : '1px solid var(--border-default)',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function buildPageList(current, last) {
  const delta = 2;
  const range = [];
  const result = [];
  let l;

  for (let i = Math.max(2, current - delta); i <= Math.min(last - 1, current + delta); i++) {
    range.push(i);
  }

  if (current - delta > 2) range.unshift('...');
  if (current + delta < last - 1) range.push('...');

  range.unshift(1);
  if (last > 1) range.push(last);

  // deduplicate
  for (const i of range) {
    if (l) {
      if (i === '...' && l === '...') continue;
    }
    result.push(i);
    l = i;
  }
  return result;
}
