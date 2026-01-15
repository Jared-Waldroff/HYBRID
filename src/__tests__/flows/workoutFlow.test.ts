/**
 * User Flow Integration Test: Complete Workout Session
 * 
 * This test simulates the full user journey of:
 * 1. Creating a new workout for today
 * 2. Adding exercises to the workout
 * 3. Adding sets with weight/reps
 * 4. Completing sets during workout
 * 5. Verifying the workout appears in history
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useSets } from '../../hooks/useSets';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';

// Mock Supabase
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('User Flow: Complete Workout Session', () => {
    const today = new Date().toISOString().split('T')[0];

    // Mock data that evolves through the flow
    const mockWorkout = {
        id: 'workout-flow-1',
        name: 'Push Day',
        scheduled_date: today,
        user_id: 'test-user-id',
        color: '#00ff00',
        workout_exercises: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse([]));
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    it('completes a full workout session flow', async () => {
        // Step 1: Initial load - no workouts
        const { result: workoutsResult } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(workoutsResult.current.loading).toBe(false));
        expect(workoutsResult.current.workouts).toHaveLength(0);

        // Step 2: Create a new workout
        const createdWorkout = { ...mockWorkout, workout_exercises: [] };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(createdWorkout));

        let createResponse: any;
        await act(async () => {
            createResponse = await workoutsResult.current.createWorkout(
                { name: 'Push Day', scheduled_date: today, color: '#00ff00' },
                ['ex-bench', 'ex-ohp']
            );
        });

        expect(createResponse.data).toBeTruthy();
        expect(createResponse.data?.name).toBe('Push Day');

        // Step 3: Verify workout is now in list (optimistic update)
        expect(workoutsResult.current.workouts.length).toBeGreaterThanOrEqual(1);
        expect(workoutsResult.current.workouts.some(w => w.name === 'Push Day')).toBe(true);
    });

    it('manages sets within a workout exercise', async () => {
        const { result: setsResult } = renderHook(() => useSets());

        // Add first set
        const newSet1 = { id: 'set-1', workout_exercise_id: 'we-1', weight: 135, reps: 10, is_completed: false };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newSet1));

        let addResponse1: any;
        await act(async () => {
            addResponse1 = await setsResult.current.addSet('we-1', 135, 10);
        });
        expect(addResponse1.data?.weight).toBe(135);
        expect(addResponse1.data?.reps).toBe(10);

        // Add second set with progressive overload
        const newSet2 = { id: 'set-2', workout_exercise_id: 'we-1', weight: 155, reps: 8, is_completed: false };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newSet2));

        let addResponse2: any;
        await act(async () => {
            addResponse2 = await setsResult.current.addSet('we-1', 155, 8);
        });
        expect(addResponse2.data?.weight).toBe(155);

        // Duplicate the last set (common gym pattern)
        const duplicatedSet = { id: 'set-3', workout_exercise_id: 'we-1', weight: 155, reps: 8, is_completed: false };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(duplicatedSet));

        let dupResponse: any;
        await act(async () => {
            dupResponse = await setsResult.current.duplicateSet('we-1', { weight: 155, reps: 8 });
        });
        expect(dupResponse.data?.weight).toBe(155);
    });

    it('completes sets in sequence during workout', async () => {
        const { result: setsResult } = renderHook(() => useSets());

        // Complete first set
        const completedSet1 = { id: 'set-1', is_completed: true, completed_at: new Date().toISOString() };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(completedSet1));

        let toggle1: any;
        await act(async () => {
            toggle1 = await setsResult.current.toggleSetComplete('set-1', false);
        });
        expect(toggle1.data?.is_completed).toBe(true);

        // Complete second set
        const completedSet2 = { id: 'set-2', is_completed: true, completed_at: new Date().toISOString() };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(completedSet2));

        let toggle2: any;
        await act(async () => {
            toggle2 = await setsResult.current.toggleSetComplete('set-2', false);
        });
        expect(toggle2.data?.is_completed).toBe(true);

        // Complete third set
        const completedSet3 = { id: 'set-3', is_completed: true, completed_at: new Date().toISOString() };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(completedSet3));

        let toggle3: any;
        await act(async () => {
            toggle3 = await setsResult.current.toggleSetComplete('set-3', false);
        });
        expect(toggle3.data?.is_completed).toBe(true);
    });

    it('updates set values mid-workout', async () => {
        const { result: setsResult } = renderHook(() => useSets());

        // User realizes they can do more weight
        const updatedSet = { id: 'set-2', weight: 165, reps: 8, is_completed: false };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedSet));

        let updateResponse: any;
        await act(async () => {
            updateResponse = await setsResult.current.updateSet('set-2', { weight: 165 });
        });
        expect(updateResponse.data?.weight).toBe(165);
    });

    it('allows removing a set if user changes their mind', async () => {
        const { result: setsResult } = renderHook(() => useSets());

        mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));

        let deleteResponse: any;
        await act(async () => {
            deleteResponse = await setsResult.current.deleteSet('set-3');
        });
        expect(deleteResponse.error).toBeNull();
    });

    it('can undo set completion if marked by mistake', async () => {
        const { result: setsResult } = renderHook(() => useSets());

        // Accidentally marked complete
        const incompleteSet = { id: 'set-2', is_completed: false, completed_at: null };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(incompleteSet));

        let undoToggle: any;
        await act(async () => {
            undoToggle = await setsResult.current.toggleSetComplete('set-2', true);
        });
        expect(undoToggle.data?.is_completed).toBe(false);
        expect(undoToggle.data?.completed_at).toBeNull();
    });
});

describe('User Flow: Workout Calendar Navigation', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allWorkouts = [
        { id: 'w1', name: 'Yesterday Workout', scheduled_date: yesterday.toISOString().split('T')[0] },
        { id: 'w2', name: 'Today Workout', scheduled_date: today.toISOString().split('T')[0] },
        { id: 'w3', name: 'Tomorrow Workout', scheduled_date: tomorrow.toISOString().split('T')[0] },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse(allWorkouts));
    });

    it('filters workouts by selected date', async () => {
        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => {
            expect(result.current.workouts.length).toBeGreaterThan(0);
        });

        // Get workouts for today
        const todayWorkouts = result.current.getWorkoutsByDate(today);
        expect(todayWorkouts).toHaveLength(1);
        expect(todayWorkouts[0].name).toBe('Today Workout');

        // Get workouts for yesterday
        const yesterdayWorkouts = result.current.getWorkoutsByDate(yesterday);
        expect(yesterdayWorkouts).toHaveLength(1);
        expect(yesterdayWorkouts[0].name).toBe('Yesterday Workout');

        // Get workouts for tomorrow
        const tomorrowWorkouts = result.current.getWorkoutsByDate(tomorrow);
        expect(tomorrowWorkouts).toHaveLength(1);
        expect(tomorrowWorkouts[0].name).toBe('Tomorrow Workout');
    });

    it('returns empty array for dates with no workouts', async () => {
        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const emptyDate = new Date('2020-01-01');
        const workouts = result.current.getWorkoutsByDate(emptyDate);
        expect(workouts).toHaveLength(0);
    });
});
