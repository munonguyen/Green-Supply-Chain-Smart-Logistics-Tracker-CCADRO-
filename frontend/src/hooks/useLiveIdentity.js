import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const roleOrder = ['ADMIN', 'HUB_MANAGER', 'DISPATCHER', 'SAFETY_MANAGER', 'ESG_AUDITOR', 'DRIVER', 'HUB_AUDITOR', 'HUB_SHIPPER', 'SHIPPER', 'CUSTOMER'];
const unwrap = (response) => {
  if (!response || (response.code !== undefined && response.code !== 1000) || !response.result) {
    throw new Error(response?.message || 'Máy chủ chưa xác nhận thao tác.');
  }
  return response.result;
};
export function identityProfile(record, templates = {}) {
  const names = (record.roles || []).map((r) => typeof r === 'string' ? r : r.name);
  const role = roleOrder.find((r) => names.includes(r)) || record.role || 'CUSTOMER';
  const permissions = record.permissions || [...new Set((record.roles || []).flatMap((r) =>
    typeof r === 'string' ? [] : (r.permissions || []).map((p) => typeof p === 'string' ? p : p.name)))];
  return {
    ...templates[role], ...record,
    userId: record.id || record.userId,
    role, permissions,
    fullName: record.fullName || [record.lastName, record.firstName].filter(Boolean).join(' ') || record.username,
    phone: record.phoneNumber ?? record.phone ?? '',
    companyCode: record.customerId || record.companyCode,
    portalType: role === 'CUSTOMER' ? 'CUSTOMER' : ['HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER'].includes(role) ? 'SHIPPER' : 'INTERNAL',
    locked: record.status !== 'ACTIVE' || (record.lockedUntil && new Date(record.lockedUntil) > new Date()),
    isRootAdmin: record.username === 'admin',
    isSystemSeed: record.username === 'admin'
  };
}

/** Live IAM is server authoritative. Local storage contains only the current session, never a directory. */
export function useLiveIdentity({ user, token, setUser, setToken, setAuthMode, templates, enabled }) {
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const currentUser = useRef(user);
  currentUser.current = user;
  const session = useRef(token);
  session.current = token;

  const refresh = useCallback(async () => {
    const expected = session.current;
    const epoch = ++generation.current;
    if (!expected || currentUser.current?.role !== 'ADMIN') return;
    setLoading(true); setError('');
    try {
      const results = await Promise.all([api.getUsers({ includeDeleted: true }), api.getCompanies({ includeDeleted: true }), api.getRoles(), api.getPermissions()]);
      if (generation.current !== epoch || session.current !== expected) return;
      const [users, businesses, roleList, permissionList] = results.map(unwrap);
      setAccounts(users.map((u) => identityProfile(u, templates)));
      setCompanies(businesses); setRoles(roleList); setPermissions(permissionList);
    } catch (e) {
      if (generation.current === epoch && session.current === expected) setError(e.message);
      throw e;
    } finally { if (generation.current === epoch) setLoading(false); }
  }, [templates]);

  useEffect(() => {
    const genRef = generation;
    ++genRef.current;
    setAccounts([]); setCompanies([]); setRoles([]); setPermissions([]); setError('');
    if (enabled && user?.role === 'ADMIN' && token) refresh().catch(() => {});
    return () => { ++genRef.current; };
  }, [enabled, user?.username, user?.role, token, refresh]);

  function saveSession(profile, auth) {
    window.localStorage.setItem('ccadro_token', auth.token);
    if (auth.refreshToken) window.localStorage.setItem('ccadro_refresh_token', auth.refreshToken);
    else window.localStorage.removeItem('ccadro_refresh_token');
    window.localStorage.setItem('ccadro_user', JSON.stringify(profile));
    setUser(profile); setToken(auth.token); setAuthMode('SERVER_AUTHENTICATED');
    session.current = auth.token;
    return { success: true, user: profile, token: auth.token };
  }
  async function authenticate(username, password) {
    const auth = unwrap(await api.login(username.trim(), password));
    if (!auth.token) throw new Error('Máy chủ chưa cấp phiên đăng nhập.');
    const profile = unwrap(await api.getOwnProfile(auth.token));
    return saveSession(identityProfile(profile, templates), auth);
  }
  async function register(payload) {
    const parts = payload.fullName?.trim().split(/\s+/) || [];
    const auth = unwrap(await api.registerCustomer({ ...payload, firstName: parts.at(-1), lastName: parts.slice(0, -1).join(' ') }));
    const profile = unwrap(await api.getOwnProfile(auth.token));
    return saveSession(identityProfile(profile, templates), auth);
  }
  function requireAdmin() {
    if (currentUser.current?.role !== 'ADMIN') throw new Error('Chỉ quản trị viên được thực hiện thao tác này.');
  }
  function target(username) {
    requireAdmin();
    const found = accounts.find((a) => a.username === username);
    if (!found?.userId) throw new Error('Chưa tải được hồ sơ tài khoản từ máy chủ. Hãy tải lại danh sách.');
    return found;
  }
  async function commitUser(request) {
    const expected = session.current;
    const saved = identityProfile(unwrap(await request()), templates);
    if (session.current !== expected) throw new Error('Phiên đăng nhập đã thay đổi.');
    setAccounts((list) => list.some((a) => a.userId === saved.userId) ? list.map((a) => a.userId === saved.userId ? saved : a) : [...list, saved]);
    if (currentUser.current?.username === saved.username) {
      setUser(saved); window.localStorage.setItem('ccadro_user', JSON.stringify(saved));
    }
    return saved;
  }
  async function createAccount(payload) {
    requireAdmin();
    const parts = payload.fullName.trim().split(/\s+/);
    const company = companies.find((c) => c.id === payload.companyId);
    return commitUser(() => api.createUser({ ...payload, firstName: parts.pop(), lastName: parts.join(' '), phoneNumber: payload.phone,
      companyId: payload.companyId || undefined, customerId: company?.companyCode || payload.customerId || undefined, roles: [payload.role] }));
  }
  async function updateAccount(username, changes) {
    const found = target(username);
    if (changes.permissions && !changes.role) throw new Error('Quyền được kế thừa từ vai trò. Hãy chọn vai trò để thay đổi quyền.');
    const parts = changes.fullName?.trim().split(/\s+/);
    return commitUser(() => api.updateUser(found.userId, { ...changes, permissions: undefined, role: undefined,
      firstName: parts?.at(-1), lastName: parts ? parts.slice(0, -1).join(' ') : undefined, phoneNumber: changes.phone,
      companyId: changes.companyId || undefined, roles: changes.role ? [changes.role] : undefined }));
  }
  async function userAction(username, action, ...args) {
    const found = target(username);
    return commitUser(() => action(found.userId, ...args));
  }
  async function companyAction(action, ...args) {
    requireAdmin();
    const expected = session.current;
    const saved = unwrap(await action(...args));
    if (session.current !== expected) throw new Error('Phiên đăng nhập đã thay đổi.');
    setCompanies((list) => list.some((c) => c.id === saved.id) ? list.map((c) => c.id === saved.id ? saved : c) : [...list, saved]);
    return saved;
  }
  return { accounts, companies, roles, permissions, loading, error, refresh, authenticate, register, createAccount, updateAccount,
    updateOwnProfile: (data) => commitUser(() => api.updateOwnProfile(data)),
    unlockAccount: (name) => userAction(name, api.unlockUser),
    resetPassword: (name, password) => userAction(name, api.resetUserPassword, password),
    deleteAccount: (name) => userAction(name, api.softDeleteUser),
    restoreAccount: (name) => userAction(name, api.restoreUser),
    createCompany: (payload) => companyAction(api.createCompany, payload),
    updateCompany: (id, payload) => companyAction(api.updateCompany, id, payload),
    deleteCompany: (id) => companyAction(api.softDeleteCompany, id),
    restoreCompany: (id) => companyAction(api.restoreCompany, id) };
}
