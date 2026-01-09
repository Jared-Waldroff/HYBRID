import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface CFScore {
    id: string;
    user_id: string;
    cf_workout_id: string;
    workout_id?: string;
    score_type: 'time' | 'rounds_reps' | 'completed';
    rounds?: number;
    reps?: number;
    time_seconds?: number;
    notes?: string;
    completed_at: string;
    created_at: string;
}

export interface NewCFScore {
    cf_workout_id: string;
    workout_id?: string;
    score_type: 'time' | 'rounds_reps' | 'completed';
    rounds?: number;
    reps?: number;
    time_seconds?: number;
    notes?: string;
}

// Format time in seconds to mm:ss
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Parse mm:ss to seconds
export const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr) || 0;
};

// Format score for display
export const formatScore = (score: CFScore): string => {
    if (score.score_type === 'rounds_reps') {
        if (score.reps && score.reps > 0) {
            return `${score.rounds || 0} rounds + ${score.reps} reps`;
        }
        return `${score.rounds || 0} rounds`;
    } else if (score.score_type === 'time') {
        return formatTime(score.time_seconds || 0);
    }
    return 'Completed';
};

export function useCFWorkoutScores(cfWorkoutId?: string) {
    const { user } = useAuth();
    const [scores, setScores] = useState<CFScore[]>([]);
    const [loading, setLoading] = useState(false);
    const [bestScore, setBestScore] = useState<CFScore | null>(null);

    // Fetch scores for a specific CF workout
    const fetchScores = useCallback(async () => {
        if (!user || !cfWorkoutId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cf_workout_scores')
                .select('*')
                .eq('user_id', user.id)
                .eq('cf_workout_id', cfWorkoutId)
                .order('completed_at', { ascending: false });

            if (error) throw error;

            setScores(data || []);

            // Calculate best score
            if (data && data.length > 0) {
                const best = findBestScore(data);
                setBestScore(best);
            }
        } catch (err) {
            console.error('Error fetching CF scores:', err);
        } finally {
            setLoading(false);
        }
    }, [user, cfWorkoutId]);

    // Find the best score from a list
    const findBestScore = (scoreList: CFScore[]): CFScore | null => {
        if (scoreList.length === 0) return null;

        const scoreType = scoreList[0].score_type;

        if (scoreType === 'time') {
            // For time-based, lower is better
            return scoreList.reduce((best, current) =>
                (current.time_seconds || Infinity) < (best.time_seconds || Infinity) ? current : best
            );
        } else if (scoreType === 'rounds_reps') {
            // For AMRAP, higher is better
            return scoreList.reduce((best, current) => {
                const currentTotal = (current.rounds || 0) * 1000 + (current.reps || 0);
                const bestTotal = (best.rounds || 0) * 1000 + (best.reps || 0);
                return currentTotal > bestTotal ? current : best;
            });
        }

        return scoreList[0];
    };

    // Save a new score
    const saveScore = async (newScore: NewCFScore): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const { error } = await supabase
                .from('cf_workout_scores')
                .insert({
                    ...newScore,
                    user_id: user.id,
                });

            if (error) throw error;

            // Refresh scores after saving
            await fetchScores();

            return { success: true };
        } catch (err: any) {
            console.error('Error saving CF score:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    return {
        scores,
        bestScore,
        loading,
        saveScore,
        fetchScores,
        formatScore,
    };
}
