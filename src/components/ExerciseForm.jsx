import { useState, useEffect } from 'react'
import './ExerciseForm.css'

const DEFAULT_MUSCLE_GROUPS = [
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
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [muscleGroup, setMuscleGroup] = useState('Other')
    const [customMuscleGroup, setCustomMuscleGroup] = useState('')
    const [showCustomInput, setShowCustomInput] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEdit = !!exercise?.id

    // Reset form when exercise changes
    useEffect(() => {
        if (isOpen) {
            setName(exercise?.name || '')
            setDescription(exercise?.description || '')
            const group = exercise?.muscle_group || 'Other'
            // Check if the muscle group is custom (not in default list)
            if (group && !DEFAULT_MUSCLE_GROUPS.includes(group)) {
                setShowCustomInput(true)
                setCustomMuscleGroup(group)
                setMuscleGroup('')
            } else {
                setShowCustomInput(false)
                setMuscleGroup(group)
                setCustomMuscleGroup('')
            }
            setError('')
        }
    }, [isOpen, exercise])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Exercise name is required')
            return
        }

        const finalMuscleGroup = showCustomInput && customMuscleGroup.trim()
            ? customMuscleGroup.trim()
            : muscleGroup

        if (!finalMuscleGroup) {
            setError('Please select or enter a muscle group')
            return
        }

        setLoading(true)
        setError('')

        try {
            await onSave({
                name: name.trim(),
                description: description.trim() || null,
                muscle_group: finalMuscleGroup
            })
            onClose()
        } catch (err) {
            setError(err.message || 'Failed to save exercise')
        } finally {
            setLoading(false)
        }
    }

    const handleMuscleGroupClick = (group) => {
        setMuscleGroup(group)
        setShowCustomInput(false)
        setCustomMuscleGroup('')
    }

    const handleAddCustomClick = () => {
        setShowCustomInput(true)
        setMuscleGroup('')
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
                        <label className="input-label">Description <span className="optional-label">(optional)</span></label>
                        <textarea
                            className="input description-input"
                            placeholder="Add notes, form tips, or instructions..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Muscle Group</label>
                        <div className="muscle-group-grid">
                            {DEFAULT_MUSCLE_GROUPS.map(group => (
                                <button
                                    key={group}
                                    type="button"
                                    className={`muscle-option ${muscleGroup === group && !showCustomInput ? 'selected' : ''}`}
                                    onClick={() => handleMuscleGroupClick(group)}
                                >
                                    {group}
                                </button>
                            ))}
                            <button
                                type="button"
                                className={`muscle-option add-custom ${showCustomInput ? 'selected' : ''}`}
                                onClick={handleAddCustomClick}
                            >
                                + Custom
                            </button>
                        </div>

                        {showCustomInput && (
                            <input
                                type="text"
                                className="input custom-muscle-input"
                                placeholder="Enter custom muscle group..."
                                value={customMuscleGroup}
                                onChange={(e) => setCustomMuscleGroup(e.target.value)}
                            />
                        )}
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
