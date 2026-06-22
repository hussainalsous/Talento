import { create } from 'zustand';
import { authApi } from '../api/authApi';

// Module-level guard: prevents concurrent logout() calls from racing each other.
// This collapses multiple simultaneous invocations (e.g. from event re-dispatch) into one.
let _loggingOut = false;

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

/**
 * Derive a display name from the UserResource shape.
 *
 * UserResource fields: id, email, phone, role, is_active, created_at
 *   + nested: admin { first_name, last_name, ... }
 *             company_member { full_name, first_name, last_name, role_in_company }
 *             job_seeker { full_name, first_name, last_name }
 *
 * There is NO top-level `name` field on the user resource.
 */
export function getUserDisplayName(user) {
  if (!user) return '';
  if (user.company_member?.full_name)  return user.company_member.full_name;
  if (user.admin?.first_name)          return `${user.admin.first_name} ${user.admin.last_name || ''}`.trim();
  if (user.job_seeker?.full_name)      return user.job_seeker.full_name;
  return user.email || '';
}

/**
 * Derive user initials from the display name.
 */
export function getUserInitials(user) {
  const name = getUserDisplayName(user);
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

export const useAuthStore = create((set, get) => ({
  token:           localStorage.getItem(TOKEN_KEY) || null,
  user:            JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  loading:         false,
  initializing:    true,

  /* ── Login ───────────────────────────────────────────── */
  login: async (credentials) => {
    console.log('[AUTH] login called');
    set({ loading: true });
    try {
      const res = await authApi.login(credentials);
      // Response shape: { success, data: { user, token } }
      const payload = res.data?.data ?? res.data;
      const { token, user } = payload;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ token, user, isAuthenticated: true, loading: false });
      console.log('[AUTH] login success — userId:', user?.id, 'role:', user?.role);
      return { success: true, user };
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err };
    }
  },

  /* ── Logout ──────────────────────────────────────────── */
  logout: async () => {
    if (_loggingOut) { console.log('[AUTH] logout called — already in progress, skipping'); return; }
    _loggingOut = true;
    console.log('[AUTH] logout start — userId:', get().user?.id, 'role:', get().user?.role);
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
    _loggingOut = false;
    console.log('[AUTH] logout finish');
  },

  /* ── Restore session (called on app mount) ────────────── */
  fetchMe: async () => {
    console.log('[AUTH] fetchMe called');
    if (!get().token) {
      set({ initializing: false });
      return;
    }
    try {
      const res  = await authApi.me();
      // Response shape: { success, data: UserResource }
      const user = res.data?.data ?? res.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, initializing: false });
      console.log('[AUTH] fetchMe success — userId:', user?.id, 'role:', user?.role);
    } catch (_) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false, initializing: false });
    }
  },

  /* ── Set auth from external source (e.g. registration) ── */
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  /* ── Update user in store + localStorage ─────────────── */
  updateUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  /* ── Role helpers ────────────────────────────────────── */
  getRole: () => get().user?.role ?? null,

  hasRole: (roles) => {
    const role = get().user?.role;
    if (!role) return false;
    const list = Array.isArray(roles) ? roles : [roles];
    return list.includes(role);
  },

  isAdmin:         () => get().hasRole(['admin', 'super_admin']),
  isCompanyOwner:  () => get().hasRole('company_owner'),
  isCompanyMember: () => get().hasRole('company_member'),
  isCompanyUser:   () => get().hasRole(['company_owner', 'company_member']),
  isJobSeeker:     () => get().hasRole('job_seeker'),
}));
