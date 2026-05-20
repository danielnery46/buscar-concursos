/**
 * Simple in-memory TTL cache for Supabase query results.
 *
 * Prevents redundant round-trips for identical queries issued within the TTL
 * window. Common scenarios eliminated:
 *   - Opening a result card and pressing back  → same criteria still mounted
 *   - Switching tabs and returning            → hook re-fires with same inputs
 *   - Summary re-computation on page changes  → criteria unchanged, free hit
 */

const DEFAULT_TTL_MS = 3 * 60 * 1_000; // 3 minutes

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class QueryCache {
    private readonly store = new Map<string, CacheEntry<unknown>>();

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    /**
     * Remove all entries whose key starts with `prefix`.
     * Omit `prefix` to wipe the entire cache.
     */
    invalidate(prefix?: string): void {
        if (!prefix) {
            this.store.clear();
            return;
        }
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    /** Evict stale entries to reclaim memory (optional, call on idle). */
    prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }
}

/** Singleton shared across all service calls in this session. */
export const queryCache = new QueryCache();

/**
 * Build a deterministic, human-readable cache key from an arbitrary list of
 * serialisable values. Each part is JSON-stringified and joined with `|` so
 * that objects with the same structure always produce the same key.
 */
export function buildCacheKey(...parts: unknown[]): string {
    return parts.map(p => JSON.stringify(p)).join('|');
}
