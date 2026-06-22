import { Plus, X } from 'lucide-react';

/**
 * A controlled dynamic list input that syncs with useForm via synthetic events.
 * Call onChange with { target: { name, value: string[] } }.
 */
export function DynamicListInput({
  label,
  name,
  value = [],
  onChange,
  placeholder = 'Add item…',
  error,
  required,
}) {
  const items = Array.isArray(value) ? value : value ? [value] : [];

  const emit = (next) => onChange({ target: { name, value: next } });

  const add    = ()          => emit([...items, '']);
  const remove = (idx)       => emit(items.filter((_, i) => i !== idx));
  const update = (idx, val)  => {
    const next = [...items];
    next[idx] = val;
    emit(next);
  };

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span style={{ color: 'var(--clr-danger-a10)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="form-input flex-1"
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="btn btn-ghost btn-icon"
              title="Remove"
              style={{ color: 'var(--clr-danger-a10)', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--primary)' }}
        >
          <Plus size={14} />
          <span style={{ marginLeft: 4 }}>Add item</span>
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
