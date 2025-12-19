import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import Header from '../components/Header'
import Footer from '../components/Footer'
import GlassCard from '../components/GlassCard'
import ExerciseForm from '../components/ExerciseForm'
import ConfirmDialog from '../components/ConfirmDialog'
import './ExercisesPage.css'

export default function ExercisesPage() {
    const navigate = useNavigate()
    const {
        groupedExercises,
        loading,
        createExercise,
        updateExercise,
        deleteExercise
    } = useExercises()

    const [search, setSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingExercise, setEditingExercise] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, exercise: null })

    const filteredGroups = Object.entries(groupedExercises).reduce((acc, [group, exercises]) => {
        if (!search) {
            acc[group] = exercises
        } else {
            const filtered = exercises.filter(e =>
                e.name.toLowerCase().includes(search.toLowerCase())
            )
            if (filtered.length > 0) {
                acc[group] = filtered
            }
        }
        return acc
    }, {})

    const handleExerciseClick = (exercise) => {
        navigate(`/exercise/${exercise.id}`)
    }

    const handleEdit = (e, exercise) => {
        e.stopPropagation()
        setEditingExercise(exercise)
        setShowForm(true)
    }

    const handleDelete = (e, exercise) => {
        e.stopPropagation()
        setDeleteConfirm({ open: true, exercise })
    }

    const confirmDelete = async () => {
        if (deleteConfirm.exercise) {
            await deleteExercise(deleteConfirm.exercise.id)
            setDeleteConfirm({ open: false, exercise: null })
        }
    }

    const handleSave = async (data) => {
        if (editingExercise) {
            await updateExercise(editingExercise.id, data)
        } else {
            await createExercise(data)
        }
        setShowForm(false)
        setEditingExercise(null)
    }

    return (
        <div className="exercises-page">
            <Header />

            <main className="exercises-content">
                <div className="exercises-header">
                    <div className="search-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search exercises..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingExercise(null)
                            setShowForm(true)
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p>Loading exercises...</p>
                    </div>
                ) : Object.keys(filteredGroups).length === 0 ? (
                    <div className="empty-state">
                        <p>No exercises found</p>
                    </div>
                ) : (
                    <div className="exercise-groups">
                        {Object.entries(filteredGroups).map(([group, exercises]) => (
                            <div key={group} className="exercise-group">
                                <h3 className="group-title">{group}</h3>
                                {exercises.map(exercise => (
                                    <GlassCard
                                        key={exercise.id}
                                        className="exercise-item"
                                        onClick={() => handleExerciseClick(exercise)}
                                    >
                                        <div className="exercise-info">
                                            <span className="exercise-name">{exercise.name}</span>
                                            {!exercise.is_default && (
                                                <span className="badge badge-ghost">Custom</span>
                                            )}
                                        </div>
                                        <div className="exercise-actions">
                                            {!exercise.is_default && (
                                                <>
                                                    <button
                                                        className="btn btn-ghost btn-icon"
                                                        onClick={(e) => handleEdit(e, exercise)}
                                                        aria-label="Edit exercise"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-icon delete-btn"
                                                        onClick={(e) => handleDelete(e, exercise)}
                                                        aria-label="Delete exercise"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />

            <ExerciseForm
                isOpen={showForm}
                exercise={editingExercise}
                onSave={handleSave}
                onClose={() => {
                    setShowForm(false)
                    setEditingExercise(null)
                }}
            />

            <ConfirmDialog
                isOpen={deleteConfirm.open}
                title="Delete Exercise"
                message={`Are you sure you want to delete "${deleteConfirm.exercise?.name}"? This will also remove it from any workouts.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ open: false, exercise: null })}
            />
        </div>
    )
}
