/**
 * Shared localStorage JSON persistence helpers with defensive SSR/quota safety.
 */
export function readJsonStore(key, fallback = []) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return Array.isArray(fallback) ? [...fallback] : fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...fallback];
    }
    return parsed ?? fallback;
  } catch {
    return Array.isArray(fallback) ? [...fallback] : fallback;
  }
}

export function readJsonArrayAllowEmpty(key, fallback = []) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function writeJsonStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota failure or restricted private mode
  }
}

export function readJsonObject(key, fallback = {}) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

export function removeStorageKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage cleanup failure
  }
}

