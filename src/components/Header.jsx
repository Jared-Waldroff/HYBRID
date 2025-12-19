import { useTheme } from '../context/ThemeContext'
import './Header.css'

export default function Header() {
    const { theme, toggleTheme } = useTheme()

    return (
        <header className="header glass safe-top">
            <div className="header-content">
                <div className="header-left">
                    {/* Spacer for balance */}
                    <div style={{ width: 40 }} />
                </div>

                <div className="header-center">
                    <div className="header-logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 6.5a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h0A2.5 2.5 0 0 1 2 17.5v-11zM17 6.5a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h0a2.5 2.5 0 0 1-2.5-2.5v-11z" />
                        </svg>
                    </div>
                    <h1 className="header-title">Workout</h1>
                </div>

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
