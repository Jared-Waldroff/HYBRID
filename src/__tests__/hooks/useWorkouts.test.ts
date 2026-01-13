
import { renderHook, waitFor } from '@testing-library/react-native';
import { useWorkouts } from '../../hooks/useWorkouts';
import { mockSupabase, mockSupabaseResponse } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('useWorkouts', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Clear implementations too

        // Re-establish mock chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse([]));
    });

    it('fetches workouts successfully', async () => {
        const mockWorkouts = [
            { id: '1', name: 'Leg Day', scheduled_date: '2023-01-01', user_id: 'test-user-id' },
            { id: '2', name: 'Arm Day', scheduled_date: '2023-01-02', user_id: 'test-user-id' },
        ];

        mockSupabase.order.mockResolvedValueOnce(mockSupabaseResponse(mockWorkouts));

        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Initial state should be loading
        expect(result.current.loading).toBe(true);

        // Wait for data to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.workouts).toEqual(mockWorkouts);
        expect(result.current.error).toBeNull();
    });

    it('creates a workout with optimistic update', async () => {
        const newWorkout = { name: 'Chest Day', scheduled_date: '2023-01-03' };
        const createdWorkout = { ...newWorkout, id: 'new-id', user_id: 'test-user-id', workout_exercises: [] };

        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(createdWorkout));

        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Wait for initial fetch
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Create workout
        let response: any;
        await waitFor(async () => {
            response = await result.current.createWorkout(newWorkout, []);
        });

        expect(response.data).toEqual(createdWorkout);
        // Should be in the list
        expect(result.current.workouts).toContainEqual(expect.objectContaining({ name: 'Chest Day' }));
    });

    it('deletes a workout optimistic update', async () => {
        const initialWorkouts = [
            { id: '1', name: 'Leg Day', scheduled_date: '2023-01-01' },
        ];

        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse(initialWorkouts));

        // Mock delete
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockResolvedValue(mockSupabaseResponse(null));

        const { result } = renderHook(() => useWorkouts(), {
            wrapper: MockAuthProvider,
        });

        // Wait for initial fetch
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.workouts).toHaveLength(1);

        // Delete
        await waitFor(async () => {
            await result.current.deleteWorkout('1');
        });

        // Should be removed
        expect(result.current.workouts).toHaveLength(0);
    });
});
