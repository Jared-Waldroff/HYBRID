import { useState, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface SyncOptions {
    startDate: Date;
    endDate: Date;
    preferredTime: string; // "HH:MM" format
    durationMinutes: number;
}

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
}

interface CalendarSyncPreferences {
    preferred_workout_time: string;
    preferred_workout_duration: number;
    synced_workout_ids: string[];
    calendar_sync_calendar_id: string | null;
}

export function useGoogleCalendarSync() {
    const { user } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preferences, setPreferences] = useState<CalendarSyncPreferences | null>(null);

    // Request calendar permissions
    const requestPermissions = async (): Promise<boolean> => {
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Calendar Permission Required',
                    'Please grant calendar access to sync your workouts.',
                    [{ text: 'OK' }]
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting calendar permissions:', error);
            return false;
        }
    };

    // Find or create HYBRID calendar
    const getOrCreateCalendar = async (): Promise<string | null> => {
        try {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

            // Look for existing HYBRID calendar
            const hybridCalendar = calendars.find(
                cal => cal.title === 'HYBRID Workouts' && cal.allowsModifications
            );

            if (hybridCalendar) {
                return hybridCalendar.id;
            }

            // Create new calendar
            if (Platform.OS === 'ios') {
                const defaultCalendar = calendars.find(
                    cal => cal.source?.name === 'iCloud' || cal.source?.name === 'Default'
                );

                if (!defaultCalendar?.source?.id) {
                    // Fallback to first available calendar source
                    const source = calendars.find(cal => cal.allowsModifications)?.source;
                    if (!source?.id) {
                        console.error('No calendar source found');
                        return null;
                    }

                    const newCalendarId = await Calendar.createCalendarAsync({
                        title: 'HYBRID Workouts',
                        color: '#c9a227',
                        entityType: Calendar.EntityTypes.EVENT,
                        sourceId: source.id,
                        source: source,
                        name: 'hybridworkouts',
                        ownerAccount: 'personal',
                        accessLevel: Calendar.CalendarAccessLevel.OWNER,
                    });
                    return newCalendarId;
                }

                const newCalendarId = await Calendar.createCalendarAsync({
                    title: 'HYBRID Workouts',
                    color: '#c9a227',
                    entityType: Calendar.EntityTypes.EVENT,
                    sourceId: defaultCalendar.source.id,
                    source: defaultCalendar.source,
                    name: 'hybridworkouts',
                    ownerAccount: 'personal',
                    accessLevel: Calendar.CalendarAccessLevel.OWNER,
                });
                return newCalendarId;
            } else {
                // Android
                const googleCalendar = calendars.find(
                    cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER &&
                        cal.allowsModifications
                );

                if (googleCalendar) {
                    // On Android, we'll use an existing calendar with modifications allowed
                    return googleCalendar.id;
                }

                // Try to create a local calendar
                const localSource = calendars.find(
                    cal => cal.source?.type === 'LOCAL' || cal.allowsModifications
                )?.source;

                if (localSource) {
                    const newCalendarId = await Calendar.createCalendarAsync({
                        title: 'HYBRID Workouts',
                        color: '#c9a227',
                        entityType: Calendar.EntityTypes.EVENT,
                        sourceId: localSource.id,
                        source: localSource,
                        name: 'hybridworkouts',
                        ownerAccount: 'personal',
                        accessLevel: Calendar.CalendarAccessLevel.OWNER,
                    });
                    return newCalendarId;
                }

                // Last resort: use first available writable calendar
                const writeableCalendar = calendars.find(cal => cal.allowsModifications);
                return writeableCalendar?.id || null;
            }
        } catch (error) {
            console.error('Error getting/creating calendar:', error);
            return null;
        }
    };

    // Load sync preferences from database
    const loadPreferences = useCallback(async (): Promise<CalendarSyncPreferences> => {
        if (!user) {
            return {
                preferred_workout_time: '07:00',
                preferred_workout_duration: 60,
                synced_workout_ids: [],
                calendar_sync_calendar_id: null,
            };
        }

        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('preferred_workout_time, preferred_workout_duration, synced_workout_ids, calendar_sync_calendar_id')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading preferences:', error);
            }

            const prefs = {
                preferred_workout_time: data?.preferred_workout_time?.slice(0, 5) || '07:00',
                preferred_workout_duration: data?.preferred_workout_duration || 60,
                synced_workout_ids: data?.synced_workout_ids || [],
                calendar_sync_calendar_id: data?.calendar_sync_calendar_id || null,
            };

            setPreferences(prefs);
            return prefs;
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {
                preferred_workout_time: '07:00',
                preferred_workout_duration: 60,
                synced_workout_ids: [],
                calendar_sync_calendar_id: null,
            };
        }
    }, [user]);

    // Save sync preferences to database
    const savePreferences = async (updates: Partial<CalendarSyncPreferences>) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    ...updates,
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving preferences:', error);
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    };

    // Build workout description with exercises and sets
    const buildWorkoutDescription = (workout: any): string => {
        let description = `🏋️ ${workout.name}\n\n`;

        if (workout.workout_exercises && workout.workout_exercises.length > 0) {
            description += '📋 EXERCISES:\n';

            workout.workout_exercises.forEach((we: any, index: number) => {
                const exerciseName = we.exercise?.name || 'Unknown Exercise';
                description += `\n${index + 1}. ${exerciseName}\n`;

                if (we.sets && we.sets.length > 0) {
                    we.sets.forEach((set: any, setIndex: number) => {
                        const weight = set.weight || 0;
                        const reps = set.reps || 0;
                        description += `   • Set ${setIndex + 1}: ${weight} lbs × ${reps} reps\n`;
                    });
                } else {
                    description += `   • 3 sets planned\n`;
                }
            });
        }

        description += '\n---\nSynced from HYBRID App 💪';
        return description;
    };

    // Create calendar event for a workout
    const createCalendarEvent = async (
        calendarId: string,
        workout: any,
        startTime: string,
        durationMinutes: number,
        dayOffset: number = 0
    ): Promise<string | null> => {
        try {
            const [hours, minutes] = startTime.split(':').map(Number);
            const workoutDate = new Date(workout.scheduled_date + 'T00:00:00');

            // Calculate start time with offset for multiple workouts on same day
            const startDate = new Date(workoutDate);
            startDate.setHours(hours + Math.floor(dayOffset * 1.5));
            startDate.setMinutes(minutes + ((dayOffset * 1.5) % 1) * 60);

            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + durationMinutes);

            const eventId = await Calendar.createEventAsync(calendarId, {
                title: `💪 ${workout.name}`,
                startDate,
                endDate,
                notes: buildWorkoutDescription(workout),
                location: 'HYBRID App',
                alarms: [{ relativeOffset: -30 }], // 30 min reminder
            });

            return eventId;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            return null;
        }
    };

    // Main sync function
    const syncWorkouts = async (
        workouts: any[],
        options: SyncOptions,
        onProgress?: (current: number, total: number) => void
    ): Promise<SyncResult> => {
        setSyncing(true);
        setProgress(0);

        const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };

        try {
            // Check permissions
            const hasPermission = await requestPermissions();
            if (!hasPermission) {
                setSyncing(false);
                return result;
            }

            // Get or create calendar
            const calendarId = await getOrCreateCalendar();
            if (!calendarId) {
                Alert.alert('Error', 'Could not access or create calendar.');
                setSyncing(false);
                return result;
            }

            // Load current synced IDs
            const prefs = await loadPreferences();
            const syncedIds = new Set(prefs.synced_workout_ids || []);

            // Filter workouts in date range
            const workoutsToSync = workouts.filter(w => {
                const date = new Date(w.scheduled_date);
                return date >= options.startDate && date <= options.endDate;
            });

            if (workoutsToSync.length === 0) {
                Alert.alert('No Workouts', 'No workouts found in the selected date range.');
                setSyncing(false);
                return result;
            }

            // Group workouts by date for proper time offset
            const workoutsByDate: { [key: string]: any[] } = {};
            workoutsToSync.forEach(w => {
                if (!workoutsByDate[w.scheduled_date]) {
                    workoutsByDate[w.scheduled_date] = [];
                }
                workoutsByDate[w.scheduled_date].push(w);
            });

            // Sync each workout
            let current = 0;
            const newSyncedIds: string[] = [...syncedIds];

            for (const dateKey of Object.keys(workoutsByDate)) {
                const dayWorkouts = workoutsByDate[dateKey];

                for (let i = 0; i < dayWorkouts.length; i++) {
                    const workout = dayWorkouts[i];
                    current++;

                    // Update progress
                    const progressPercent = Math.round((current / workoutsToSync.length) * 100);
                    setProgress(progressPercent);
                    onProgress?.(current, workoutsToSync.length);

                    // Skip if already synced
                    if (syncedIds.has(workout.id)) {
                        result.skipped++;
                        continue;
                    }

                    // Create event with time offset for multiple workouts on same day
                    const eventId = await createCalendarEvent(
                        calendarId,
                        workout,
                        options.preferredTime,
                        options.durationMinutes,
                        i
                    );

                    if (eventId) {
                        newSyncedIds.push(workout.id);
                        result.synced++;
                    } else {
                        result.errors++;
                    }
                }
            }

            // Save updated synced IDs and calendar ID
            await savePreferences({
                synced_workout_ids: newSyncedIds,
                calendar_sync_calendar_id: calendarId,
                preferred_workout_time: options.preferredTime + ':00',
                preferred_workout_duration: options.durationMinutes,
            });

        } catch (error) {
            console.error('Error syncing workouts:', error);
            result.errors++;
        } finally {
            setSyncing(false);
            setProgress(100);
        }

        return result;
    };

    return {
        syncing,
        progress,
        preferences,
        loadPreferences,
        savePreferences,
        requestPermissions,
        syncWorkouts,
    };
}
