import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_KEY = 'hybrid_pending_invite';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PendingInvite {
    code: string;
    timestamp: number;
}

/**
 * Save an invite code to be processed after auth completes.
 * Used when the app receives a deep link but the user isn't logged in yet,
 * or when the app is freshly installed from an invite link.
 */
export async function savePendingInvite(code: string): Promise<void> {
    try {
        const invite: PendingInvite = { code, timestamp: Date.now() };
        await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
    } catch (err) {
        console.warn('Failed to save pending invite:', err);
    }
}

/**
 * Retrieve and clear a pending invite code.
 * Returns null if no pending invite exists or if it has expired.
 */
export async function consumePendingInvite(): Promise<string | null> {
    try {
        const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        if (!raw) return null;

        const invite: PendingInvite = JSON.parse(raw);

        // Expired — clean up and return null
        if (Date.now() - invite.timestamp > INVITE_TTL_MS) {
            await AsyncStorage.removeItem(PENDING_INVITE_KEY);
            return null;
        }

        // Consume it (one-time use)
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        return invite.code;
    } catch (err) {
        console.warn('Failed to read pending invite:', err);
        return null;
    }
}

/**
 * Extract an invite code from a URL string.
 * Handles both https://hybrid.walsansoftware.com/join/CODE and hybridworkout:///join/CODE
 */
export function extractInviteCode(url: string): string | null {
    try {
        const match = url.match(/\/join\/([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}
