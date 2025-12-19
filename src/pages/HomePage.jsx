import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import { getRandomCrossFitWorkout } from '../data/crossfitWorkouts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import WorkoutCard from '../components/WorkoutCard'
import CrossFitWorkoutCard from '../components/CrossFitWorkoutCard'
import GlassCard from '../components/GlassCard'
import './HomePage.css'

// Generate array of dates around a center date
function generateDateRange(centerDate, daysBefore = 7, daysAfter = 7) {
    const dates = []
    const center = new Date(centerDate)
    center.setHours(12, 0, 0, 0)

    for (let i = -daysBefore; i <= daysAfter; i++) {
        const d = new Date(center)
        d.setDate(d.getDate() + i)
        dates.push(d)
    }
    return dates
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0]
}

function formatDisplayDate(date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)

    const diffTime = compareDate.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 1) return 'Tomorrow'

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    })
}

// Day Section Component with sticky header
function DaySection({
    date,
    workouts,
    crossfitWorkout,
    onCreateWorkout,
    onDeleteCF,
    onShuffleCF,
    isFirst,
    isLast
}) {
    const dateKey = formatDateKey(date)
    const hasContent = workouts.length > 0 || crossfitWorkout

    return (
        <div className="day-section" data-date={dateKey}>
            <div className="day-header">
                <span className="day-title">{formatDisplayDate(date)}</span>
                <span className="day-date-full">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>

            <div className="day-content">
                {hasContent ? (
                    <div className="day-workouts">
                        {crossfitWorkout && (
                            <CrossFitWorkoutCard
                                workout={crossfitWorkout}
                                onDelete={onDeleteCF}
                                onShuffle={onShuffleCF}
                            />
                        )}
                        {workouts.map(workout => (
                            <WorkoutCard key={workout.id} workout={workout} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-day-inline">
                        <div className="empty-day-content">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Rest Day</span>
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={onCreateWorkout}
                        >
                            + Add Workout
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function HomePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { workouts, loading } = useWorkouts()
    const [dates, setDates] = useState(() => generateDateRange(new Date(), 7, 7))
    const [crossfitWorkouts, setCrossfitWorkouts] = useState({})
    const [activeDate, setActiveDate] = useState(formatDateKey(new Date()))
    const scrollContainerRef = useRef(null)
    const headerObserverRef = useRef(null)
    const loadingMoreRef = useRef(false)

    // Load CrossFit workouts from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('crossfitWorkouts')
        if (saved) {
            setCrossfitWorkouts(JSON.parse(saved))
        }
    }, [])

    // Handle date from calendar navigation
    useEffect(() => {
        if (location.state?.date) {
            const targetDate = new Date(location.state.date + 'T12:00:00')
            setDates(generateDateRange(targetDate, 7, 7))
            setActiveDate(location.state.date)
            navigate(location.pathname, { replace: true, state: {} })

            // Scroll to the target date after render
            setTimeout(() => {
                const element = document.querySelector(`[data-date="${location.state.date}"]`)
                if (element) {
                    element.scrollIntoView({ behavior: 'auto', block: 'start' })
                }
            }, 100)
        }
    }, [location.state, navigate, location.pathname])

    // Setup intersection observer for sticky headers
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const dateKey = entry.target.getAttribute('data-date')
                    if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                        setActiveDate(dateKey)
                    }
                })
            },
            {
                root: container,
                rootMargin: '-60px 0px -80% 0px',
                threshold: [0.1, 0.5]
            }
        )

        headerObserverRef.current = observer

        // Observe all day sections
        const sections = container.querySelectorAll('.day-section')
        sections.forEach(section => observer.observe(section))

        return () => observer.disconnect()
    }, [dates])

    // Infinite scroll - load more dates
    const loadMoreDates = useCallback((direction) => {
        if (loadingMoreRef.current) return
        loadingMoreRef.current = true

        setDates(prevDates => {
            const newDates = [...prevDates]

            if (direction === 'past') {
                const firstDate = new Date(prevDates[0])
                for (let i = 7; i >= 1; i--) {
                    const d = new Date(firstDate)
                    d.setDate(d.getDate() - i)
                    newDates.unshift(d)
                }
            } else {
                const lastDate = new Date(prevDates[prevDates.length - 1])
                for (let i = 1; i <= 7; i++) {
                    const d = new Date(lastDate)
                    d.setDate(d.getDate() + i)
                    newDates.push(d)
                }
            }

            return newDates
        })

        setTimeout(() => {
            loadingMoreRef.current = false
        }, 500)
    }, [])

    // Handle scroll for infinite loading
    const handleScroll = useCallback((e) => {
        const container = e.target
        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight

        // Load more past dates when near top
        if (scrollTop < 200) {
            loadMoreDates('past')
        }

        // Load more future dates when near bottom
        if (scrollHeight - scrollTop - clientHeight < 200) {
            loadMoreDates('future')
        }
    }, [loadMoreDates])

    // Save CrossFit workouts to localStorage
    const saveCrossfitWorkouts = (workoutsData) => {
        setCrossfitWorkouts(workoutsData)
        localStorage.setItem('crossfitWorkouts', JSON.stringify(workoutsData))
    }

    const getWorkoutsForDate = (date) => {
        const dateStr = formatDateKey(date)
        return workouts.filter(w => w.scheduled_date === dateStr)
    }

    const addRandomCrossFitWorkout = () => {
        const workout = getRandomCrossFitWorkout()
        const newWorkouts = {
            ...crossfitWorkouts,
            [activeDate]: workout
        }
        saveCrossfitWorkouts(newWorkouts)
    }

    const removeCrossFitWorkout = (dateKey) => {
        const newWorkouts = { ...crossfitWorkouts }
        delete newWorkouts[dateKey]
        saveCrossfitWorkouts(newWorkouts)
    }

    const shuffleCrossFitWorkout = (dateKey) => {
        const workout = getRandomCrossFitWorkout()
        const newWorkouts = {
            ...crossfitWorkouts,
            [dateKey]: workout
        }
        saveCrossfitWorkouts(newWorkouts)
    }

    const handleCreateWorkout = () => {
        navigate('/create-workout', { state: { date: activeDate } })
    }

    // Scroll to today
    const scrollToToday = () => {
        const todayKey = formatDateKey(new Date())
        setDates(generateDateRange(new Date(), 7, 7))
        setActiveDate(todayKey)

        setTimeout(() => {
            const element = document.querySelector(`[data-date="${todayKey}"]`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }, 100)
    }

    return (
        <div className="home-page">
            <Header />

            <div className="sticky-date-indicator" onClick={scrollToToday}>
                <span className="indicator-text">{formatDisplayDate(new Date(activeDate + 'T12:00:00'))}</span>
                <span className="indicator-hint">tap to go to today</span>
            </div>

            <main
                className="home-content infinite-scroll"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p>Loading workouts...</p>
                    </div>
                ) : (
                    <div className="days-container">
                        {dates.map((date, index) => {
                            const dateKey = formatDateKey(date)
                            return (
                                <DaySection
                                    key={dateKey}
                                    date={date}
                                    workouts={getWorkoutsForDate(date)}
                                    crossfitWorkout={crossfitWorkouts[dateKey]}
                                    onCreateWorkout={() => navigate('/create-workout', { state: { date: dateKey } })}
                                    onDeleteCF={() => removeCrossFitWorkout(dateKey)}
                                    onShuffleCF={() => shuffleCrossFitWorkout(dateKey)}
                                    isFirst={index === 0}
                                    isLast={index === dates.length - 1}
                                />
                            )
                        })}
                    </div>
                )}
            </main>

            {/* CF Button */}
            <button
                className="fab cf-fab"
                onClick={addRandomCrossFitWorkout}
                aria-label="Add CrossFit Open workout"
            >
                <span className="cf-fab-text">CF</span>
            </button>

            {/* Plus Button */}
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
