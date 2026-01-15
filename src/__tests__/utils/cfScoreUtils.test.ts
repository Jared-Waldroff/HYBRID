/**
 * Unit tests for CrossFit workout score utility functions
 * 
 * These tests the pure utility functions without importing the hook
 * to avoid Supabase/expo dependencies.
 */

// Inline the pure functions to test them without triggering hook imports
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr) || 0;
};

interface CFScore {
    id: string;
    user_id: string;
    cf_workout_id: string;
    score_type: 'time' | 'rounds_reps' | 'completed';
    rounds?: number;
    reps?: number;
    time_seconds?: number;
    completed_at: string;
    created_at: string;
}

const formatScore = (score: CFScore): string => {
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

describe('CF Workout Score Utilities', () => {
    describe('formatTime', () => {
        it('formats seconds to mm:ss', () => {
            expect(formatTime(0)).toBe('0:00');
            expect(formatTime(30)).toBe('0:30');
            expect(formatTime(60)).toBe('1:00');
            expect(formatTime(90)).toBe('1:30');
            expect(formatTime(125)).toBe('2:05');
            expect(formatTime(600)).toBe('10:00');
            expect(formatTime(3661)).toBe('61:01');
        });

        it('pads seconds with leading zeros', () => {
            expect(formatTime(5)).toBe('0:05');
            expect(formatTime(65)).toBe('1:05');
        });
    });

    describe('parseTime', () => {
        it('parses mm:ss format to seconds', () => {
            expect(parseTime('0:00')).toBe(0);
            expect(parseTime('0:30')).toBe(30);
            expect(parseTime('1:00')).toBe(60);
            expect(parseTime('1:30')).toBe(90);
            expect(parseTime('2:05')).toBe(125);
            expect(parseTime('10:00')).toBe(600);
        });

        it('handles single number input', () => {
            expect(parseTime('30')).toBe(30);
            expect(parseTime('120')).toBe(120);
        });

        it('returns 0 for invalid input', () => {
            expect(parseTime('')).toBe(0);
            expect(parseTime('abc')).toBe(0);
        });
    });

    describe('formatScore', () => {
        const baseScore: CFScore = {
            id: '1',
            user_id: 'user-1',
            cf_workout_id: 'workout-1',
            score_type: 'time',
            completed_at: '2026-01-01',
            created_at: '2026-01-01',
        };

        it('formats time-based scores', () => {
            const score = { ...baseScore, score_type: 'time' as const, time_seconds: 300 };
            expect(formatScore(score)).toBe('5:00');
        });

        it('formats rounds_reps scores with reps', () => {
            const score = { ...baseScore, score_type: 'rounds_reps' as const, rounds: 5, reps: 10 };
            expect(formatScore(score)).toBe('5 rounds + 10 reps');
        });

        it('formats rounds_reps scores without reps', () => {
            const score = { ...baseScore, score_type: 'rounds_reps' as const, rounds: 5, reps: 0 };
            expect(formatScore(score)).toBe('5 rounds');
        });

        it('formats completed scores', () => {
            const score = { ...baseScore, score_type: 'completed' as const };
            expect(formatScore(score)).toBe('Completed');
        });

        it('handles missing time values', () => {
            const score = { ...baseScore, score_type: 'time' as const };
            expect(formatScore(score)).toBe('0:00');
        });
    });
});
