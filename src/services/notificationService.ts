import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

// Show alerts, play sound, and set badge when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface NotificationPreferences {
    squadRequests: boolean;
    squadPosts: boolean;
    comments: boolean;
    lfgReactions: boolean;
    eventInvites: boolean;
    eventSoon: boolean;
    workoutReminders: boolean;
    checkInReminders: boolean;
    sound: 'custom' | 'default';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
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

/**
 * Register for push notifications and return the Expo push token, or null on failure.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.warn('Push notifications are only supported on physical devices.');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Permission not granted for push notifications.');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'notification.wav',
        });
    }

    try {
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? 'ae4e3783-a643-4a7e-95d4-eb3108c0184a';
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        return tokenData.data;
    } catch (error) {
        console.error('Error getting Expo push token:', error);
        return null;
    }
}

/**
 * Save the push token to the push_tokens table (upsert).
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
        .from('push_tokens')
        .upsert(
            { user_id: userId, token },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('Error saving push token:', error);
    }
}

/**
 * Clear the push token for a user (e.g. on sign-out).
 */
export async function clearPushToken(userId: string): Promise<void> {
    const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error clearing push token:', error);
    }
}

/**
 * Read notification preferences from athlete_profiles, merging with defaults.
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
        .from('athlete_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();

    if (error || !data?.notification_preferences) {
        return { ...DEFAULT_PREFERENCES };
    }

    return {
        ...DEFAULT_PREFERENCES,
        ...data.notification_preferences,
    };
}

/**
 * Persist notification preferences to athlete_profiles.
 */
export async function saveNotificationPreferences(
    userId: string,
    prefs: NotificationPreferences
): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ notification_preferences: prefs })
        .eq('user_id', userId);

    if (error) {
        console.error('Error saving notification preferences:', error);
    }
}

/**
 * Schedule a local notification at 8 PM the day before the workout.
 * Returns the notification identifier, or null if the date is already past.
 */
export async function scheduleWorkoutReminder(
    workoutName: string,
    eventName: string,
    scheduledDate: Date,
    eventId: string,
    trainingWorkoutId: string
): Promise<string | null> {
    const reminderDate = new Date(scheduledDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(20, 0, 0, 0); // 8 PM the day before

    if (reminderDate <= new Date()) {
        return null;
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Workout Tomorrow!',
                body: `Don't forget: ${workoutName} for ${eventName}`,
                data: {
                    type: 'workout_reminder',
                    eventId,
                    trainingWorkoutId,
                },
                sound: 'notification.wav',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
        return notificationId;
    } catch (error) {
        console.error('Error scheduling workout reminder:', error);
        return null;
    }
}

/**
 * Schedule a local notification at 9 AM, 2 days before the event.
 * Returns the notification identifier, or null if the date is already past.
 */
export async function scheduleEventSoonReminder(
    eventName: string,
    eventDate: Date,
    eventId: string
): Promise<string | null> {
    const reminderDate = new Date(eventDate);
    reminderDate.setDate(reminderDate.getDate() - 2);
    reminderDate.setHours(9, 0, 0, 0); // 9 AM, 2 days before

    if (reminderDate <= new Date()) {
        return null;
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Event Coming Up!',
                body: `${eventName} is 2 days away. Get ready!`,
                data: {
                    type: 'event_soon',
                    eventId,
                },
                sound: 'notification.wav',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
        return notificationId;
    } catch (error) {
        console.error('Error scheduling event soon reminder:', error);
        return null;
    }
}

/**
 * Cancel all scheduled notifications whose data.eventId matches the given eventId.
 */
export async function cancelEventNotifications(eventId: string): Promise<void> {
    try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of allNotifications) {
            const data = notification.content.data;
            if (data?.eventId === eventId) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }
    } catch (error) {
        console.error('Error cancelling event notifications:', error);
    }
}

/**
 * Cancel every scheduled local notification.
 */
export async function cancelAllNotifications(): Promise<void> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error cancelling all notifications:', error);
    }
}

/**
 * Return the count of currently scheduled local notifications.
 */
export async function getScheduledNotificationCount(): Promise<number> {
    try {
        const notifications = await Notifications.getAllScheduledNotificationsAsync();
        return notifications.length;
    } catch (error) {
        console.error('Error getting scheduled notification count:', error);
        return 0;
    }
}

/**
 * Register listeners for foreground notification receipt and user response.
 * Returns a cleanup function that removes both listeners.
 */
export function addNotificationListeners(
    onReceived: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener(onReceived);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
}
