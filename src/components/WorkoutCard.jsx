import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import GlassCard from './GlassCard'
import ConfirmDialog from './ConfirmDialog'
import './WorkoutCard.css'

export default function WorkoutCard({ workout, onDelete }) {
    const navigate = useNavigate()
    const { deleteWorkout } = useWorkouts()
    const [showMenu, setShowMenu] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const exerciseNames = workout.workout_exercises
        ?.map(we => we.exercise?.name)
        .filter(Boolean) || []

    const handleCardClick = () => {
        if (!showMenu) {
            navigate(`/workout/${workout.id}`)
        }
    }

    const handleStartClick = (e) => {
        e.stopPropagation()
        navigate(`/workout/${workout.id}`)
    }

    const handleMenuClick = (e) => {
        e.stopPropagation()
        setShowMenu(!showMenu)
    }

    const handleEdit = (e) => {
        e.stopPropagation()
        setShowMenu(false)
        navigate(`/edit-workout/${workout.id}`)
    }

    const handleDeleteClick = (e) => {
        e.stopPropagation()
        setShowMenu(false)
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async () => {
        const result = await deleteWorkout(workout.id)
        if (result.error) {
            console.error('Failed to delete workout:', result.error)
            alert('Failed to delete workout: ' + result.error)
            setShowDeleteConfirm(false)
        } else {
            // Reload to home page showing today's date
            window.location.href = '/'
        }
    }

    return (
        <>
            <GlassCard
                className="workout-card"
                color={workout.color}
                onClick={handleCardClick}
                animate
            >
                <div className="workout-card-header">
                    <h3 className="workout-card-title">{workout.name}</h3>
                    <div className="workout-card-actions">
                        <button
                            className="btn btn-ghost btn-icon workout-menu-btn"
                            onClick={handleMenuClick}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                            </svg>
                        </button>
                        <button
                            className="btn btn-primary btn-start"
                            onClick={handleStartClick}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            Start
                        </button>
                    </div>
                </div>

                {showMenu && (
                    <div className="workout-dropdown-menu" onClick={e => e.stopPropagation()}>
                        <button className="dropdown-item" onClick={handleEdit}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit Workout
                        </button>
                        <button className="dropdown-item dropdown-item-danger" onClick={handleDeleteClick}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete Workout
                        </button>
                    </div>
                )}

                {exerciseNames.length > 0 && (
                    <div className="workout-card-exercises">
                        {exerciseNames.map((name, index) => (
                            <div key={index} className="workout-exercise-item">
                                <span className="workout-exercise-dot" style={{ background: workout.color }} />
                                <span className="workout-exercise-name">{name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {workout.is_completed && (
                    <div className="workout-completed-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Completed
                    </div>
                )}
            </GlassCard>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Workout"
                message={`Are you sure you want to delete "${workout.name}"? This cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    )
}
