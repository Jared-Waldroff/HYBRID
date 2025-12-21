import { useState, useEffect, useRef, useCallback } from 'react'
import './WorkoutTimer.css'

export default function WorkoutTimer({
    initialSeconds = 0,
    mode = 'countup', // 'countup' or 'countdown'
    onComplete
}) {
    const [seconds, setSeconds] = useState(initialSeconds)
    const [isRunning, setIsRunning] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const intervalRef = useRef(null)
    const audioContextRef = useRef(null)

    // Format time as MM:SS
    const formatTime = (totalSeconds) => {
        const mins = Math.floor(Math.abs(totalSeconds) / 60)
        const secs = Math.abs(totalSeconds) % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Play beep sound
    const playBeep = useCallback((frequency = 800, duration = 150) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            }
            const ctx = audioContextRef.current
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.frequency.value = frequency
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + duration / 1000)
        } catch (e) {
            console.log('Audio not available')
        }
    }, [])

    // Timer tick logic
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setSeconds(prev => {
                    if (mode === 'countdown') {
                        // Countdown beeps
                        if (prev === 4 || prev === 3 || prev === 2) {
                            playBeep(600, 100)
                        } else if (prev === 1) {
                            playBeep(900, 300) // Final beep
                        }

                        if (prev <= 0) {
                            setIsRunning(false)
                            onComplete?.()
                            return 0
                        }
                        return prev - 1
                    } else {
                        // Countup mode
                        return prev + 1
                    }
                })
            }, 1000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isRunning, mode, onComplete, playBeep])

    const handleStartPause = () => {
        if (!hasStarted) {
            setHasStarted(true)
            // Play countdown beeps before start
            if (mode === 'countdown') {
                playBeep(600, 100)
            }
        }
        setIsRunning(!isRunning)
    }

    const handleReset = () => {
        setIsRunning(false)
        setHasStarted(false)
        setSeconds(initialSeconds)
    }

    const isComplete = mode === 'countdown' && seconds === 0 && hasStarted

    return (
        <div className={`workout-timer ${isRunning ? 'running' : ''} ${isComplete ? 'complete' : ''}`}>
            <div className="timer-display">
                <span className="timer-time">{formatTime(seconds)}</span>
                <span className="timer-mode">
                    {mode === 'countdown' ? 'TIME CAP' : 'ELAPSED'}
                </span>
            </div>

            <div className="timer-controls">
                <button
                    className="btn btn-icon timer-btn reset-btn"
                    onClick={handleReset}
                    disabled={!hasStarted}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>

                <button
                    className={`btn timer-btn play-btn ${isRunning ? 'pause' : 'play'}`}
                    onClick={handleStartPause}
                    disabled={isComplete}
                >
                    {isRunning ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>

                <div className="timer-spacer" />
            </div>
        </div>
    )
}
