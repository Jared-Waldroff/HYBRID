import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

// Mock Notifications object to replace expo-notifications
const Notifications = {
    setNotificationHandler: (handler: any) => { },
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async (options: any) => ({ data: 'mock-token' }),
    setNotificationChannelAsync: async (channelId: string, options: any) => { },
    AndroidImportance: { HIGH: 4, DEFAULT: 3 },
    scheduleNotificationAsync: async (options: any) => 'mock-notification-id',
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async (id: string) => { },
    cancelAllScheduledNotificationsAsync: async () => { },
    addNotificationReceivedListener: (listener: any) => ({ remove: () => { } }),
    addNotificationResponseReceivedListener: (listener: any) => ({ remove: () => { } }),
    SchedulableTriggerInputTypes: { DATE: 'date' },
};

export interface ScheduledNotification {
    id: string;
    title: string;
    body: string;
    triggerDate: Date;
    data?: Record<string, any>;
}

export interface NotificationPreferences {
    workoutReminders: boolean;
    checkInReminders: boolean;
    squadActivity: boolean;
    reminderTime: string; // HH:mm format
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    workoutReminders: true,
    checkInReminders: true,
    squadActivity: true,
    reminderTime: '08:00',
};

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    console.log('Push notifications disabled in this build');
    return null;
}

/**
 * Save the push token to the user's profile in Supabase
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ push_token: token })
        .eq('user_id', userId);

    if (error) {
        console.error('Error saving push token:', error);
    }
}

/**
 * Get notification preferences from local storage or database
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
        .from('athlete_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();

    if (error || !data?.notification_preferences) {
        return DEFAULT_PREFERENCES;
    }

    return {
        ...DEFAULT_PREFERENCES,
        ...data.notification_preferences,
    };
}

/**
 * Save notification preferences to the database
 */
export async function saveNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
): Promise<void> {
    const { error } = await supabase
        .from('athlete_profiles')
        .update({ notification_preferences: preferences })
        .eq('user_id', userId);

    if (error) {
        console.error('Error saving notification preferences:', error);
    }
}

/**
 * Schedule a local notification for a workout reminder
 */
export async function scheduleWorkoutReminder(
    workoutName: string,
    eventName: string,
    scheduledDate: Date,
    eventId: string,
    trainingWorkoutId: string
): Promise<string | null> {
    // Schedule for reminder time on the day before
    const reminderDate = new Date(scheduledDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(20, 0, 0, 0); // 8 PM the day before

    // Don't schedule if the reminder date is in the past
    if (reminderDate < new Date()) {
        return null;
    }

    try {
        /*
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '🏋️ Workout Tomorrow!',
                body: `Don't forget: ${workoutName} for ${eventName}`,
                data: {
                    type: 'workout_reminder',
                    eventId,
                    trainingWorkoutId
                },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });
        return notificationId;
        */
        return 'mock-id';
    } catch (error) {
        console.error('Error scheduling workout reminder:', error);
        return null;
    }
}

/**
 * Schedule a check-in reminder for an event
 */
export async function scheduleCheckInReminder(
    eventName: string,
    eventId: string,
    frequency: 'daily' | 'every_other_day' | 'weekly',
    eventDate: Date
): Promise<string[]> {
    const notificationIds: string[] = [];
    const now = new Date();
    const intervalDays = frequency === 'daily' ? 1 : frequency === 'every_other_day' ? 2 : 7;

    // Schedule check-ins from now until the event
    let checkInDate = new Date(now);
    checkInDate.setHours(9, 0, 0, 0); // 9 AM

    if (checkInDate < now) {
        checkInDate.setDate(checkInDate.getDate() + 1);
    }

    while (checkInDate < eventDate) {
        try {
            /*
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📊 Training Check-In',
                    body: `How's your ${eventName} training going? Log your progress!`,
                    data: {
                        type: 'check_in',
                        eventId
                    },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: checkInDate,
                },
            });

            notificationIds.push(notificationId);
            */
           notificationIds.push('mock-id');
        } catch (error) {
            console.error('Error scheduling check-in reminder:', error);
        }

        // Move to next check-in date
        checkInDate.setDate(checkInDate.getDate() + intervalDays);
    }

    return notificationIds;
}

/**
 * Cancel all scheduled notifications for an event
 */
export async function cancelEventNotifications(eventId: string): Promise<void> {
    /*
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of allNotifications) {
        const data = notification.content.data;
        if (data?.eventId === eventId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
    */
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    // await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Send a local notification immediately (for squad activity)
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<void> {
    /*
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: null, // Immediate
    });
    */
}

/**
 * Get the count of scheduled notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
    // const notifications = await Notifications.getAllScheduledNotificationsAsync();
    // return notifications.length;
    return 0;
}

/**
 * Add notification listeners for handling received notifications
 */
export function addNotificationListeners(
    onNotificationReceived: (notification: any) => void,
    onNotificationResponse: (response: any) => void
): () => void {
    /*
    const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    // Return cleanup function
    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
    */
   return () => {};
}
