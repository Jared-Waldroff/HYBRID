
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useExercises } from '../../hooks/useExercises';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('useExercises', () => {
    const mockExercises = [
        { id: 'ex-1', name: 'Bench Press', muscle_group: 'Chest', is_custom: false },
        { id: 'ex-2', name: 'Squat', muscle_group: 'Legs', is_custom: false },
        { id: 'ex-3', name: 'Deadlift', muscle_group: 'Back', is_custom: false },
        { id: 'ex-4', name: 'Shoulder Press', muscle_group: 'Shoulders', is_custom: false },
        { id: 'ex-5', name: 'Custom Move', muscle_group: 'Core', is_custom: true, user_id: 'test-user-id' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        // Re-establish mock chains - each method returns the mockSupabase for chaining
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.or.mockReturnValue(mockSupabase);
        // order() is the terminal operation that returns data
        mockSupabase.order.mockResolvedValue(mockSupabaseResponse(mockExercises));
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    describe('fetching exercises', () => {
        it('loads exercises from Supabase on mount', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            // Wait for exercises to be populated
            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            expect(result.current.exercises).toHaveLength(5);
            expect(result.current.exercises[0].name).toBe('Bench Press');
            expect(result.current.loading).toBe(false);
        });

        it('loads exercises from cache when available', async () => {
            const cachedExercises = JSON.stringify(mockExercises);
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'cached_exercises') return Promise.resolve(cachedExercises);
                if (key === 'cached_exercises_timestamp') {
                    return Promise.resolve(new Date().toISOString()); // Recent timestamp
                }
                return Promise.resolve(null);
            });

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            // Should have loaded from cache
            expect(result.current.exercises).toHaveLength(5);
        });

        it('handles fetch errors gracefully', async () => {
            mockSupabase.order.mockResolvedValueOnce(mockSupabaseError('Network error'));

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Should have empty exercises on error
            expect(result.current.exercises).toEqual([]);
        });
    });

    describe('createExercise', () => {
        it('creates a custom exercise', async () => {
            const newExercise = {
                id: 'ex-new',
                name: 'My Custom Exercise',
                muscle_group: 'Core',
                is_custom: true,
                user_id: 'test-user-id',
            };
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newExercise));

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            let response: any;
            await act(async () => {
                response = await result.current.createExercise({
                    name: 'My Custom Exercise',
                    muscle_group: 'Core',
                });
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'My Custom Exercise',
                    muscle_group: 'Core',
                })
            );
            expect(response.data).toEqual(newExercise);
        });

        it('handles errors when creating exercise', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Name already exists'));

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            let response: any;
            await act(async () => {
                response = await result.current.createExercise({
                    name: 'Bench Press',
                    muscle_group: 'Chest',
                });
            });

            expect(response.error).toBe('Name already exists');
        });
    });

    describe('updateExercise', () => {
        it('updates an exercise', async () => {
            const updatedExercise = { ...mockExercises[4], name: 'Renamed Exercise' };
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedExercise));

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            let response: any;
            await act(async () => {
                response = await result.current.updateExercise('ex-5', { name: 'Renamed Exercise' });
            });

            expect(mockSupabase.update).toHaveBeenCalledWith({ name: 'Renamed Exercise' });
            expect(response.data?.name).toBe('Renamed Exercise');
        });
    });

    describe('deleteExercise', () => {
        it('deletes a custom exercise', async () => {
            mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));

            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            let response: any;
            await act(async () => {
                response = await result.current.deleteExercise('ex-5');
            });

            expect(mockSupabase.delete).toHaveBeenCalled();
            expect(response.error).toBeNull();
        });
    });

    describe('searchExercises', () => {
        it('filters exercises by search query', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            const filtered = result.current.searchExercises('press');

            expect(filtered).toHaveLength(2); // Bench Press, Shoulder Press
            expect(filtered.every(e => e.name.toLowerCase().includes('press'))).toBe(true);
        });

        it('returns all exercises for empty query', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            const filtered = result.current.searchExercises('');

            expect(filtered).toHaveLength(5);
        });
    });

    describe('getExercisesByMuscleGroup', () => {
        it('filters exercises by muscle group', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            const chestExercises = result.current.getExercisesByMuscleGroup('Chest');

            expect(chestExercises).toHaveLength(1);
            expect(chestExercises[0].name).toBe('Bench Press');
        });
    });

    describe('getMuscleGroups', () => {
        it('returns unique muscle groups', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            const muscleGroups = result.current.getMuscleGroups();

            expect(muscleGroups).toContain('Chest');
            expect(muscleGroups).toContain('Legs');
            expect(muscleGroups).toContain('Back');
            expect(muscleGroups).toContain('Shoulders');
            expect(muscleGroups).toContain('Core');
        });
    });

    describe('getExerciseById', () => {
        it('returns a single exercise by ID from local cache', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            let exercise: any;
            await act(async () => {
                exercise = await result.current.getExerciseById('ex-1');
            });

            // getExerciseById returns { data, error } object
            expect(exercise?.data?.name).toBe('Bench Press');
        });
    });

    describe('clearCache', () => {
        it('clears the exercise cache', async () => {
            const { result } = renderHook(() => useExercises(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.exercises.length).toBeGreaterThan(0);
            });

            await act(async () => {
                await result.current.clearCache();
            });

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_exercises');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_exercises_timestamp');
        });
    });
});
