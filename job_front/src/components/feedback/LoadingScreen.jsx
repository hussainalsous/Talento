export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin-slow"
          style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--primary)' }}
        />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</p>
      </div>
    </div>
  );
}
