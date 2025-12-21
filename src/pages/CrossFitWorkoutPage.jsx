import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import WorkoutTimer from '../components/WorkoutTimer'
import GlassCard from '../components/GlassCard'
import Footer from '../components/Footer'
import './CrossFitWorkoutPage.css'

export default function CrossFitWorkoutPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const workout = location.state?.workout
    const [isComplete, setIsComplete] = useState(false)

    // Parse time cap from format string (e.g., "For Time (15-minute cap)" -> 900 seconds)
    const parseTimeCap = (format) => {
        if (!format) return null

        // Match patterns like "15-minute cap", "20-minute cap", "12 min cap"
        const capMatch = format.match(/(\d+)[- ]?min(?:ute)?[s]?\s*cap/i)
        if (capMatch) {
            return parseInt(capMatch[1]) * 60
        }

        // Match AMRAP patterns like "15-minute AMRAP", "20 min AMRAP"
        const amrapMatch = format.match(/(\d+)[- ]?min(?:ute)?[s]?\s*AMRAP/i)
        if (amrapMatch) {
            return parseInt(amrapMatch[1]) * 60
        }

        return null
    }

    // Determine timer mode based on workout format
    const getTimerConfig = () => {
        if (!workout?.format) return { mode: 'countup', seconds: 0 }

        const format = workout.format.toLowerCase()
        const timeCap = parseTimeCap(workout.format)

        // AMRAP = countup with time limit display
        if (format.includes('amrap')) {
            return { mode: 'countdown', seconds: timeCap || 0 }
        }

        // For Time = countdown from cap
        if (format.includes('for time') && timeCap) {
            return { mode: 'countdown', seconds: timeCap }
        }

        // Default to countup
        return { mode: 'countup', seconds: 0 }
    }

    const timerConfig = getTimerConfig()

    if (!workout) {
        return (
            <div className="cf-workout-page">
                <div className="error-container">
                    <p>Workout not found</p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="cf-workout-page">
            <header className="cf-page-header glass safe-top">
                <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="cf-page-header-info">
                    <h1 className="cf-page-title">{workout.name}</h1>
                    <span className="cf-page-subtitle">{workout.subtitle}</span>
                </div>
                <div className="cf-page-year-badge">
                    <span className="cf-badge-text">CF</span>
                    <span className="cf-badge-year">{workout.year}</span>
                </div>
            </header>

            <main className="cf-page-content">
                {/* Timer Section */}
                <WorkoutTimer
                    initialSeconds={timerConfig.seconds}
                    mode={timerConfig.mode}
                    onComplete={() => setIsComplete(true)}
                />

                {/* Format Badge */}
                <div className="cf-page-format">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{workout.format}</span>
                </div>

                {/* Workout Description */}
                <GlassCard className="cf-page-description-card">
                    <h3 className="cf-section-title">Workout</h3>
                    <div className="cf-page-description">
                        {workout.description.split('\n').map((line, i) => (
                            <p key={i} className={line.startsWith('  ') ? 'indented' : ''}>
                                {line || '\u00A0'}
                            </p>
                        ))}
                    </div>
                </GlassCard>

                {/* Rx Weights */}
                <GlassCard className="cf-page-weights-card">
                    <h3 className="cf-section-title">Rx Weights</h3>
                    <div className="cf-page-weights">
                        <div className="cf-weight-box">
                            <span className="cf-weight-label">♂ Men</span>
                            <span className="cf-weight-value">{workout.rxWeights.male}</span>
                        </div>
                        <div className="cf-weight-box">
                            <span className="cf-weight-label">♀ Women</span>
                            <span className="cf-weight-value">{workout.rxWeights.female}</span>
                        </div>
                    </div>
                </GlassCard>

                {/* Complete Button */}
                <button
                    className={`btn btn-lg w-full cf-complete-btn ${isComplete ? 'completed' : ''}`}
                    onClick={() => setIsComplete(!isComplete)}
                >
                    {isComplete ? (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            Workout Complete!
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Mark Complete
                        </>
                    )}
                </button>
            </main>

            <Footer />
        </div>
    )
}
