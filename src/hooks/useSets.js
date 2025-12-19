import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSets() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const addSet = useCallback(async (workoutExerciseId, weight = 0, reps = 0) => {
        try {
            setLoading(true)

            const { data, error: insertError } = await supabase
                .from('sets')
                .insert({
                    workout_exercise_id: workoutExerciseId,
                    weight,
                    reps,
                    is_completed: false
                })
                .select()
                .single()

            if (insertError) throw insertError

            return { data, error: null }
        } catch (err) {
            console.error('Error adding set:', err)
            setError(err.message)
            return { data: null, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [])

    const updateSet = useCallback(async (setId, updates) => {
        try {
            setLoading(true)

            const updateData = {}
            if (updates.weight !== undefined) updateData.weight = updates.weight
            if (updates.reps !== undefined) updateData.reps = updates.reps
            if (updates.is_completed !== undefined) {
                updateData.is_completed = updates.is_completed
                updateData.completed_at = updates.is_completed ? new Date().toISOString() : null
            }

            const { data, error: updateError } = await supabase
                .from('sets')
                .update(updateData)
                .eq('id', setId)
                .select()
                .single()

            if (updateError) throw updateError

            return { data, error: null }
        } catch (err) {
            console.error('Error updating set:', err)
            setError(err.message)
            return { data: null, error: err.message }
        } finally {
            setLoading(false)
        }
    }, [])

    const deleteSet = useCallback(async (setId) => {
        try {
            setLoading(true)

            const { error: deleteError } = await supabase
                .from('sets')
                .delete()
                .eq('id', setId)

            if (deleteError) throw deleteError

            return { error: null }
        } catch (err) {
            console.error('Error deleting set:', err)
            setError(err.message)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }, [])

    const toggleSetComplete = useCallback(async (setId, isCompleted) => {
        return updateSet(setId, { is_completed: !isCompleted })
    }, [updateSet])

    const duplicateSet = useCallback(async (workoutExerciseId, previousSet) => {
        return addSet(
            workoutExerciseId,
            previousSet?.weight || 0,
            previousSet?.reps || 0
        )
    }, [addSet])

    return {
        loading,
        error,
        addSet,
        updateSet,
        deleteSet,
        toggleSetComplete,
        duplicateSet
    }
}
