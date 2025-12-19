import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
    const { user, signIn, signUp, resetPassword } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        // Password confirmation check for signup
        if (!isLogin) {
            if (password !== confirmPassword) {
                setError('Passwords do not match')
                return
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters')
                return
            }
        }

        setLoading(true)

        try {
            if (isLogin) {
                const { error: signInError } = await signIn(email, password)
                if (signInError) throw signInError
            } else {
                const { error: signUpError } = await signUp(email, password)
                if (signUpError) throw signUpError
                setMessage('Check your email to confirm your account!')
            }
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: resetError } = await resetPassword(email)
            if (resetError) throw resetError
            setMessage('Password reset email sent!')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-container glass animate-scaleIn">
                <div className="login-header">
                    <div className="login-logo">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M2 6.5a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h0A2.5 2.5 0 0 1 2 17.5v-11zM17 6.5a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h0a2.5 2.5 0 0 1-2.5-2.5v-11z" />
                        </svg>
                    </div>
                    <h1 className="login-title">Workout</h1>
                    <p className="login-subtitle">
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            minLength={6}
                        />
                    </div>

                    {!isLogin && (
                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                minLength={6}
                            />
                        </div>
                    )}

                    {error && (
                        <p className="login-error">{error}</p>
                    )}

                    {message && (
                        <p className="login-success">{message}</p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner" />
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </button>

                    {isLogin && (
                        <button
                            type="button"
                            className="btn btn-ghost w-full"
                            onClick={handleForgotPassword}
                            disabled={loading}
                        >
                            Forgot password?
                        </button>
                    )}
                </form>

                <div className="login-footer">
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            className="login-toggle"
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setError('')
                                setMessage('')
                                setConfirmPassword('')
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
