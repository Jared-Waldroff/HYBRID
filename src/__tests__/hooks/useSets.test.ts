
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSets } from '../../hooks/useSets';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('useSets', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Re-establish mock chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    describe('addSet', () => {
        it('creates a new set with default values', async () => {
            const newSet = {
                id: 'set-1',
                workout_exercise_id: 'we-1',
                weight: 0,
                reps: 0,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.addSet('we-1');

            expect(mockSupabase.from).toHaveBeenCalledWith('sets');
            expect(mockSupabase.insert).toHaveBeenCalledWith({
                workout_exercise_id: 'we-1',
                weight: 0,
                reps: 0,
                is_completed: false,
            });
            expect(response.data).toEqual(newSet);
            expect(response.error).toBeNull();
        });

        it('creates a new set with custom weight and reps', async () => {
            const newSet = {
                id: 'set-2',
                workout_exercise_id: 'we-1',
                weight: 135,
                reps: 10,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.addSet('we-1', 135, 10);

            expect(mockSupabase.insert).toHaveBeenCalledWith({
                workout_exercise_id: 'we-1',
                weight: 135,
                reps: 10,
                is_completed: false,
            });
            expect(response.data).toEqual(newSet);
        });

        it('handles errors when adding a set', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Database error'));

            const { result } = renderHook(() => useSets());

            const response = await result.current.addSet('we-1');

            expect(response.data).toBeNull();
            expect(response.error).toBe('Database error');
        });
    });

    describe('updateSet', () => {
        it('updates weight on a set', async () => {
            const updatedSet = {
                id: 'set-1',
                weight: 185,
                reps: 10,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.updateSet('set-1', { weight: 185 });

            expect(mockSupabase.from).toHaveBeenCalledWith('sets');
            expect(mockSupabase.update).toHaveBeenCalledWith({ weight: 185 });
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'set-1');
            expect(response.data).toEqual(updatedSet);
        });

        it('updates reps on a set', async () => {
            const updatedSet = {
                id: 'set-1',
                weight: 135,
                reps: 12,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.updateSet('set-1', { reps: 12 });

            expect(mockSupabase.update).toHaveBeenCalledWith({ reps: 12 });
            expect(response.data).toEqual(updatedSet);
        });

        it('handles errors when updating a set', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Not found'));

            const { result } = renderHook(() => useSets());

            const response = await result.current.updateSet('set-invalid', { weight: 100 });

            expect(response.data).toBeNull();
            expect(response.error).toBe('Not found');
        });
    });

    describe('deleteSet', () => {
        it('deletes a set successfully', async () => {
            mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));

            const { result } = renderHook(() => useSets());

            const response = await result.current.deleteSet('set-1');

            expect(mockSupabase.from).toHaveBeenCalledWith('sets');
            expect(mockSupabase.delete).toHaveBeenCalled();
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'set-1');
            expect(response.error).toBeNull();
        });

        it('handles errors when deleting a set', async () => {
            mockSupabase.eq.mockResolvedValueOnce(mockSupabaseError('Delete failed'));

            const { result } = renderHook(() => useSets());

            const response = await result.current.deleteSet('set-invalid');

            expect(response.error).toBe('Delete failed');
        });
    });

    describe('toggleSetComplete', () => {
        it('marks an incomplete set as complete', async () => {
            const completedSet = {
                id: 'set-1',
                is_completed: true,
                completed_at: '2026-01-15T00:00:00Z',
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(completedSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.toggleSetComplete('set-1', false);

            expect(mockSupabase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    is_completed: true,
                    completed_at: expect.any(String),
                })
            );
            expect(response.data?.is_completed).toBe(true);
        });

        it('marks a complete set as incomplete', async () => {
            const incompleteSet = {
                id: 'set-1',
                is_completed: false,
                completed_at: null,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(incompleteSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.toggleSetComplete('set-1', true);

            expect(mockSupabase.update).toHaveBeenCalledWith({
                is_completed: false,
                completed_at: null,
            });
            expect(response.data?.is_completed).toBe(false);
        });

        it('handles errors when toggling set completion', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Toggle failed'));

            const { result } = renderHook(() => useSets());

            const response = await result.current.toggleSetComplete('set-invalid', false);

            expect(response.data).toBeNull();
            expect(response.error).toBe('Toggle failed');
        });
    });

    describe('duplicateSet', () => {
        it('duplicates a set with source data', async () => {
            const sourceSet = { weight: 225, reps: 5 };
            const duplicatedSet = {
                id: 'set-new',
                workout_exercise_id: 'we-1',
                weight: 225,
                reps: 5,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(duplicatedSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.duplicateSet('we-1', sourceSet);

            expect(mockSupabase.insert).toHaveBeenCalledWith({
                workout_exercise_id: 'we-1',
                weight: 225,
                reps: 5,
                is_completed: false,
            });
            expect(response.data).toEqual(duplicatedSet);
        });

        it('duplicates a set with default values when no source', async () => {
            const duplicatedSet = {
                id: 'set-new',
                workout_exercise_id: 'we-1',
                weight: 0,
                reps: 0,
                is_completed: false,
            };

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(duplicatedSet));

            const { result } = renderHook(() => useSets());

            const response = await result.current.duplicateSet('we-1');

            expect(mockSupabase.insert).toHaveBeenCalledWith({
                workout_exercise_id: 'we-1',
                weight: 0,
                reps: 0,
                is_completed: false,
            });
            expect(response.data).toEqual(duplicatedSet);
        });

        it('handles errors when duplicating a set', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Duplicate failed'));

            const { result } = renderHook(() => useSets());

            const response = await result.current.duplicateSet('we-1');

            expect(response.data).toBeNull();
            expect(response.error).toBe('Duplicate failed');
        });
    });
});
