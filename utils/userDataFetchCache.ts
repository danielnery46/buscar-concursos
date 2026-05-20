/**
 * Module-level cache for the `user_data` row.
 *
 * On login, both UserDataContext (select *) and SettingsContext
 * (select theme, accessibility_settings) independently query the same row.
 * This tiny cache lets the second context reuse the data already fetched by
 * the first, eliminating one redundant round-trip per login.
 *
 * TTL is intentionally short (60 s) — just enough to cover the parallel
 * React context initialisation that happens right after auth resolves.
 */

type UserDataRow = Record<string, unknown> | null;

interface CacheEntry {
    userId: string;
    data: UserDataRow;
    timestamp: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

let _entry: CacheEntry | null = null;

/** Returns the cached row if it belongs to `userId` and is still fresh. */
export function getUserDataCache(userId: string): UserDataRow | undefined {
    if (!_entry) return undefined;
    if (_entry.userId !== userId) return undefined;
    if (Date.now() - _entry.timestamp > CACHE_TTL_MS) {
        _entry = null;
        return undefined;
    }
    return _entry.data;
}

/** Store (or overwrite) a fetched row for `userId`. */
export function setUserDataCache(userId: string, data: UserDataRow): void {
    _entry = { userId, data, timestamp: Date.now() };
}

/** Evict the cache (e.g. on logout). */
export function clearUserDataCache(): void {
    _entry = null;
}
