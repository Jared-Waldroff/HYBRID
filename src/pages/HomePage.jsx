import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import { getRandomCrossFitWorkout } from '../data/crossfitWorkouts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import WorkoutCard from '../components/WorkoutCard'
import CrossFitWorkoutCard from '../components/CrossFitWorkoutCard'
import GlassCard from '../components/GlassCard'
import './HomePage.css'

export default function HomePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { workouts, loading } = useWorkouts()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [touchStart, setTouchStart] = useState(null)
    const [touchEnd, setTouchEnd] = useState(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [slideDirection, setSlideDirection] = useState(null)
    const [crossfitWorkouts, setCrossfitWorkouts] = useState({}) // date -> workout
    const containerRef = useRef(null)

    const minSwipeDistance = 50

    // Handle date passed from calendar
    useEffect(() => {
        if (location.state?.date) {
            const selectedDate = new Date(location.state.date + 'T12:00:00')
            setCurrentDate(selectedDate)
            // Clear the state so it doesn't persist on refresh
            navigate(location.pathname, { replace: true, state: {} })
        }
    }, [location.state, navigate, location.pathname])

    // Load CrossFit workouts from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('crossfitWorkouts')
        if (saved) {
            setCrossfitWorkouts(JSON.parse(saved))
        }
    }, [])

    // Save CrossFit workouts to localStorage
    const saveCrossfitWorkouts = (workouts) => {
        setCrossfitWorkouts(workouts)
        localStorage.setItem('crossfitWorkouts', JSON.stringify(workouts))
    }

    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0]
    }

    const getWorkoutsForDate = (date) => {
        const dateStr = formatDateKey(date)
        return workouts.filter(w => w.scheduled_date === dateStr)
    }

    const currentWorkouts = getWorkoutsForDate(currentDate)
    const currentDateKey = formatDateKey(currentDate)
    const currentCrossfitWorkout = crossfitWorkouts[currentDateKey]

    const addRandomCrossFitWorkout = () => {
        const workout = getRandomCrossFitWorkout()
        const newWorkouts = {
            ...crossfitWorkouts,
            [currentDateKey]: workout
        }
        saveCrossfitWorkouts(newWorkouts)
    }

    const shuffleCrossFitWorkout = () => {
        addRandomCrossFitWorkout()
    }

    const removeCrossFitWorkout = () => {
        const newWorkouts = { ...crossfitWorkouts }
        delete newWorkouts[currentDateKey]
        saveCrossfitWorkouts(newWorkouts)
    }

    const navigateDay = (direction) => {
        if (isAnimating) return

        // Start slide animation
        setIsAnimating(true)
        setSlideDirection(direction > 0 ? 'up' : 'down')

        // After animation, change the date
        setTimeout(() => {
            const newDate = new Date(currentDate)
            newDate.setDate(newDate.getDate() + direction)
            setCurrentDate(newDate)
            setSlideDirection(null)
            setIsAnimating(false)
        }, 300)
    }

    const onTouchStart = (e) => {
        if (isAnimating) return
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientY)
        setSwipeOffset(0)
    }

    const onTouchMove = (e) => {
        if (isAnimating || !touchStart) return
        const currentY = e.targetTouches[0].clientY
        setTouchEnd(currentY)
        // Calculate real-time offset for visual feedback
        const offset = (touchStart - currentY) * 0.5 // Dampen the movement
        setSwipeOffset(Math.max(-100, Math.min(100, offset)))
    }

    const onTouchEnd = () => {
        if (isAnimating) return
        setSwipeOffset(0)

        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isUpSwipe = distance > minSwipeDistance
        const isDownSwipe = distance < -minSwipeDistance

        if (isUpSwipe) {
            navigateDay(1) // Next day
        } else if (isDownSwipe) {
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

    const getSlideClass = () => {
        if (!slideDirection) return ''
        return slideDirection === 'up' ? 'slide-out-up' : 'slide-out-down'
    }

    const hasContent = currentWorkouts.length > 0 || currentCrossfitWorkout

    return (
        <div className="home-page">
            <Header />

            <main
                className="home-content"
                ref={containerRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="date-display">
                    <button
                        className="date-nav-btn"
                        onClick={() => navigateDay(-1)}
                        disabled={isAnimating}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    </button>
                    <span className="current-date-text">{formatDisplayDate(currentDate)}</span>
                    <button
                        className="date-nav-btn"
                        onClick={() => navigateDay(1)}
                        disabled={isAnimating}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                </div>

                <div className="swipe-hint">
                    <span>Swipe up/down to change days</span>
                </div>

                <div
                    className={`workout-container ${getSlideClass()}`}
                    style={{
                        transform: swipeOffset && !isAnimating ? `translateY(${-swipeOffset}px)` : undefined,
                        opacity: swipeOffset ? 1 - Math.abs(swipeOffset) / 150 : 1
                    }}
                >
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner" />
                            <p>Loading workouts...</p>
                        </div>
                    ) : hasContent ? (
                        <div className="workouts-list">
                            {currentCrossfitWorkout && (
                                <CrossFitWorkoutCard
                                    workout={currentCrossfitWorkout}
                                    onDelete={removeCrossFitWorkout}
                                    onShuffle={shuffleCrossFitWorkout}
                                />
                            )}
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
                </div>
            </main>

            {/* CF Button - Add random CrossFit Open workout */}
            <button
                className="fab cf-fab"
                onClick={addRandomCrossFitWorkout}
                aria-label="Add CrossFit Open workout"
            >
                <span className="cf-fab-text">CF</span>
            </button>

            {/* Plus Button - Create custom workout */}
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
