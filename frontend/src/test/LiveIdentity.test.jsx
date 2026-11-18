import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useLiveIdentity } from '../hooks/useLiveIdentity';
import { api } from '../services/api';
const templates = {};
const admin = { username: 'admin', role: 'ADMIN' };
const record = { id: 'server-id', username: 'server-only', status: 'ACTIVE', roles: [{ name: 'DISPATCHER', permissions: [{name:'SHIPMENT_READ'}] }] };
const ok = (result) => ({code:1000,result});
beforeEach(() => {
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});
  vi.spyOn(api,'getUsers').mockResolvedValue(ok([record]));
  vi.spyOn(api,'getCompanies').mockResolvedValue(ok([]));
  vi.spyOn(api,'getRoles').mockResolvedValue(ok([]));
  vi.spyOn(api,'getPermissions').mockResolvedValue(ok([]));
});
afterEach(()=>vi.restoreAllMocks());
function hook() { return renderHook(()=>useLiveIdentity({user:admin,token:'session',setUser:vi.fn(),setToken:vi.fn(),setAuthMode:vi.fn(),templates,enabled:true})); }
it('authenticates a backend-only user without a seed directory',async()=>{
  vi.spyOn(api,'login').mockResolvedValue(ok({token:'real',refreshToken:'refresh'}));
  vi.spyOn(api,'getOwnProfile').mockResolvedValue(ok(record));
  const {result}=hook();
  let logged;
  await act(async()=>{logged=await result.current.authenticate('server-only','password')});
  expect(api.login).toHaveBeenCalledWith('server-only','password');
  expect(logged.user.userId).toBe('server-id');
  expect(logged.user.permissions).toEqual(['SHIPMENT_READ']);
});
it('never creates a local account when the server fails; uses the returned ID on success',async()=>{
  const create=vi.spyOn(api,'createUser').mockRejectedValue(new Error('storage unavailable'));
  const {result}=hook();await waitFor(()=>expect(result.current.accounts).toHaveLength(1));
  await act(async()=>{await expect(result.current.createAccount({username:'new',fullName:'New User',role:'DRIVER'})).rejects.toThrow('storage unavailable')});
  expect(result.current.accounts).toHaveLength(1);
  create.mockResolvedValue(ok({...record,id:'returned-id',username:'new'}));
  await act(async()=>{await result.current.createAccount({username:'new',fullName:'New User',role:'DRIVER'})});
  expect(result.current.accounts.find(a=>a.username==='new').userId).toBe('returned-id');
});
it('persists a changed role and leaves the original record unchanged on failure',async()=>{
  const update=vi.spyOn(api,'updateUser').mockRejectedValue(new Error('rejected'));
  const {result}=hook();await waitFor(()=>expect(result.current.accounts).toHaveLength(1));
  await act(async()=>{await expect(result.current.updateAccount('server-only',{role:'DRIVER'})).rejects.toThrow('rejected')});
  expect(update).toHaveBeenCalledWith('server-id',expect.objectContaining({roles:['DRIVER']}));
  expect(result.current.accounts[0].role).toBe('DISPATCHER');
});
it('accepts an empty server response instead of retaining stale accounts',async()=>{
  const {result}=hook();await waitFor(()=>expect(result.current.accounts).toHaveLength(1));
  api.getUsers.mockResolvedValue(ok([]));
  await act(async()=>{await result.current.refresh()});
  expect(result.current.accounts).toEqual([]);
});
