import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets'
import { useExercises } from '../hooks/useExercises'
import ConfirmDialog from './ConfirmDialog'
import './ExerciseSection.css'

export default function ExerciseSection({
    workoutExercise,
    onUpdate
}) {
    const navigate = useNavigate()
    const { addSet, updateSet, deleteSet, toggleSetComplete, duplicateSet } = useSets()
    const { getExerciseHistory } = useExercises()
    const [sets, setSets] = useState(workoutExercise.sets || [])
    const [history, setHistory] = useState([])
    const [showHistory, setShowHistory] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, setId: null })
    const [isExpanded, setIsExpanded] = useState(true)

    const exercise = workoutExercise.exercise

    useEffect(() => {
        setSets(workoutExercise.sets || [])
    }, [workoutExercise.sets])

    const loadHistory = async () => {
        if (!showHistory && history.length === 0) {
            const { data } = await getExerciseHistory(exercise.id, 5)
            if (data) {
                setHistory(data)
            }
        }
        setShowHistory(!showHistory)
    }

    const handleSetChange = async (setId, field, value) => {
        // Update locally first for responsiveness
        setSets(prev => prev.map(s =>
            s.id === setId ? { ...s, [field]: value } : s
        ))

        // Then update in database
        await updateSet(setId, { [field]: parseFloat(value) || 0 })
        onUpdate?.()
    }

    const handleToggleComplete = async (set) => {
        setSets(prev => prev.map(s =>
            s.id === set.id ? { ...s, is_completed: !s.is_completed } : s
        ))
        await toggleSetComplete(set.id, set.is_completed)
        onUpdate?.()
    }

    const handleAddSet = async () => {
        const lastSet = sets[sets.length - 1]
        const { data } = await duplicateSet(workoutExercise.id, lastSet)
        if (data) {
            setSets(prev => [...prev, data])
            onUpdate?.()
        }
    }

    const handleDeleteSet = async () => {
        if (deleteConfirm.setId) {
            await deleteSet(deleteConfirm.setId)
            setSets(prev => prev.filter(s => s.id !== deleteConfirm.setId))
            setDeleteConfirm({ open: false, setId: null })
            onUpdate?.()
        }
    }

    const handleExerciseClick = () => {
        navigate(`/exercise/${exercise.id}`)
    }

    return (
        <div className="exercise-section glass-subtle">
            <div className="exercise-section-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="exercise-info" onClick={(e) => { e.stopPropagation(); handleExerciseClick(); }}>
                    <h4 className="exercise-name">{exercise?.name}</h4>
                    <span className="exercise-muscle">{exercise?.muscle_group}</span>
                </div>
                <button className={`expand-btn ${isExpanded ? 'expanded' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            </div>

            {isExpanded && (
                <>
                    <div className="sets-table">
                        <div className="sets-header">
                            <span className="set-col-num">Set</span>
                            <span className="set-col-weight">lbs</span>
                            <span className="set-col-reps">Reps</span>
                            <span className="set-col-check"></span>
                            <span className="set-col-delete"></span>
                        </div>

                        {sets.map((set, index) => (
                            <div key={set.id} className={`set-row ${set.is_completed ? 'completed' : ''}`}>
                                <span className="set-col-num">{index + 1}</span>
                                <input
                                    type="number"
                                    className="set-input set-col-weight"
                                    value={set.weight || ''}
                                    onChange={(e) => handleSetChange(set.id, 'weight', e.target.value)}
                                    placeholder="0"
                                />
                                <input
                                    type="number"
                                    className="set-input set-col-reps"
                                    value={set.reps || ''}
                                    onChange={(e) => handleSetChange(set.id, 'reps', e.target.value)}
                                    placeholder="0"
                                />
                                <button
                                    className={`set-check ${set.is_completed ? 'checked' : ''}`}
                                    onClick={() => handleToggleComplete(set)}
                                >
                                    {set.is_completed && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    className="set-delete"
                                    onClick={() => setDeleteConfirm({ open: true, setId: set.id })}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button className="btn btn-ghost add-set-btn" onClick={handleAddSet}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Set
                    </button>

                    <button className="btn btn-ghost history-btn" onClick={loadHistory}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {showHistory ? 'Hide History' : 'Show History'}
                    </button>

                    {showHistory && history.length > 0 && (
                        <div className="exercise-history">
                            <h5 className="history-title">Recent History</h5>
                            {history.map((h, i) => (
                                <div key={i} className="history-item">
                                    <span className="history-date">
                                        {new Date(h.completed_at).toLocaleDateString()}
                                    </span>
                                    <span className="history-stats">
                                        {h.weight} lbs × {h.reps} reps
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showHistory && history.length === 0 && (
                        <p className="text-sm text-tertiary text-center mt-sm">No history yet</p>
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={deleteConfirm.open}
                title="Delete Set"
                message="Are you sure you want to delete this set?"
                confirmText="Delete"
                variant="danger"
                onConfirm={handleDeleteSet}
                onCancel={() => setDeleteConfirm({ open: false, setId: null })}
            />
        </div>
    )
}
