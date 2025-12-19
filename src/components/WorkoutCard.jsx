import { useNavigate } from 'react-router-dom'
import GlassCard from './GlassCard'
import './WorkoutCard.css'

export default function WorkoutCard({ workout, onStart }) {
    const navigate = useNavigate()

    const exerciseNames = workout.workout_exercises
        ?.map(we => we.exercise?.name)
        .filter(Boolean) || []

    const handleCardClick = () => {
        navigate(`/workout/${workout.id}`)
    }

    const handleStartClick = (e) => {
        e.stopPropagation()
        navigate(`/workout/${workout.id}`)
    }

    return (
        <GlassCard
            className="workout-card"
            color={workout.color}
            onClick={handleCardClick}
            animate
        >
            <div className="workout-card-header">
                <h3 className="workout-card-title">{workout.name}</h3>
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
    )
}
