import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { useExercises } from '../hooks/useExercises'
import { supabase } from '../lib/supabaseClient'
import GlassCard from '../components/GlassCard'
import Footer from '../components/Footer'
import './ExerciseDetailPage.css'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

export default function ExerciseDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getExerciseStats, getExerciseHistory } = useExercises()
    const [exercise, setExercise] = useState(null)
    const [stats, setStats] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            setError(null)

            try {
                // Fetch the specific exercise directly
                const { data: exerciseData, error: exError } = await supabase
                    .from('exercises')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (exError) throw exError
                if (!exerciseData) {
                    setError('Exercise not found')
                    setLoading(false)
                    return
                }

                setExercise(exerciseData)

                // Load stats
                const { data: statsData } = await getExerciseStats(id)
                if (statsData) {
                    setStats(statsData)
                }

                // Load full history
                const { data: historyData } = await getExerciseHistory(id, 50)
                if (historyData) {
                    setHistory(historyData)
                }
            } catch (err) {
                console.error('Error loading exercise:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [id, getExerciseStats, getExerciseHistory])

    const getChartData = () => {
        // Group by date and get max weight for each day
        const byDate = {}
        history.forEach(h => {
            const date = new Date(h.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const weight = parseFloat(h.weight) || 0
            if (!byDate[date] || weight > byDate[date]) {
                byDate[date] = weight
            }
        })

        const labels = Object.keys(byDate).reverse().slice(-10)
        const data = labels.map(l => byDate[l])

        return {
            labels,
            datasets: [
                {
                    label: 'Weight (lbs)',
                    data,
                    fill: true,
                    borderColor: 'rgb(201, 162, 39)',
                    backgroundColor: 'rgba(201, 162, 39, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgb(201, 162, 39)'
                }
            ]
        }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    font: { size: 11 }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    font: { size: 11 }
                }
            }
        }
    }

    if (loading) {
        return (
            <div className="exercise-detail-page">
                <header className="detail-header glass safe-top">
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="detail-header-info">
                        <h1 className="detail-title">Loading...</h1>
                    </div>
                    <div style={{ width: 40 }} />
                </header>
                <div className="loading-container">
                    <div className="spinner" />
                    <p>Loading exercise data...</p>
                </div>
            </div>
        )
    }

    if (error || !exercise) {
        return (
            <div className="exercise-detail-page">
                <header className="detail-header glass safe-top">
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="detail-header-info">
                        <h1 className="detail-title">Error</h1>
                    </div>
                    <div style={{ width: 40 }} />
                </header>
                <div className="error-container">
                    <p>{error || 'Exercise not found'}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/exercises')}>
                        Go to Exercises
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="exercise-detail-page">
            <header className="detail-header glass safe-top">
                <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="detail-header-info">
                    <h1 className="detail-title">{exercise.name}</h1>
                    <span className="detail-subtitle">{exercise.muscle_group}</span>
                </div>
                <div style={{ width: 40 }} />
            </header>

            <main className="detail-content">
                <GlassCard className="chart-card">
                    <h3 className="section-title">Progress Over Time</h3>
                    {history.length > 0 ? (
                        <div className="chart-container">
                            <Line data={getChartData()} options={chartOptions} />
                        </div>
                    ) : (
                        <div className="no-data">
                            <p>No data yet. Complete some sets to see your progress!</p>
                        </div>
                    )}
                </GlassCard>

                <div className="stats-grid">
                    <GlassCard className="stat-card">
                        <span className="stat-label">Personal Record</span>
                        <span className="stat-value pr">{stats?.pr || 0} lbs</span>
                    </GlassCard>
                    <GlassCard className="stat-card">
                        <span className="stat-label">Sessions</span>
                        <span className="stat-value">{stats?.sessions || 0}</span>
                    </GlassCard>
                    <GlassCard className="stat-card">
                        <span className="stat-label">Total Reps</span>
                        <span className="stat-value">{stats?.totalReps || 0}</span>
                    </GlassCard>
                    <GlassCard className="stat-card">
                        <span className="stat-label">Avg Weight</span>
                        <span className="stat-value">{Math.round(stats?.averageWeight || 0)} lbs</span>
                    </GlassCard>
                </div>

                <GlassCard className="history-card">
                    <h3 className="section-title">Recent History</h3>
                    {history.length > 0 ? (
                        <div className="history-list">
                            {history.slice(0, 15).map((h, i) => (
                                <div key={i} className="history-row">
                                    <span className="history-date">
                                        {new Date(h.completed_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                    <span className="history-workout">{h.workout_exercise?.workout?.name}</span>
                                    <span className="history-stats">
                                        {h.weight} lbs × {h.reps}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-data">
                            <p>No history yet</p>
                        </div>
                    )}
                </GlassCard>
            </main>


            <Footer />
        </div>
    )
}
