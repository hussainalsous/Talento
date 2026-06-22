import { Search, X } from 'lucide-react';
import { useRef } from 'react';

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  const ref = useRef(null);

  return (
    <div className={`relative ${className || ''}`} style={{ minWidth: 200 }}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-muted)' }}
      />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-9 pr-9"
        style={{ minWidth: 220 }}
      />
      {value && (
        <button
          onClick={() => { onChange(''); ref.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
