import { useTheme } from '../context/ThemeContext'
import { useLocation } from 'react-router-dom'
import './Header.css'

export default function Header({ title, showDate = false, date = new Date() }) {
    const { theme, toggleTheme } = useTheme()
    const location = useLocation()

    const formatDate = (d) => {
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })
    }

    const isToday = (d) => {
        const today = new Date()
        return d.toDateString() === today.toDateString()
    }

    return (
        <header className="header glass safe-top">
            <div className="header-content">
                <div className="header-left">
                    <h1 className="header-title">Workout Tracker</h1>
                </div>

                {showDate && (
                    <div className="header-center">
                        <span className="header-date">
                            {isToday(date) ? 'Today' : formatDate(date)}
                        </span>
                    </div>
                )}

                <div className="header-right">
                    <button
                        className="btn btn-icon btn-ghost theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </header>
    )
}
