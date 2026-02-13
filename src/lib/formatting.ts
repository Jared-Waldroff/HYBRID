export const formatEventActivities = (notes: string | null) => {
    if (!notes) return '';
    try {
        const parsed = JSON.parse(notes);
        let activities: any[] = [];

        if (Array.isArray(parsed)) {
            activities = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.activities)) {
            activities = parsed.activities;
        }

        if (activities.length > 0) {
            return activities.map((act: any) => {
                if (act.type === 'workout_type') {
                    const parts = [
                        act.workoutTypeName,
                        act.distance && `${act.distance}${act.distanceUnit || 'km'}`,
                        act.duration && `${act.duration}min`,
                        act.weight && `${act.weight}${act.weightUnit || 'kg'}`,
                        act.zone
                    ];
                    return parts.filter(Boolean).join(' • ');
                } else if (act.type === 'exercise') {
                    const parts = [
                        act.exerciseName,
                        act.sets && `${act.sets}x${act.reps}`,
                        act.weight && `${act.weight}${act.weightUnit || 'kg'}`
                    ];
                    return parts.filter(Boolean).join(' • ');
                }
                return 'Unknown Activity';
            }).join('\n');
        }
        return notes;
    } catch (e) {
        return notes;
    }
};
