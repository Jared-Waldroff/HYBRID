
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('useAthleteProfile', () => {
    const mockProfile = {
        id: 'profile-1',
        user_id: 'test-user-id',
        username: 'testathlete',
        display_name: 'Test Athlete',
        bio: 'Fitness enthusiast',
        avatar_url: 'https://example.com/avatar.jpg',
        badges: ['early_adopter', 'first_workout'],
        is_private: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        // Re-establish mock chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.upsert.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    describe('fetching profile', () => {
        it('loads profile from Supabase on mount', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profile).toEqual(mockProfile);
            expect(result.current.error).toBeNull();
        });

        it('loads profile from cache for instant display', async () => {
            const cachedProfile = JSON.stringify(mockProfile);
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'cached_athlete_profile') return Promise.resolve(cachedProfile);
                return Promise.resolve(null);
            });

            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            // Cache should load quickly
            await waitFor(() => {
                expect(result.current.profile).toBeTruthy();
            });

            expect(result.current.profile?.username).toBe('testathlete');
        });

        it('handles profile not found (new user)', async () => {
            // Simulate "no rows" response
            mockSupabase.single.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
            });

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.profile).toBeNull();
            expect(result.current.error).toBeNull(); // PGRST116 is handled gracefully
        });

        it('handles fetch errors', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseError('Network error'));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe('Network error');
        });
    });

    describe('updateProfile', () => {
        it('updates profile fields', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

            const updatedProfile = { ...mockProfile, display_name: 'Updated Name' };
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedProfile));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => expect(result.current.loading).toBe(false));

            const response = await result.current.updateProfile({ display_name: 'Updated Name' });

            expect(mockSupabase.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'test-user-id',
                    display_name: 'Updated Name',
                }),
                { onConflict: 'user_id' }
            );
            expect(response.data?.display_name).toBe('Updated Name');
            expect(AsyncStorage.setItem).toHaveBeenCalled();
        });

        it('updates username', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

            const updatedProfile = { ...mockProfile, username: 'newusername' };
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedProfile));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => expect(result.current.loading).toBe(false));

            const response = await result.current.updateProfile({ username: 'newusername' });

            expect(response.data?.username).toBe('newusername');
        });

        it('returns error when not authenticated', async () => {
            // Use a wrapper that provides null user
            const NullUserWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
                return React.createElement(MockAuthProvider, { user: null, children });
            };

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: NullUserWrapper,
            });

            await waitFor(() => expect(result.current.loading).toBe(false));

            const response = await result.current.updateProfile({ display_name: 'Test' });

            expect(response.error).toBe('Not authenticated');
        });
    });

    describe('badges', () => {
        describe('hasBadge', () => {
            it('returns true for existing badge', async () => {
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                expect(result.current.hasBadge('early_adopter')).toBe(true);
                expect(result.current.hasBadge('first_workout')).toBe(true);
            });

            it('returns false for non-existing badge', async () => {
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                expect(result.current.hasBadge('nonexistent_badge')).toBe(false);
            });

            it('returns false when profile has no badges', async () => {
                const profileNoBadges = { ...mockProfile, badges: null };
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(profileNoBadges));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                expect(result.current.hasBadge('any_badge')).toBe(false);
            });
        });

        describe('addBadge', () => {
            it('adds a new badge', async () => {
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

                const updatedProfile = {
                    ...mockProfile,
                    badges: [...mockProfile.badges, 'new_badge'],
                };
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                let response: any;
                await act(async () => {
                    response = await result.current.addBadge('new_badge');
                });

                expect(mockSupabase.upsert).toHaveBeenCalledWith(
                    expect.objectContaining({
                        badges: expect.arrayContaining(['new_badge']),
                    }),
                    { onConflict: 'user_id' }
                );
                expect(response.error).toBeNull();
            });

            it('does not add duplicate badge', async () => {
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                let response: any;
                await act(async () => {
                    response = await result.current.addBadge('early_adopter');
                });

                expect(response.error).toContain('Badge already exists');
            });

            it('adds badge when profile has no badges array', async () => {
                const profileNoBadges = { ...mockProfile, badges: null };
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(profileNoBadges));

                const updatedProfile = { ...profileNoBadges, badges: ['first_badge'] };
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                let response: any;
                await act(async () => {
                    response = await result.current.addBadge('first_badge');
                });

                expect(response.error).toBeNull();
            });
        });

        describe('removeBadge', () => {
            it('removes an existing badge', async () => {
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

                const updatedProfile = {
                    ...mockProfile,
                    badges: ['first_workout'], // early_adopter removed
                };
                mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedProfile));

                const { result } = renderHook(() => useAthleteProfile(), {
                    wrapper: MockAuthProvider,
                });

                await waitFor(() => expect(result.current.loading).toBe(false));

                let response: any;
                await act(async () => {
                    response = await result.current.removeBadge('early_adopter');
                });

                expect(mockSupabase.update).toHaveBeenCalledWith({
                    badges: ['first_workout'],
                });
                expect(response.error).toBeNull();
            });
        });
    });

    describe('clearCache', () => {
        it('clears the profile cache', async () => {
            mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(mockProfile));

            const { result } = renderHook(() => useAthleteProfile(), {
                wrapper: MockAuthProvider,
            });

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Wrap state-changing operation in act
            await act(async () => {
                await result.current.clearCache();
            });

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_athlete_profile');
            // Note: The profile state is set to null asynchronously, so we wait for it
            await waitFor(() => {
                expect(result.current.profile).toBeNull();
            });
        });
    });
});
