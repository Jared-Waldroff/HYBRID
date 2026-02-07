import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface CacheConfig {
    ttlMinutes: number;
}

const DEFAULT_TTL_MINUTES = 15;

/**
 * Get cached data if it exists and is not expired
 */
export async function getCached<T>(key: string, ttlMinutes: number = DEFAULT_TTL_MINUTES): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);
        const ageMinutes = (Date.now() - entry.timestamp) / (1000 * 60);

        if (ageMinutes > ttlMinutes) {
            // Cache expired, but still return stale data for instant display
            // The calling hook can refresh in background
            return entry.data;
        }

        return entry.data;
    } catch (err) {
        console.warn(`Cache read error for ${key}:`, err);
        return null;
    }
}

/**
 * Check if cache is expired (but data may still exist)
 */
export async function isCacheExpired(key: string, ttlMinutes: number = DEFAULT_TTL_MINUTES): Promise<boolean> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return true;

        const entry = JSON.parse(raw);
        const ageMinutes = (Date.now() - entry.timestamp) / (1000 * 60);
        return ageMinutes > ttlMinutes;
    } catch {
        return true;
    }
}

/**
 * Store data in cache with timestamp
 */
export async function setCache<T>(key: string, data: T): Promise<void> {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
        console.warn(`Cache write error for ${key}:`, err);
    }
}

/**
 * Clear a specific cache key
 */
export async function clearCache(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (err) {
        console.warn(`Cache clear error for ${key}:`, err);
    }
}

/**
 * Clear all caches matching a prefix (e.g., clear all user-specific caches on logout)
 */
export async function clearCachesByPrefix(prefix: string): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const matchingKeys = allKeys.filter(key => key.startsWith(prefix));
        if (matchingKeys.length > 0) {
            await AsyncStorage.multiRemove(matchingKeys);
        }
    } catch (err) {
        console.warn(`Cache clear by prefix error for ${prefix}:`, err);
    }
}

// Cache key generators for consistency
export const CacheKeys = {
    workouts: (userId: string) => `cached_workouts_${userId}`,
    squad: (userId: string) => `cached_squad_${userId}`,
    events: (userId: string) => `cached_events_${userId}`,
    feed: (userId: string) => `cached_feed_${userId}`,
    crew: (userId: string) => `cached_crew_${userId}`,
};

// TTL configuration (in minutes)
export const CacheTTL = {
    workouts: 15,
    squad: 10,
    events: 15,
    feed: 5,
    crew: 10,
};
