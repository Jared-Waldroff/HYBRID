import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkouts } from '../hooks/useWorkouts'
import Header from '../components/Header'
import Footer from '../components/Footer'
import GlassCard from '../components/GlassCard'
import './CalendarPage.css'

export default function CalendarPage() {
    const navigate = useNavigate()
    const { workouts } = useWorkouts()
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPadding = firstDay.getDay()
        const totalDays = lastDay.getDate()

        const days = []

        // Previous month padding
        const prevMonth = new Date(year, month, 0)
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonth.getDate() - i),
                isCurrentMonth: false
            })
        }

        // Current month
        for (let i = 1; i <= totalDays; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            })
        }

        // Next month padding
        const remaining = 42 - days.length
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            })
        }

        return days
    }, [currentMonth])

    const workoutsByDate = useMemo(() => {
        const map = {}
        workouts.forEach(w => {
            if (!map[w.scheduled_date]) {
                map[w.scheduled_date] = []
            }
            map[w.scheduled_date].push(w)
        })
        return map
    }, [workouts])

    const navigateMonth = (direction) => {
        const newMonth = new Date(currentMonth)
        newMonth.setMonth(newMonth.getMonth() + direction)
        setCurrentMonth(newMonth)
    }

    const handleDayClick = (date) => {
        navigate('/', { state: { date: formatDateKey(date) } })
    }

    const isToday = (date) => {
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const formatDateKey = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    return (
        <div className="calendar-page">
            <Header />

            <main className="calendar-content">
                <GlassCard className="calendar-card">
                    <div className="calendar-header">
                        <button className="btn btn-ghost btn-icon" onClick={() => navigateMonth(-1)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <h2 className="calendar-month">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                        <button className="btn btn-ghost btn-icon" onClick={() => navigateMonth(1)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    <div className="calendar-weekdays">
                        {dayNames.map(day => (
                            <div key={day} className="weekday">{day}</div>
                        ))}
                    </div>

                    <div className="calendar-grid">
                        {calendarDays.map((day, index) => {
                            const dateKey = formatDateKey(day.date)
                            const dayWorkouts = workoutsByDate[dateKey] || []
                            const hasWorkouts = dayWorkouts.length > 0

                            return (
                                <div
                                    key={index}
                                    className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''} ${hasWorkouts ? 'has-workout' : ''}`}
                                    onClick={() => handleDayClick(day.date)}
                                >
                                    <span className="day-number">{day.date.getDate()}</span>
                                    {hasWorkouts && (
                                        <div className="workout-dots">
                                            {dayWorkouts.slice(0, 3).map((w, i) => (
                                                <span
                                                    key={i}
                                                    className="workout-dot"
                                                    style={{ background: w.color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </GlassCard>

                <div className="calendar-legend">
                    <h4>This Month</h4>
                    <div className="legend-stats">
                        <div className="legend-item">
                            <span className="legend-value">
                                {Object.keys(workoutsByDate).filter(date => {
                                    const d = new Date(date)
                                    return d.getMonth() === currentMonth.getMonth() &&
                                        d.getFullYear() === currentMonth.getFullYear()
                                }).length}
                            </span>
                            <span className="legend-label">Workout Days</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-value">
                                {workouts.filter(w => {
                                    const d = new Date(w.scheduled_date)
                                    return d.getMonth() === currentMonth.getMonth() &&
                                        d.getFullYear() === currentMonth.getFullYear() &&
                                        w.is_completed
                                }).length}
                            </span>
                            <span className="legend-label">Completed</span>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
