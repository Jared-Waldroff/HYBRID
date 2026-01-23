// Shared constants for the app

export const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Core', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves',
    'Full Body', 'Cardio', 'Other'
];

// Cardio exercise detection helper
// Using specific terms to avoid false positives (e.g., "row" matches "seated row" which is back, not cardio)
export const CARDIO_KEYWORDS = [
    'bike', 'rower', 'rowing machine', 'ski erg', 'run', 'treadmill', 'elliptical',
    'stair', 'assault', 'erg', 'sprint', 'jog', 'walk',
    'cycling', 'cardio', 'hiit', 'jump rope'
];

// Specific exercise names that are definitely cardio (for exact or partial match)
const CARDIO_EXERCISE_NAMES = [
    'assault bike', 'echo bike', 'air bike', 'concept2', 'c2 rower', 'rowing ergometer',
    'ski erg', 'treadmill run', 'running', 'jogging', 'walking'
];

export function isCardioExercise(exercise: { name?: string; muscle_group?: string }): boolean {
    if (!exercise) return false;

    // Check muscle group first (most reliable)
    if (exercise.muscle_group?.toLowerCase() === 'cardio') {
        return true;
    }

    const nameLower = exercise.name?.toLowerCase() || '';

    // Check for specific cardio exercise names
    if (CARDIO_EXERCISE_NAMES.some(name => nameLower.includes(name))) {
        return true;
    }

    // Check keywords, but exclude common false positives
    const hasCardioKeyword = CARDIO_KEYWORDS.some(keyword => nameLower.includes(keyword));
    if (!hasCardioKeyword) return false;

    // Exclude false positives: exercises with "row" that are back exercises
    const backExercisePatterns = ['seated row', 'cable row', 'barbell row', 'dumbbell row', 'bent over row', 'pendlay row', 't-bar row', 'machine row', 'one arm row', 'single arm row'];
    if (backExercisePatterns.some(pattern => nameLower.includes(pattern))) {
        return false;
    }

    return hasCardioKeyword;
}
