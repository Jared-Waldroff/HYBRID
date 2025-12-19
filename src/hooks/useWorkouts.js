import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useWorkouts() {
    const { user } = useAuth()
    const [workouts, setWorkouts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchWorkouts = useCallback(async (startDate = null, endDate = null) => {
        if (!user) return

        try {
            setLoading(true)
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
                .order('scheduled_date', { ascending: true })

            if (startDate) {
                query = query.gte('scheduled_date', startDate)
            }
            if (endDate) {
                query = query.lte('scheduled_date', endDate)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            // Sort workout exercises by order_index
            const sortedData = data?.map(workout => ({
                ...workout,
                workout_exercises: workout.workout_exercises?.sort((a, b) => a.order_index - b.order_index)
            }))

            setWorkouts(sortedData || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching workouts:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user])

    const getWorkoutById = async (id) => {
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
                .single()

            if (fetchError) throw fetchError

            // Sort workout exercises and sets
            if (data) {
                data.workout_exercises = data.workout_exercises
                    ?.sort((a, b) => a.order_index - b.order_index)
                    .map(we => ({
                        ...we,
                        sets: we.sets?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    }))
            }

            return { data, error: null }
        } catch (err) {
            console.error('Error fetching workout:', err)
            return { data: null, error: err.message }
        }
    }

    const createWorkout = async (workout, exerciseIds) => {
        if (!user) return { error: 'Not authenticated' }

        try {
            // Create the workout
            const { data: newWorkout, error: workoutError } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    name: workout.name,
                    scheduled_date: workout.scheduled_date,
                    color: workout.color || '#1e3a5f'
                })
                .select()
                .single()

            if (workoutError) throw workoutError

            // Add exercises to the workout
            if (exerciseIds && exerciseIds.length > 0) {
                const workoutExercises = exerciseIds.map((exerciseId, index) => ({
                    workout_id: newWorkout.id,
                    exercise_id: exerciseId,
                    order_index: index
                }))

                const { error: exerciseError } = await supabase
                    .from('workout_exercises')
                    .insert(workoutExercises)

                if (exerciseError) throw exerciseError

                // Add default sets for each exercise (3 sets)
                const defaultSets = []
                for (const we of workoutExercises) {
                    const { data: weData } = await supabase
                        .from('workout_exercises')
                        .select('id')
                        .eq('workout_id', newWorkout.id)
                        .eq('exercise_id', we.exercise_id)
                        .single()

                    if (weData) {
                        for (let i = 0; i < 3; i++) {
                            defaultSets.push({
                                workout_exercise_id: weData.id,
                                weight: 0,
                                reps: 0,
                                is_completed: false
                            })
                        }
                    }
                }

                if (defaultSets.length > 0) {
                    await supabase.from('sets').insert(defaultSets)
                }
            }

            await fetchWorkouts()
            return { data: newWorkout, error: null }
        } catch (err) {
            console.error('Error creating workout:', err)
            return { data: null, error: err.message }
        }
    }

    const updateWorkout = async (id, updates) => {
        try {
            const { data, error: updateError } = await supabase
                .from('workouts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            await fetchWorkouts()
            return { data, error: null }
        } catch (err) {
            console.error('Error updating workout:', err)
            return { data: null, error: err.message }
        }
    }

    const deleteWorkout = async (id) => {
        try {
            const { error: deleteError } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            await fetchWorkouts()
            return { error: null }
        } catch (err) {
            console.error('Error deleting workout:', err)
            return { error: err.message }
        }
    }

    const getWorkoutsByDate = (date) => {
        const dateStr = date.toISOString().split('T')[0]
        return workouts.filter(w => w.scheduled_date === dateStr)
    }

    useEffect(() => {
        if (user) {
            fetchWorkouts()
        }
    }, [user, fetchWorkouts])

    return {
        workouts,
        loading,
        error,
        fetchWorkouts,
        getWorkoutById,
        createWorkout,
        updateWorkout,
        deleteWorkout,
        getWorkoutsByDate
    }
}
