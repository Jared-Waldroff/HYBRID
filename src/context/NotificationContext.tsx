import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import {
    registerForPushNotificationsAsync,
    savePushToken,
    getNotificationPreferences,
    saveNotificationPreferences,
    NotificationPreferences,
} from '../services/notificationService';

interface NotificationContextType {
    pushToken: string | null;
    preferences: NotificationPreferences;
    isRegistered: boolean;
    unreadCount: number;
    registerForNotifications: () => Promise<boolean>;
    updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
    markAllRead: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
    squadRequests: true,
    squadPosts: true,
    comments: true,
    lfgReactions: true,
    eventInvites: true,
    eventSoon: true,
    workoutReminders: true,
    checkInReminders: true,
    sound: 'custom',
};

const NotificationContext = createContext<NotificationContextType>({
    pushToken: null,
    preferences: defaultPreferences,
    isRegistered: false,
    unreadCount: 0,
    registerForNotifications: async () => false,
    updatePreferences: async () => { },
    markAllRead: async () => { },
    refreshUnreadCount: async () => { },
});

export function useNotifications() {
    return useContext(NotificationContext);
}

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { user } = useAuth();
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [isRegistered, setIsRegistered] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Fetch initial unread count from DB
    const refreshUnreadCount = useCallback(async () => {
        if (!user?.id) return;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error fetching unread count:', error);
            return;
        }

        setUnreadCount(count ?? 0);
    }, [user?.id]);

    // Mark all notifications as read for the current user
    const markAllRead = useCallback(async () => {
        if (!user?.id) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking notifications as read:', error);
            return;
        }

        setUnreadCount(0);
    }, [user?.id]);

    // Register for push notifications and save token
    const registerForNotifications = useCallback(async (): Promise<boolean> => {
        if (!user?.id) return false;

        const token = await registerForPushNotificationsAsync();

        if (token) {
            setPushToken(token);
            setIsRegistered(true);
            await savePushToken(user.id, token);
            return true;
        }

        setIsRegistered(false);
        return false;
    }, [user?.id]);

    // Merge partial preferences and persist
    const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
        if (!user?.id) return;

        const updated = { ...preferences, ...newPrefs };
        setPreferences(updated);
        await saveNotificationPreferences(user.id, updated);
    }, [user?.id, preferences]);

    // On login: load preferences, attempt push registration, fetch unread count
    useEffect(() => {
        if (!user?.id) return;

        const init = async () => {
            // Load notification preferences from DB
            const prefs = await getNotificationPreferences(user.id);
            setPreferences(prefs);

            // Attempt push registration; save token if successful
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setPushToken(token);
                setIsRegistered(true);
                await savePushToken(user.id, token);
            }

            // Fetch initial unread count
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (!error) {
                setUnreadCount(count ?? 0);
            }
        };

        init();
    }, [user?.id]);

    // Set up Realtime subscription for INSERT events on notifications table
    useEffect(() => {
        if (!user?.id) {
            // Clean up any existing subscription on logout
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current);
                realtimeChannelRef.current = null;
            }
            return;
        }

        // Unsubscribe from any previous channel before creating a new one
        if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
            realtimeChannelRef.current = null;
        }

        const channel = supabase
            .channel(`notifications:user:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime notifications channel subscribed');
                }
            });

        realtimeChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            realtimeChannelRef.current = null;
        };
    }, [user?.id]);

    // On logout: reset all state
    useEffect(() => {
        if (!user) {
            setPushToken(null);
            setPreferences(defaultPreferences);
            setIsRegistered(false);
            setUnreadCount(0);
        }
    }, [user]);

    return (
        <NotificationContext.Provider
            value={{
                pushToken,
                preferences,
                isRegistered,
                unreadCount,
                registerForNotifications,
                updatePreferences,
                markAllRead,
                refreshUnreadCount,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
