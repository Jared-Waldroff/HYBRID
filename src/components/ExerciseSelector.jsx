import { useState, useMemo } from 'react'
import './ExerciseSelector.css'

export default function ExerciseSelector({
    exercises,
    selectedIds,
    onSelectionChange,
    onCreateNew
}) {
    const [search, setSearch] = useState('')

    const filteredExercises = useMemo(() => {
        if (!search) return exercises
        const lower = search.toLowerCase()
        return exercises.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.muscle_group?.toLowerCase().includes(lower)
        )
    }, [exercises, search])

    const groupedExercises = useMemo(() => {
        return filteredExercises.reduce((acc, exercise) => {
            const group = exercise.muscle_group || 'Other'
            if (!acc[group]) acc[group] = []
            acc[group].push(exercise)
            return acc
        }, {})
    }, [filteredExercises])

    const handleToggle = (exerciseId) => {
        if (selectedIds.includes(exerciseId)) {
            onSelectionChange(selectedIds.filter(id => id !== exerciseId))
        } else {
            onSelectionChange([...selectedIds, exerciseId])
        }
    }

    const noResults = filteredExercises.length === 0

    return (
        <div className="exercise-selector">
            <div className="selector-search">
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

            {noResults && search && (
                <div className="no-results">
                    <p>No exercises found for "{search}"</p>
                    <button className="btn btn-primary" onClick={() => onCreateNew?.(search)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create "{search}"
                    </button>
                </div>
            )}

            <div className="exercise-groups">
                {Object.entries(groupedExercises).map(([group, groupExercises]) => (
                    <div key={group} className="exercise-group">
                        <h4 className="group-title">{group}</h4>
                        {groupExercises.map(exercise => (
                            <div
                                key={exercise.id}
                                className={`exercise-option ${selectedIds.includes(exercise.id) ? 'selected' : ''}`}
                                onClick={() => handleToggle(exercise.id)}
                            >
                                <div className={`exercise-checkbox ${selectedIds.includes(exercise.id) ? 'checked' : ''}`}>
                                    {selectedIds.includes(exercise.id) && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span className="exercise-option-name">{exercise.name}</span>
                                {!exercise.is_default && (
                                    <span className="badge badge-ghost">Custom</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {selectedIds.length > 0 && (
                <div className="selection-count">
                    {selectedIds.length} exercise{selectedIds.length !== 1 ? 's' : ''} selected
                </div>
            )}
        </div>
    )
}
