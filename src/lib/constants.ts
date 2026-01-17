// Shared constants for the app

export const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Core', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves',
    'Full Body', 'Cardio', 'Other'
];

// Cardio exercise detection helper
export const CARDIO_KEYWORDS = [
    'bike', 'row', 'ski', 'run', 'treadmill', 'elliptical',
    'stair', 'assault', 'erg', 'sprint', 'jog', 'walk',
    'cycling', 'cardio', 'hiit', 'burpee', 'jump rope'
];

export function isCardioExercise(exercise: { name?: string; muscle_group?: string }): boolean {
    if (!exercise) return false;

    // Check muscle group
    if (exercise.muscle_group?.toLowerCase() === 'cardio') {
        return true;
    }

    // Check name for cardio keywords
    const nameLower = exercise.name?.toLowerCase() || '';
    return CARDIO_KEYWORDS.some(keyword => nameLower.includes(keyword));
}
