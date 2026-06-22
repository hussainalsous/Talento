import { clsx } from 'clsx';

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const sizes = {
  sm:  { width: 32, height: 32, fontSize: 12 },
  md:  { width: 40, height: 40, fontSize: 14 },
  lg:  { width: 56, height: 56, fontSize: 18 },
  xl:  { width: 80, height: 80, fontSize: 24 },
};

export function Avatar({ src, name, size = 'md', className }) {
  const dim = sizes[size];
  const initials = getInitials(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('rounded-full object-cover', className)}
        style={{ width: dim.width, height: dim.height }}
      />
    );
  }

  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-semibold flex-shrink-0', className)}
      style={{
        width: dim.width,
        height: dim.height,
        fontSize: dim.fontSize,
        background: 'var(--primary-light)',
        color: 'var(--primary)',
      }}
    >
      {initials || '?'}
    </div>
  );
}
