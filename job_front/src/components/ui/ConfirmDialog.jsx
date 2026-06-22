import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}) {
  const { t } = useTranslation();
  const resolvedTitle   = title         ?? t('confirmDialog.title');
  const resolvedMessage = message       ?? t('confirmDialog.message');
  const resolvedConfirm = confirmLabel  ?? t('confirmDialog.confirm');
  const resolvedCancel  = cancelLabel   ?? t('confirmDialog.cancel');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {resolvedCancel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {resolvedConfirm}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--status-rejected-bg)' }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--clr-danger-a10)' }} />
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 8 }}>
          {resolvedMessage}
        </p>
      </div>
    </Modal>
  );
}
