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
                                    is_completed: set.is_completed || false,
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

    const addExercisesToWorkout = async (
        workoutId: string,
        exerciseIds: string[],
        customSets: Record<string, any[]> | null = null
    ) => {
        try {
            // Get current max order_index
            const workout = workouts.find(w => w.id === workoutId);
            const currentMaxOrder = workout?.workout_exercises?.length > 0
                ? Math.max(...workout.workout_exercises.map((we: any) => we.order_index))
                : -1;

            const workoutExercises = exerciseIds.map((exerciseId, index) => ({
                workout_id: workoutId,
                exercise_id: exerciseId,
                order_index: currentMaxOrder + 1 + index,
            }));

            const { error: exerciseError } = await supabase
                .from('workout_exercises')
                .insert(workoutExercises);

            if (exerciseError) throw exerciseError;

            // Insert default sets for new exercises
            // Note: This is simplified; ideally we'd fetch the new WE IDs to insert sets linked to them
            // But since we need the IDs, we have to query them back or use a stored procedure.
            // For now, we'll fetchWorkouts and let the user add sets manually or improve this later.
            // OPTIONAL: If we need sets immediately, we have to query.

            // Let's rely on fetchWorkouts() to refresh the view, and the user can add sets.
            // OR if customSets are provided, we MUST query back.

            // Re-query to get IDs for set insertion
            const { data: newWEs } = await supabase
                .from('workout_exercises')
                .select('id, exercise_id')
                .eq('workout_id', workoutId)
                .in('exercise_id', exerciseIds);

            if (newWEs && customSets) {
                const setsToInsert: any[] = [];
                newWEs.forEach(we => {
                    const exerciseSets = customSets[we.exercise_id];
                    if (exerciseSets) {
                        exerciseSets.forEach(set => {
                            setsToInsert.push({
                                workout_exercise_id: we.id,
                                weight: set.weight || 0,
                                reps: set.reps || 0,
                                is_completed: set.is_completed || false
                            });
                        });
                    } else {
                        // Default 3 sets
                        for (let k = 0; k < 3; k++) setsToInsert.push({ workout_exercise_id: we.id, weight: 0, reps: 0, is_completed: false });
                    }
                });

                if (setsToInsert.length > 0) {
                    await supabase.from('sets').insert(setsToInsert);
                }
            } else if (newWEs) {
                // Default sets if no customSets provided
                const setsToInsert: any[] = [];
                newWEs.forEach(we => {
                    for (let k = 0; k < 3; k++) setsToInsert.push({ workout_exercise_id: we.id, weight: 0, reps: 0, is_completed: false });
                });
                await supabase.from('sets').insert(setsToInsert);
            }

            await fetchWorkouts();
            return { error: null };
        } catch (err: any) {
            console.error('Error adding exercises:', err);
            return { error: err.message };
        }
    };

    const removeExerciseFromWorkout = async (workoutId: string, exerciseId: string) => {
        try {
            // Find the workout_exercise entry
            // This assumes exercise_id is unique per workout (which it usually is, but strictly schema might allow duplicates)
            // We'll delete based on workout_id + exercise_id

            const { error } = await supabase
                .from('workout_exercises')
                .delete()
                .eq('workout_id', workoutId)
                .eq('exercise_id', exerciseId);

            if (error) throw error;

            await fetchWorkouts();
            return { error: null };
        } catch (err: any) {
            console.error('Error removing exercise:', err);
            return { error: err.message };
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

    const getRecentCompletedWorkouts = useCallback(async (limit: number = 5) => {
        if (!user) return [];

        try {
            // Fetch workouts that have at least one completed set or are marked as completed
            // For now, simpler approach: fetch past workouts and check completion status
            // In a real app, you'd want a 'completed_at' or 'status' field on the workout itself

            const today = new Date().toISOString().split('T')[0];

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
                        is_completed
                    )
                  )
                `)
                .eq('user_id', user.id)
                .lte('scheduled_date', today)
                .order('scheduled_date', { ascending: false })
                .limit(limit * 2); // Fetch more to filter locally

            if (fetchError) throw fetchError;

            // Filter for workouts that have at least one completed set
            const completedWorkouts = data?.filter(w => {
                const hasCompletedSets = w.workout_exercises?.some((we: any) =>
                    we.sets?.some((s: any) => s.is_completed)
                );
                return hasCompletedSets;
            }).slice(0, limit);

            return completedWorkouts || [];
        } catch (err) {
            console.error('Error fetching recent completed workouts:', err);
            return [];
        }
    }, [user]);

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
        addExercisesToWorkout,
        removeExerciseFromWorkout,
        getWorkoutsByDate,
        getRecentCompletedWorkouts,
    };
}
