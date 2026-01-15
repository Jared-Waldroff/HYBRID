
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWorkouts } from '../../hooks/useWorkouts';
import { mockSupabase, mockSupabaseResponse } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('useWorkouts', () => {
    const mockWorkouts = [
        { id: '1', name: 'Leg Day', scheduled_date: '2023-01-01', user_id: 'test-user-id' },
        { id: '2', name: 'Arm Day', scheduled_date: '2023-01-02', user_id: 'test-user-id' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Re-establish mock chains - order() returns the data for fetch operations
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse(mockWorkouts));
    });

    it('fetches workouts successfully', async () => {
        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Wait for workouts to load
        await waitFor(() => {
            expect(result.current.workouts.length).toBeGreaterThan(0);
        });

        expect(result.current.workouts).toHaveLength(2);
        expect(result.current.workouts[0].name).toBe('Leg Day');
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('creates a workout with optimistic update', async () => {
        const newWorkout = { name: 'Chest Day', scheduled_date: '2023-01-03' };
        const createdWorkout = { ...newWorkout, id: 'new-id', user_id: 'test-user-id', workout_exercises: [] };

        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(createdWorkout));

        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Wait for initial fetch
        await waitFor(() => {
            expect(result.current.workouts.length).toBeGreaterThan(0);
        });

        // Create workout
        let response: any;
        await act(async () => {
            response = await result.current.createWorkout(newWorkout, []);
        });

        expect(response.data).toEqual(createdWorkout);
        // Should be in the list (optimistic update)
        expect(result.current.workouts.some(w => w.name === 'Chest Day')).toBe(true);
    });

    it('deletes a workout with optimistic update', async () => {
        mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));

        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Wait for initial fetch
        await waitFor(() => {
            expect(result.current.workouts.length).toBeGreaterThan(0);
        });

        const initialCount = result.current.workouts.length;

        // Delete
        await act(async () => {
            await result.current.deleteWorkout('1');
        });

        // Should be removed (optimistic update)
        expect(result.current.workouts.length).toBeLessThan(initialCount);
    });
});
