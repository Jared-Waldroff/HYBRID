import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// Types
export interface WorkoutCompletion {
    id: string;
    training_workout_id: string;
    user_id: string;
    workout_id: string | null;
    actual_value: number | null;
    actual_unit: string | null;
    actual_zone: 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5' | null;
    duration_seconds: number | null;
    notes: string | null;
    feeling: 'great' | 'good' | 'ok' | 'tough' | 'struggled' | null;
    completed_at: string;
}

export interface CompleteWorkoutInput {
    training_workout_id: string;
    workout_id?: string;
    actual_value?: number;
    actual_unit?: string;
    actual_zone?: 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';
    duration_seconds?: number;
    notes?: string;
    feeling?: 'great' | 'good' | 'ok' | 'tough' | 'struggled';
}

export interface ParticipantProgress {
    user_id: string;
    display_name: string;
    avatar_url: string;
    total_workouts: number;
    completed_workouts: number;
    completion_percentage: number;
}

export function useEventWorkouts() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Complete a training workout
    const completeWorkout = useCallback(async (
        input: CompleteWorkoutInput
    ): Promise<{ completion: WorkoutCompletion | null; error: string | null }> => {
        if (!user) return { completion: null, error: 'Not authenticated' };

        try {
            setLoading(true);
            setError(null);

            const { data, error: insertError } = await supabase
                .from('event_workout_completions')
                .upsert({
                    user_id: user.id,
                    ...input,
                    completed_at: new Date().toISOString(),
                }, {
                    onConflict: 'training_workout_id,user_id',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            return { completion: data, error: null };
        } catch (err: any) {
            console.error('Error completing workout:', err);
            setError(err.message);
            return { completion: null, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Get user's completions for an event
    const getMyCompletions = useCallback(async (eventId: string): Promise<WorkoutCompletion[]> => {
        if (!user) return [];

        try {
            const { data, error: fetchError } = await supabase
                .from('event_workout_completions')
                .select(`
                    *,
                    training_workout:event_training_workouts!training_workout_id(event_id)
                `)
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            // Filter by event
            return (data || []).filter(c => c.training_workout?.event_id === eventId);
        } catch (err: any) {
            console.error('Error getting completions:', err);
            return [];
        }
    }, [user]);

    // Get completion for specific training workout
    const getWorkoutCompletion = useCallback(async (
        trainingWorkoutId: string
    ): Promise<WorkoutCompletion | null> => {
        if (!user) return null;

        try {
            const { data, error: fetchError } = await supabase
                .from('event_workout_completions')
                .select('*')
                .eq('training_workout_id', trainingWorkoutId)
                .eq('user_id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
            return data;
        } catch (err: any) {
            console.error('Error getting completion:', err);
            return null;
        }
    }, [user]);

    // Get all completions for a training workout (all participants)
    const getAllCompletionsForWorkout = useCallback(async (
        trainingWorkoutId: string
    ): Promise<(WorkoutCompletion & { profile: { display_name: string; avatar_url: string } })[]> => {
        try {
            const { data, error: fetchError } = await supabase
                .from('event_workout_completions')
                .select(`
                    *,
                    profile:athlete_profiles!user_id(display_name, avatar_url)
                `)
                .eq('training_workout_id', trainingWorkoutId)
                .order('completed_at', { ascending: false });

            if (fetchError) throw fetchError;
            return data || [];
        } catch (err: any) {
            console.error('Error getting all completions:', err);
            return [];
        }
    }, []);

    // Get participant progress using the database function
    const getParticipantProgress = useCallback(async (
        eventId: string
    ): Promise<ParticipantProgress[]> => {
        try {
            const { data, error: fetchError } = await supabase
                .rpc('get_event_progress', { p_event_id: eventId });

            if (fetchError) throw fetchError;
            return data || [];
        } catch (err: any) {
            console.error('Error getting participant progress:', err);
            return [];
        }
    }, []);

    // Delete a completion
    const deleteCompletion = useCallback(async (
        completionId: string
    ): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const { error: deleteError } = await supabase
                .from('event_workout_completions')
                .delete()
                .eq('id', completionId)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting completion:', err);
            return { error: err.message };
        }
    }, [user]);

    // Get upcoming event workouts for user (for calendar integration)
    const getUpcomingEventWorkouts = useCallback(async (
        daysAhead: number = 14
    ): Promise<any[]> => {
        if (!user) return [];

        try {
            // Get events user is participating in
            const { data: participations } = await supabase
                .from('event_participants')
                .select('event_id')
                .eq('user_id', user.id);

            if (!participations || participations.length === 0) return [];

            const eventIds = participations.map(p => p.event_id);

            // Get events with their dates
            const { data: events } = await supabase
                .from('squad_events')
                .select('id, event_date, name')
                .in('id', eventIds)
                .eq('is_active', true);

            if (!events) return [];

            // Get all training workouts for these events
            const { data: workouts } = await supabase
                .from('event_training_workouts')
                .select('*')
                .in('event_id', eventIds);

            if (!workouts) return [];

            // Get user's completions
            const workoutIds = workouts.map(w => w.id);
            const { data: completions } = await supabase
                .from('event_workout_completions')
                .select('training_workout_id')
                .eq('user_id', user.id)
                .in('training_workout_id', workoutIds);

            const completedIds = new Set(completions?.map(c => c.training_workout_id) || []);

            // Calculate scheduled dates and filter upcoming
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + daysAhead);

            const upcomingWorkouts = workouts
                .map(workout => {
                    const event = events.find(e => e.id === workout.event_id);
                    if (!event) return null;

                    const eventDate = new Date(event.event_date);
                    const scheduledDate = new Date(eventDate);
                    scheduledDate.setDate(scheduledDate.getDate() - workout.days_before_event);

                    return {
                        ...workout,
                        event_name: event.name,
                        scheduled_date: scheduledDate.toISOString().split('T')[0],
                        is_completed: completedIds.has(workout.id),
                        _scheduledDate: scheduledDate,
                    };
                })
                .filter(w => {
                    if (!w) return false;
                    return w._scheduledDate >= today && w._scheduledDate <= futureDate && !w.is_completed;
                })
                .sort((a, b) => a!._scheduledDate.getTime() - b!._scheduledDate.getTime());

            return upcomingWorkouts.filter(Boolean);
        } catch (err: any) {
            console.error('Error getting upcoming event workouts:', err);
            return [];
        }
    }, [user]);

    return {
        loading,
        error,
        completeWorkout,
        getMyCompletions,
        getWorkoutCompletion,
        getAllCompletionsForWorkout,
        getParticipantProgress,
        deleteCompletion,
        getUpcomingEventWorkouts,
    };
}

// Feeling options for workout completion
export const FEELING_OPTIONS = [
    { id: 'great', emoji: '🔥', label: 'Great', color: '#10b981' },
    { id: 'good', emoji: '💪', label: 'Good', color: '#3b82f6' },
    { id: 'ok', emoji: '👍', label: 'OK', color: '#f59e0b' },
    { id: 'tough', emoji: '😤', label: 'Tough', color: '#f97316' },
    { id: 'struggled', emoji: '😵', label: 'Struggled', color: '#ef4444' },
];
