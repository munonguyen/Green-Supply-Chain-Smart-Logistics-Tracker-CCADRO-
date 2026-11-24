import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

describe('authentication token refresh', () => {
  let originalStorage;

  beforeEach(() => {
    originalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const values = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        clear: () => values.clear()
      }
    });
    window.localStorage.setItem('ccadro_token', 'old-access-token');
    window.localStorage.setItem('ccadro_refresh_token', 'old-refresh-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    if (originalStorage) {
      Object.defineProperty(window, 'localStorage', originalStorage);
    } else {
      delete window.localStorage;
    }
  });

  it('shares one rotation between simultaneous refresh callers', async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal('fetch', fetchMock);

    const first = api.refreshToken('old-refresh-token');
    const second = api.refreshToken('old-refresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse({
      result: { token: 'new-access-token', refreshToken: 'new-refresh-token' }
    }));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.token).toBe('new-access-token');
    expect(secondResult.token).toBe('new-access-token');
    expect(window.localStorage.getItem('ccadro_token')).toBe('new-access-token');
    expect(window.localStorage.getItem('ccadro_refresh_token')).toBe('new-refresh-token');
  });

  it('keeps the stored session when refresh fails temporarily', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'temporarily unavailable' }, 503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.getUsers()).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem('ccadro_token')).toBe('old-access-token');
    expect(window.localStorage.getItem('ccadro_refresh_token')).toBe('old-refresh-token');
  });
});
