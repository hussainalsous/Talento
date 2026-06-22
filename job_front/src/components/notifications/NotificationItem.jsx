import { useEffect, useState } from 'react';
import {
  Bell, Building2, CheckCircle, XCircle,
  FileText, RefreshCw, Mail, Info, Trash2, Check,
  Heart, BookOpen, UserMinus, UserPlus, Briefcase,
  KeyRound, ShieldCheck, ShieldOff, UserCog, Settings, FileMinus, CreditCard,
} from 'lucide-react';

// DB stores TIMESTAMP without timezone — force UTC parsing by appending 'Z'
// when no timezone offset is already present (avoids +3h shift for UTC+3 users)
function parseUtc(str) {
  if (!str) return new Date(NaN);
  const s = str.trim().replace(' ', 'T');
  return new Date(s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s) ? s : s + 'Z');
}

function timeAgo(dateString) {
  const date = parseUtc(dateString);
  if (!dateString || isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  // Use local calendar days for day-relative labels
  const now = new Date();
  const todayMidnight  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const notifMidnight  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((todayMidnight - notifMidnight) / 86400000);

  const localTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (dayDiff === 1) return `Yesterday, ${localTime}`;
  if (dayDiff < 7)  return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${localTime}`;
  if (dayDiff < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullDateTime(dateString) {
  const date = parseUtc(dateString);
  if (!dateString || isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const TYPE_CONFIG = {
  company_registration_request: { icon: Building2,   color: 'var(--primary)' },
  company_approved:             { icon: CheckCircle, color: 'var(--clr-success-a0)' },
  company_rejected:             { icon: XCircle,     color: 'var(--clr-danger-a10)' },
  new_application:              { icon: FileText,    color: 'var(--primary)' },
  application_status_update:    { icon: RefreshCw,   color: 'var(--clr-warning-a0)' },
  application_withdrawn:        { icon: XCircle,     color: 'var(--clr-danger-a10)' },
  invitation_received:          { icon: Mail,        color: '#8b5cf6' },
  invitation_responded:         { icon: Mail,        color: '#8b5cf6' },
  member_added:                 { icon: UserPlus,    color: 'var(--clr-success-a0)' },
  member_removed:               { icon: UserMinus,   color: 'var(--clr-danger-a10)' },
  job_post_updated:             { icon: Briefcase,   color: 'var(--clr-warning-a0)' },
  job_post_deleted:             { icon: Briefcase,   color: 'var(--clr-danger-a10)' },
  job_saved:                    { icon: Heart,       color: '#ec4899' },
  cv_analyzed:                  { icon: BookOpen,    color: 'var(--clr-success-a0)' },
  cv_deleted_by_admin:          { icon: FileMinus,   color: 'var(--clr-danger-a10)' },
  welcome:                      { icon: Bell,        color: 'var(--primary)' },
  password_changed:             { icon: KeyRound,    color: 'var(--clr-warning-a0)' },
  account_activated:            { icon: ShieldCheck, color: 'var(--clr-success-a0)' },
  account_deactivated:          { icon: ShieldOff,   color: 'var(--clr-danger-a10)' },
  admin_account_created:        { icon: UserCog,     color: 'var(--primary)' },
  admin_permissions_updated:    { icon: Settings,    color: 'var(--clr-warning-a0)' },
  subscription_assigned:        { icon: CreditCard,  color: 'var(--clr-success-a0)' },
  company_profile_updated:      { icon: Building2,   color: 'var(--text-secondary)' },
  company_logo_updated:         { icon: Building2,   color: 'var(--text-secondary)' },
  member_updated:               { icon: UserCog,     color: 'var(--clr-warning-a0)' },
  job_post_created:             { icon: Briefcase,   color: 'var(--clr-success-a0)' },
  profile_updated:              { icon: UserCog,     color: 'var(--text-secondary)' },
  privacy_updated:              { icon: Info,        color: 'var(--text-secondary)' },
  skills_updated:               { icon: CheckCircle, color: 'var(--clr-success-a0)' },
  cv_uploaded:                  { icon: FileText,    color: 'var(--clr-success-a0)' },
  cv_updated:                   { icon: FileText,    color: 'var(--clr-warning-a0)' },
  cv_deleted:                   { icon: FileMinus,   color: 'var(--clr-danger-a10)' },
  application_withdrawn_company:{ icon: XCircle,     color: 'var(--clr-danger-a10)' },
  job_unsaved:                  { icon: Heart,       color: 'var(--text-muted)' },
  system:                       { icon: Info,        color: 'var(--text-secondary)' },
};

export function NotificationItem({ notification, onClick, onMarkAsRead, onDelete }) {
  // Tick every 60 s so the relative time stays current while the panel is open
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const cfg  = TYPE_CONFIG[notification.data?.type] ?? { icon: Bell, color: 'var(--text-secondary)' };
  const Icon = cfg.icon;

  const handleMarkRead = (e) => { e.stopPropagation(); onMarkAsRead?.(); };
  const handleDelete   = (e) => { e.stopPropagation(); onDelete?.(); };

  return (
    <div
      onClick={onClick}
      className="flex gap-3 px-4 py-3 cursor-pointer transition-colors group"
      style={{
        background:   notification.is_read ? 'transparent' : 'var(--primary-light)',
        borderBottom: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = notification.is_read ? 'transparent' : 'var(--primary-light)'; }}
    >
      {/* Type icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: 'var(--bg-page)' }}
      >
        <Icon size={15} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
            {notification.title}
            {!notification.is_read && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 mb-0.5"
                style={{ background: 'var(--primary)', verticalAlign: 'middle' }}
              />
            )}
          </p>
          <span
            className="text-[11px] shrink-0 mt-0.5"
            style={{ color: 'var(--text-muted)' }}
            title={fullDateTime(notification.created_at)}
          >
            {timeAgo(notification.created_at)}
          </span>
        </div>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {notification.message}
        </p>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <button
            onClick={handleMarkRead}
            title="Mark as read"
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            <Check size={11} />
          </button>
        )}
        <button
          onClick={handleDelete}
          title="Delete"
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--clr-danger-a10)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--status-rejected-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
