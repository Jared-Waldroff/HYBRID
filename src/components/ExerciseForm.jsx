import { useState } from 'react'
import './ExerciseForm.css'

const MUSCLE_GROUPS = [
    'Chest',
    'Back',
    'Shoulders',
    'Arms',
    'Legs',
    'Core',
    'Cardio',
    'Other'
]

export default function ExerciseForm({
    isOpen,
    exercise = null,
    onSave,
    onClose
}) {
    const [name, setName] = useState(exercise?.name || '')
    const [muscleGroup, setMuscleGroup] = useState(exercise?.muscle_group || 'Other')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEdit = !!exercise

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Exercise name is required')
            return
        }

        setLoading(true)
        setError('')

        try {
            await onSave({
                name: name.trim(),
                muscle_group: muscleGroup
            })
            onClose()
        } catch (err) {
            setError(err.message || 'Failed to save exercise')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="overlay" onClick={onClose} />
            <div className="modal glass exercise-form">
                <h3 className="form-title">
                    {isEdit ? 'Edit Exercise' : 'New Exercise'}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Exercise Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g., Dumbbell Press"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Muscle Group</label>
                        <div className="muscle-group-grid">
                            {MUSCLE_GROUPS.map(group => (
                                <button
                                    key={group}
                                    type="button"
                                    className={`muscle-option ${muscleGroup === group ? 'selected' : ''}`}
                                    onClick={() => setMuscleGroup(group)}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="form-error">{error}</p>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" style={{ width: 16, height: 16 }} />
                            ) : (
                                isEdit ? 'Save Changes' : 'Create Exercise'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
