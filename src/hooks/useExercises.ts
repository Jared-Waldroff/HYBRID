import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const EXERCISES_CACHE_KEY = 'cached_exercises';
const EXERCISES_CACHE_TIMESTAMP_KEY = 'cached_exercises_timestamp';
const CACHE_EXPIRY_HOURS = 24;

export function useExercises() {
    const { user } = useAuth();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load cached exercises immediately on mount
    useEffect(() => {
        const loadCachedExercises = async () => {
            try {
                const cached = await AsyncStorage.getItem(EXERCISES_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.length > 0) {
                        setExercises(parsed);
                        setLoading(false); // Show cached data immediately
                    }
                }
            } catch (err) {
                console.warn('Failed to load cached exercises:', err);
            }
        };

        loadCachedExercises();
    }, []);

    const isCacheExpired = async () => {
        try {
            const timestamp = await AsyncStorage.getItem(EXERCISES_CACHE_TIMESTAMP_KEY);
            if (!timestamp) return true;

            const cacheTime = new Date(timestamp).getTime();
            const now = new Date().getTime();
            const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

            return hoursDiff > CACHE_EXPIRY_HOURS;
        } catch (err) {
            return true;
        }
    };

    const fetchExercises = useCallback(async (forceRefresh = false) => {
        try {
            // If not forcing refresh, check cache validity
            if (!forceRefresh) {
                const expired = await isCacheExpired();
                if (!expired && exercises.length > 0) {
                    setLoading(false);
                    return; // Use cached data
                }
            }

            setLoading(true);

            const { data, error: fetchError } = await supabase
                .from('exercises')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            setExercises(data || []);
            setError(null);

            // Cache the exercises and timestamp
            if (data && data.length > 0) {
                await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(data));
                await AsyncStorage.setItem(EXERCISES_CACHE_TIMESTAMP_KEY, new Date().toISOString());
            }
        } catch (err: any) {
            console.error('Error fetching exercises:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [exercises.length]);

    // Group exercises by muscle group
    const groupedExercises = useMemo(() => {
        const grouped: { [key: string]: any[] } = {};
        exercises.forEach(exercise => {
            const group = exercise.muscle_group || 'Other';
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(exercise);
        });
        // Sort groups alphabetically
        const sortedGroups: { [key: string]: any[] } = {};
        Object.keys(grouped).sort().forEach(key => {
            sortedGroups[key] = grouped[key];
        });
        return sortedGroups;
    }, [exercises]);

    const createExercise = async (data: { name: string; muscle_group: string; description?: string }) => {
        try {
            const { data: newExercise, error } = await supabase
                .from('exercises')
                .insert({
                    name: data.name,
                    muscle_group: data.muscle_group,
                    description: data.description || null,
                    is_default: false,
                    user_id: user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            const updatedExercises = [...exercises, newExercise].sort((a, b) => a.name.localeCompare(b.name));
            setExercises(updatedExercises);

            // Update cache
            await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(updatedExercises));
            await AsyncStorage.setItem(EXERCISES_CACHE_TIMESTAMP_KEY, new Date().toISOString());

            return { data: newExercise, error: null };
        } catch (err: any) {
            console.error('Error creating exercise:', err);
            return { data: null, error: err.message };
        }
    };

    const updateExercise = async (id: string, data: { name?: string; muscle_group?: string }) => {
        try {
            const { data: updated, error } = await supabase
                .from('exercises')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const updatedExercises = exercises.map(ex => ex.id === id ? updated : ex);
            setExercises(updatedExercises);

            // Update cache
            await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(updatedExercises));

            return { data: updated, error: null };
        } catch (err: any) {
            console.error('Error updating exercise:', err);
            return { data: null, error: err.message };
        }
    };

    const deleteExercise = async (id: string) => {
        try {
            const { error } = await supabase
                .from('exercises')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const updatedExercises = exercises.filter(ex => ex.id !== id);
            setExercises(updatedExercises);

            // Update cache
            await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(updatedExercises));

            return { error: null };
        } catch (err: any) {
            console.error('Error deleting exercise:', err);
            return { error: err.message };
        }
    };

    const getExerciseHistory = async (exerciseId: string, limit = 10) => {
        try {
            const { data, error } = await supabase
                .from('sets')
                .select(`
          id,
          weight,
          reps,
          completed_at,
          workout_exercises!inner (
            exercise_id,
            workout:workouts!inner (
              user_id
            )
          )
        `)
                .eq('workout_exercises.exercise_id', exerciseId)
                .eq('workout_exercises.workout.user_id', user?.id)
                .eq('is_completed', true)
                .not('completed_at', 'is', null)
                .order('completed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error fetching exercise history:', err);
            return { data: null, error: err.message };
        }
    };

    // Get the most recent weight and reps used for an exercise
    const getLastExerciseSetValues = async (exerciseId: string): Promise<{ weight: number; reps: number } | null> => {
        try {
            const { data, error } = await supabase
                .from('sets')
                .select(`
                    weight,
                    reps,
                    completed_at,
                    workout_exercises!inner (
                        exercise_id,
                        workout:workouts!inner (
                            user_id,
                            is_completed
                        )
                    )
                `)
                .eq('workout_exercises.exercise_id', exerciseId)
                .eq('workout_exercises.workout.user_id', user?.id)
                .eq('workout_exercises.workout.is_completed', true)
                .eq('is_completed', true)
                .not('completed_at', 'is', null)
                .order('completed_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            if (data && data.length > 0) {
                return {
                    weight: data[0].weight || 0,
                    reps: data[0].reps || 0,
                };
            }
            return null;
        } catch (err: any) {
            console.error('Error fetching last exercise values:', err);
            return null;
        }
    };

    const getExerciseById = async (id: string) => {
        // First check local cache
        const cachedExercise = exercises.find(e => e.id === id);
        if (cachedExercise) {
            return { data: cachedExercise, error: null };
        }

        // Fall back to database
        try {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error fetching exercise:', err);
            return { data: null, error: err.message };
        }
    };

    const searchExercises = (query: string) => {
        if (!query.trim()) return exercises;
        const lowerQuery = query.toLowerCase();
        return exercises.filter(
            (e) =>
                e.name.toLowerCase().includes(lowerQuery) ||
                e.muscle_group?.toLowerCase().includes(lowerQuery)
        );
    };

    const getExercisesByMuscleGroup = (muscleGroup: string) => {
        return exercises.filter((e) => e.muscle_group === muscleGroup);
    };

    const getMuscleGroups = () => {
        const groups = new Set(exercises.map((e) => e.muscle_group).filter(Boolean));
        return Array.from(groups).sort();
    };

    // Clear cache (useful for debugging or forced refresh)
    const clearCache = async () => {
        await AsyncStorage.removeItem(EXERCISES_CACHE_KEY);
        await AsyncStorage.removeItem(EXERCISES_CACHE_TIMESTAMP_KEY);
    };

    useEffect(() => {
        fetchExercises();
    }, [fetchExercises]);

    return {
        exercises,
        groupedExercises,
        loading,
        error,
        fetchExercises,
        createExercise,
        updateExercise,
        deleteExercise,
        getExerciseHistory,
        getLastExerciseSetValues,
        getExerciseById,
        searchExercises,
        getExercisesByMuscleGroup,
        getMuscleGroups,
        clearCache,
    };
}
