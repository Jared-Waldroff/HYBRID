import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useWorkouts() {
    const { user } = useAuth();
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkouts = useCallback(async (startDate?: string, endDate?: string) => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            let query = supabase
                .from('workouts')
                .select(`
          *,
          workout_exercises (
            id,
            order_index,
            exercise:exercises (
              id,
              name,
              muscle_group
            )
          )
        `)
                .eq('user_id', user.id)
                .order('scheduled_date', { ascending: true });

            if (startDate) {
                query = query.gte('scheduled_date', startDate);
            }
            if (endDate) {
                query = query.lte('scheduled_date', endDate);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Sort workout exercises by order_index
            const sortedData = data?.map((workout) => ({
                ...workout,
                workout_exercises: workout.workout_exercises?.sort(
                    (a: any, b: any) => a.order_index - b.order_index
                ),
            }));

            setWorkouts(sortedData || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching workouts:', err);
            setError(err.message);
            setWorkouts([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const getWorkoutById = async (id: string) => {
        try {
            const { data, error: fetchError } = await supabase
                .from('workouts')
                .select(`
          *,
          workout_exercises (
            id,
            order_index,
            exercise:exercises (
              id,
              name,
              muscle_group
            ),
            sets (
              id,
              weight,
              reps,
              is_completed,
              completed_at,
              created_at
            )
          )
        `)
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            if (data) {
                data.workout_exercises = data.workout_exercises
                    ?.sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((we: any) => ({
                        ...we,
                        sets: we.sets?.sort(
                            (a: any, b: any) =>
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        ),
                    }));
            }

            return { data, error: null };
        } catch (err: any) {
            console.error('Error fetching workout:', err);
            return { data: null, error: err.message };
        }
    };

    const createWorkout = async (
        workout: { name: string; scheduled_date: string; color?: string; notes?: string },
        exerciseIds: string[],
        customSets: Record<string, any[]> | null = null
    ) => {
        if (!user) return { error: 'Not authenticated' };

        // Generate temporary ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticWorkout = {
            id: tempId,
            user_id: user.id,
            name: workout.name,
            scheduled_date: workout.scheduled_date,
            color: workout.color || '#1e3a5f',
            notes: workout.notes || null,
            workout_exercises: [],
        };

        // OPTIMISTIC: Add to local state immediately
        setWorkouts((prev) => [...prev, optimisticWorkout].sort(
            (a, b) => a.scheduled_date.localeCompare(b.scheduled_date)
        ));

        try {
            const { data: newWorkout, error: workoutError } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    name: workout.name,
                    scheduled_date: workout.scheduled_date,
                    color: workout.color || '#1e3a5f',
                    notes: workout.notes || null,
                })
                .select()
                .single();

            if (workoutError) throw workoutError;

            // Replace temp workout with real one
            setWorkouts((prev) => prev.map((w) =>
                w.id === tempId ? { ...newWorkout, workout_exercises: [] } : w
            ));

            if (exerciseIds && exerciseIds.length > 0) {
                const workoutExercises = exerciseIds.map((exerciseId, index) => ({
                    workout_id: newWorkout.id,
                    exercise_id: exerciseId,
                    order_index: index,
                }));

                const { error: exerciseError } = await supabase
                    .from('workout_exercises')
                    .insert(workoutExercises);

                if (exerciseError) throw exerciseError;

                const setsToInsert: any[] = [];
                for (const we of workoutExercises) {
                    const { data: weData } = await supabase
                        .from('workout_exercises')
                        .select('id')
                        .eq('workout_id', newWorkout.id)
                        .eq('exercise_id', we.exercise_id)
                        .single();

                    if (weData) {
                        const exerciseSets = customSets?.[we.exercise_id];

                        if (exerciseSets && exerciseSets.length > 0) {
                            exerciseSets.forEach((set) => {
                                setsToInsert.push({
                                    workout_exercise_id: weData.id,
                                    weight: set.weight,
                                    reps: set.reps,
                                    is_completed: false,
                                });
                            });
                        } else {
                            for (let i = 0; i < 3; i++) {
                                setsToInsert.push({
                                    workout_exercise_id: weData.id,
                                    weight: 0,
                                    reps: 0,
                                    is_completed: false,
                                });
                            }
                        }
                    }
                }

                if (setsToInsert.length > 0) {
                    await supabase.from('sets').insert(setsToInsert);
                }
            }

            return { data: newWorkout, error: null };
        } catch (err: any) {
            console.error('Error creating workout:', err);
            // Rollback optimistic update on error
            setWorkouts((prev) => prev.filter((w) => w.id !== tempId));
            return { data: null, error: err.message };
        }
    };

    const updateWorkout = async (id: string, updates: any) => {
        try {
            const { data, error: updateError } = await supabase
                .from('workouts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            await fetchWorkouts();
            return { data, error: null };
        } catch (err: any) {
            console.error('Error updating workout:', err);
            return { data: null, error: err.message };
        }
    };

    const deleteWorkout = async (id: string) => {
        // OPTIMISTIC: Remove from local state immediately
        const previousWorkouts = workouts;
        setWorkouts((prev) => prev.filter((w) => w.id !== id));

        try {
            const { error: deleteError } = await supabase.from('workouts').delete().eq('id', id);

            if (deleteError) throw deleteError;

            return { error: null };
        } catch (err: any) {
            console.error('Error deleting workout:', err);
            // Rollback on error
            setWorkouts(previousWorkouts);
            return { error: err.message };
        }
    };

    const getWorkoutsByDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return workouts.filter((w) => w.scheduled_date === dateStr);
    };

    useEffect(() => {
        if (user) {
            fetchWorkouts();
        }
    }, [user, fetchWorkouts]);

    // Refetch when app comes back to foreground
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && user) {
                fetchWorkouts();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [user, fetchWorkouts]);

    return {
        workouts,
        loading,
        error,
        fetchWorkouts,
        getWorkoutById,
        createWorkout,
        updateWorkout,
        deleteWorkout,
        getWorkoutsByDate,
    };
}
