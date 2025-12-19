import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import WorkoutCard from '../components/WorkoutCard'
import GlassCard from '../components/GlassCard'
import './HomePage.css'

export default function HomePage() {
    const navigate = useNavigate()
    const { workouts, loading, fetchWorkouts } = useWorkouts()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [touchStart, setTouchStart] = useState(null)
    const [touchEnd, setTouchEnd] = useState(null)
    const containerRef = useRef(null)

    // Minimum swipe distance for navigation
    const minSwipeDistance = 50

    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0]
    }

    const getWorkoutsForDate = useCallback((date) => {
        const dateStr = formatDateKey(date)
        return workouts.filter(w => w.scheduled_date === dateStr)
    }, [workouts])

    const currentWorkouts = getWorkoutsForDate(currentDate)

    const navigateDay = (direction) => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + direction)
        setCurrentDate(newDate)
    }

    const onTouchStart = (e) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientY)
    }

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientY)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isUpSwipe = distance > minSwipeDistance
        const isDownSwipe = distance < -minSwipeDistance

        if (isUpSwipe) {
            navigateDay(1) // Next day
        }
        if (isDownSwipe) {
            navigateDay(-1) // Previous day
        }
    }

    const handleCreateWorkout = () => {
        navigate('/create-workout', { state: { date: formatDateKey(currentDate) } })
    }

    const isToday = (date) => {
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const formatDisplayDate = (date) => {
        if (isToday(date)) return 'Today'

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="home-page">
            <Header showDate date={currentDate} />

            <main
                className="home-content"
                ref={containerRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="date-display">
                    <button className="date-nav-btn" onClick={() => navigateDay(-1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    </button>
                    <span className="current-date-text">{formatDisplayDate(currentDate)}</span>
                    <button className="date-nav-btn" onClick={() => navigateDay(1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                </div>

                <div className="swipe-hint">
                    <span>Swipe up/down to change days</span>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p>Loading workouts...</p>
                    </div>
                ) : currentWorkouts.length > 0 ? (
                    <div className="workouts-list">
                        {currentWorkouts.map(workout => (
                            <WorkoutCard key={workout.id} workout={workout} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-day">
                        <GlassCard className="empty-card">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <h3>Rest Day</h3>
                            <p>No workouts scheduled for {formatDisplayDate(currentDate).toLowerCase()}</p>
                            <button
                                className="btn btn-primary mt-md"
                                onClick={handleCreateWorkout}
                            >
                                Schedule Workout
                            </button>
                        </GlassCard>
                    </div>
                )}
            </main>

            <button
                className="fab"
                onClick={handleCreateWorkout}
                aria-label="Create workout"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <Footer />
        </div>
    )
}
