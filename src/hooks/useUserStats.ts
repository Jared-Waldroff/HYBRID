import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface UserStats {
    bench_press: number;
    squat: number;
    deadlift: number;
    overhead_press: number;
    total_workouts: number;
    history: Record<string, number>; // Exercise Name -> Max E1RM
}

export const useUserStats = () => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch total workout count
            const { count, error: countError } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('is_completed', true);

            if (countError) console.warn('Error counting workouts:', countError);

            // Fetch sets to calculate maxes
            // We fetch sets with weight > 0
            const { data, error } = await supabase
                .from('sets')
                .select(`
                    weight,
                    reps,
                    workout_exercises!inner (
                        exercises!inner (name)
                    )
                `)
                .gt('weight', 0)
                .limit(2000); // Reasonable limit for history analysis

            if (error) throw error;

            const maxStats: Record<string, number> = {};

            data?.forEach((item: any) => {
                const exerciseName = item.workout_exercises?.exercises?.name?.toLowerCase();
                if (!exerciseName) return;

                const weight = parseFloat(item.weight);
                const reps = parseFloat(item.reps);
                if (isNaN(weight) || weight <= 0) return;

                // Epley Formula for E1RM
                // If reps = 1, E1RM = weight.
                const e1rm = reps > 1 ? weight * (1 + reps / 30) : weight;
                const roundedMax = Math.round(e1rm);

                if (!maxStats[exerciseName] || roundedMax > maxStats[exerciseName]) {
                    maxStats[exerciseName] = roundedMax;
                }
            });

            // Helper to match common variations
            const getBestMax = (keywords: string[]) => {
                let best = 0;
                Object.keys(maxStats).forEach(name => {
                    if (keywords.some(k => name.includes(k))) {
                        if (maxStats[name] > best) best = maxStats[name];
                    }
                });
                return best;
            };

            setStats({
                bench_press: getBestMax(['bench press', 'chest press']),
                squat: getBestMax(['squat']),
                deadlift: getBestMax(['deadlift']),
                overhead_press: getBestMax(['overhead press', 'shoulder press', 'military press']),
                total_workouts: count || 0,
                history: maxStats
            });

        } catch (err) {
            console.error('Error fetching user stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { stats, fetchStats, loading };
};
