import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useExercises() {
    const { user } = useAuth()
    const [exercises, setExercises] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchExercises = useCallback(async () => {
        try {
            setLoading(true)

            // Fetch all exercises (default ones + user's custom ones)
            // RLS policy handles the filtering
            const { data, error: fetchError } = await supabase
                .from('exercises')
                .select('*')
                .order('name', { ascending: true })

            if (fetchError) throw fetchError

            setExercises(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching exercises:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const createExercise = async (exercise) => {
        if (!user) return { error: 'Not authenticated' }

        try {
            const { data, error: createError } = await supabase
                .from('exercises')
                .insert({
                    name: exercise.name,
                    muscle_group: exercise.muscle_group,
                    is_default: false,
                    user_id: user.id
                })
                .select()
                .single()

            if (createError) throw createError

            await fetchExercises()
            return { data, error: null }
        } catch (err) {
            console.error('Error creating exercise:', err)
            return { data: null, error: err.message }
        }
    }

    const updateExercise = async (id, updates) => {
        try {
            const { data, error: updateError } = await supabase
                .from('exercises')
                .update({
                    name: updates.name,
                    muscle_group: updates.muscle_group
                })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            await fetchExercises()
            return { data, error: null }
        } catch (err) {
            console.error('Error updating exercise:', err)
            return { data: null, error: err.message }
        }
    }

    const deleteExercise = async (id) => {
        try {
            const { error: deleteError } = await supabase
                .from('exercises')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            await fetchExercises()
            return { error: null }
        } catch (err) {
            console.error('Error deleting exercise:', err)
            return { error: err.message }
        }
    }

    const getExerciseStats = async (exerciseId) => {
        if (!user) return { data: null, error: 'Not authenticated' }

        try {
            // Get all sets for this exercise from user's workouts
            const { data: setsData, error: setsError } = await supabase
                .from('sets')
                .select(`
          weight,
          reps,
          is_completed,
          completed_at,
          workout_exercise:workout_exercises!inner (
            exercise_id,
            workout:workouts!inner (
              user_id,
              scheduled_date
            )
          )
        `)
                .eq('workout_exercise.exercise_id', exerciseId)
                .eq('workout_exercise.workout.user_id', user.id)
                .eq('is_completed', true)
                .order('completed_at', { ascending: true })

            if (setsError) throw setsError

            const completedSets = setsData || []

            // Calculate stats
            let pr = 0
            let totalSessions = new Set()
            let totalVolume = 0
            let totalReps = 0

            completedSets.forEach(set => {
                const weight = parseFloat(set.weight) || 0
                const reps = parseInt(set.reps) || 0

                if (weight > pr) pr = weight

                if (set.workout_exercise?.workout?.scheduled_date) {
                    totalSessions.add(set.workout_exercise.workout.scheduled_date)
                }

                totalVolume += weight * reps
                totalReps += reps
            })

            const stats = {
                pr,
                sessions: totalSessions.size,
                totalVolume,
                totalReps,
                averageWeight: completedSets.length > 0
                    ? completedSets.reduce((acc, s) => acc + (parseFloat(s.weight) || 0), 0) / completedSets.length
                    : 0,
                history: completedSets
            }

            return { data: stats, error: null }
        } catch (err) {
            console.error('Error fetching exercise stats:', err)
            return { data: null, error: err.message }
        }
    }

    const getExerciseHistory = async (exerciseId, limit = 20) => {
        if (!user) return { data: null, error: 'Not authenticated' }

        try {
            const { data, error: historyError } = await supabase
                .from('sets')
                .select(`
          id,
          weight,
          reps,
          completed_at,
          workout_exercise:workout_exercises!inner (
            exercise_id,
            workout:workouts!inner (
              user_id,
              scheduled_date,
              name
            )
          )
        `)
                .eq('workout_exercise.exercise_id', exerciseId)
                .eq('workout_exercise.workout.user_id', user.id)
                .eq('is_completed', true)
                .order('completed_at', { ascending: false })
                .limit(limit)

            if (historyError) throw historyError

            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error fetching exercise history:', err)
            return { data: null, error: err.message }
        }
    }

    // Group exercises by muscle group
    const groupedExercises = exercises.reduce((acc, exercise) => {
        const group = exercise.muscle_group || 'Other'
        if (!acc[group]) acc[group] = []
        acc[group].push(exercise)
        return acc
    }, {})

    // Separate default and custom exercises
    const defaultExercises = exercises.filter(e => e.is_default)
    const customExercises = exercises.filter(e => !e.is_default)

    useEffect(() => {
        fetchExercises()
    }, [fetchExercises])

    return {
        exercises,
        groupedExercises,
        defaultExercises,
        customExercises,
        loading,
        error,
        fetchExercises,
        createExercise,
        updateExercise,
        deleteExercise,
        getExerciseStats,
        getExerciseHistory
    }
}
