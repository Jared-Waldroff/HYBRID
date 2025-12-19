import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import { useExercises } from '../hooks/useExercises'
import ExerciseSelector from '../components/ExerciseSelector'
import ExerciseForm from '../components/ExerciseForm'
import GlassCard from '../components/GlassCard'
import './CreateWorkoutPage.css'

const WORKOUT_COLORS = [
    { name: 'Navy', value: '#1e3a5f' },
    { name: 'Copper', value: '#c9a227' },
    { name: 'Teal', value: '#115e59' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Purple', value: '#6366f1' }
]

export default function CreateWorkoutPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const initialDate = location.state?.date || new Date().toISOString().split('T')[0]

    const { createWorkout } = useWorkouts()
    const { exercises, createExercise } = useExercises()

    const [name, setName] = useState('')
    const [date, setDate] = useState(initialDate)
    const [color, setColor] = useState(WORKOUT_COLORS[0].value)
    const [selectedExerciseIds, setSelectedExerciseIds] = useState([])
    const [showExerciseForm, setShowExerciseForm] = useState(false)
    const [newExerciseName, setNewExerciseName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Please enter a workout name')
            return
        }

        if (selectedExerciseIds.length === 0) {
            setError('Please select at least one exercise')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: createError } = await createWorkout(
                { name: name.trim(), scheduled_date: date, color },
                selectedExerciseIds
            )

            if (createError) throw new Error(createError)

            navigate('/')
        } catch (err) {
            setError(err.message || 'Failed to create workout')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateExercise = (searchTerm) => {
        setNewExerciseName(searchTerm)
        setShowExerciseForm(true)
    }

    const handleSaveExercise = async (exerciseData) => {
        const { data, error } = await createExercise(exerciseData)
        if (data && !error) {
            setSelectedExerciseIds(prev => [...prev, data.id])
        }
    }

    return (
        <div className="create-workout-page">
            <header className="create-header glass safe-top">
                <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className="create-title">New Workout</h1>
                <div style={{ width: 40 }} />
            </header>

            <main className="create-content">
                <form onSubmit={handleSubmit}>
                    <GlassCard className="form-section">
                        <div className="input-group">
                            <label className="input-label">Workout Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Push Day, Leg Day"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Date</label>
                            <input
                                type="date"
                                className="input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Color</label>
                            <div className="color-options">
                                {WORKOUT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        className={`color-option ${color === c.value ? 'selected' : ''}`}
                                        style={{ background: c.value }}
                                        onClick={() => setColor(c.value)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="form-section">
                        <h3 className="section-title">Select Exercises</h3>
                        <ExerciseSelector
                            exercises={exercises}
                            selectedIds={selectedExerciseIds}
                            onSelectionChange={setSelectedExerciseIds}
                            onCreateNew={handleCreateExercise}
                        />
                    </GlassCard>

                    {error && (
                        <p className="form-error">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner" />
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Create Workout
                            </>
                        )}
                    </button>
                </form>
            </main>

            <ExerciseForm
                isOpen={showExerciseForm}
                exercise={newExerciseName ? { name: newExerciseName } : null}
                onSave={handleSaveExercise}
                onClose={() => {
                    setShowExerciseForm(false)
                    setNewExerciseName('')
                }}
            />
        </div>
    )
}
