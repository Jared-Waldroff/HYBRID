import { supabase } from '../lib/supabaseClient';

export function useSets() {
    const addSet = async (workoutExerciseId: string, weight = 0, reps = 0) => {
        try {
            const { data, error } = await supabase
                .from('sets')
                .insert({
                    workout_exercise_id: workoutExerciseId,
                    weight,
                    reps,
                    is_completed: false,
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding set:', err);
            return { data: null, error: err.message };
        }
    };

    const updateSet = async (setId: string, updates: { weight?: number; reps?: number }) => {
        try {
            const { data, error } = await supabase
                .from('sets')
                .update(updates)
                .eq('id', setId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error updating set:', err);
            return { data: null, error: err.message };
        }
    };

    const deleteSet = async (setId: string) => {
        try {
            const { error } = await supabase.from('sets').delete().eq('id', setId);

            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting set:', err);
            return { error: err.message };
        }
    };

    const toggleSetComplete = async (setId: string, currentStatus: boolean) => {
        try {
            const updates: any = {
                is_completed: !currentStatus,
            };

            if (!currentStatus) {
                updates.completed_at = new Date().toISOString();
            } else {
                updates.completed_at = null;
            }

            const { data, error } = await supabase
                .from('sets')
                .update(updates)
                .eq('id', setId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error toggling set:', err);
            return { data: null, error: err.message };
        }
    };

    const duplicateSet = async (workoutExerciseId: string, sourceSet?: any) => {
        try {
            const newSet = {
                workout_exercise_id: workoutExerciseId,
                weight: sourceSet?.weight || 0,
                reps: sourceSet?.reps || 0,
                is_completed: false,
            };

            const { data, error } = await supabase.from('sets').insert(newSet).select().single();

            if (error) throw error;
            return { data, error: null };
        } catch (err: any) {
            console.error('Error duplicating set:', err);
            return { data: null, error: err.message };
        }
    };

    return {
        addSet,
        updateSet,
        deleteSet,
        toggleSetComplete,
        duplicateSet,
    };
}
