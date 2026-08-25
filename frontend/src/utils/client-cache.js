/**
 * Lightweight localStorage cache with per-key TTL.
 * Gracefully degrades (no-op) when localStorage is unavailable (private mode, storage full, etc.).
 */

const PREFIX = 'td:'

export const CACHE_TTL = {
  events: 5 * 60 * 1000,   // 5 minutes — events can be added by editors
  tags:   30 * 60 * 1000,  // 30 minutes — tags change rarely
}

export function cache_get(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null

    const { data, expires_at } = JSON.parse(raw)
    if (Date.now() > expires_at) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function cache_set(key, data, ttl) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({
      data,
      expires_at: Date.now() + ttl,
    }))
  } catch {
    // Storage full or unavailable — silently skip caching
  }
}

export function cache_invalidate(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {}
}

export function cache_invalidate_events() {
  cache_invalidate('events:en')
  cache_invalidate('events:ru')
  cache_invalidate('events:en:full')
  cache_invalidate('events:ru:full')
}
