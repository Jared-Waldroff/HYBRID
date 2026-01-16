/**
 * User Flow Integration Test: Profile Management
 * 
 * This test simulates the full user journey of:
 * 1. Viewing their profile
 * 2. Updating profile information
 * 3. Managing badges
 * 4. Cache handling
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('User Flow: Profile Management', () => {
    const initialProfile = {
        id: 'profile-1',
        user_id: 'test-user-id',
        username: 'fituser',
        display_name: 'Fit User',
        bio: 'Just getting started!',
        avatar_url: null,
        badges: [],
        is_private: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.upsert.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    it('completes profile setup for new user', async () => {
        // Step 1: New user has no profile yet
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
        });

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile).toBeNull();

        // Step 2: User sets up their profile
        const newProfile = {
            ...initialProfile,
            username: 'newathlete',
            display_name: 'New Athlete',
            bio: 'Ready to train!',
        };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(newProfile));

        const updateResponse = await result.current.updateProfile({
            username: 'newathlete',
            display_name: 'New Athlete',
            bio: 'Ready to train!',
        });

        expect(updateResponse.data?.username).toBe('newathlete');
        expect(updateResponse.data?.display_name).toBe('New Athlete');
        expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('updates profile information progressively', async () => {
        // Start with existing profile
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(initialProfile));

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile?.display_name).toBe('Fit User');

        // Update display name
        const updatedName = { ...initialProfile, display_name: 'Super Fit User' };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedName));

        await act(async () => {
            await result.current.updateProfile({ display_name: 'Super Fit User' });
        });
        expect(result.current.profile?.display_name).toBe('Super Fit User');

        // Update bio
        const updatedBio = { ...updatedName, bio: 'Training for my first marathon!' };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(updatedBio));

        await act(async () => {
            await result.current.updateProfile({ bio: 'Training for my first marathon!' });
        });
        expect(result.current.profile?.bio).toBe('Training for my first marathon!');
    });

    it('manages badges through milestones', async () => {
        // User starts with no badges
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(initialProfile));

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile?.badges).toHaveLength(0);

        // User completes first workout - earns badge
        const withFirstBadge = { ...initialProfile, badges: ['first_workout'] };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(withFirstBadge));

        await act(async () => {
            await result.current.addBadge('first_workout');
        });
        expect(result.current.hasBadge('first_workout')).toBe(true);

        // User reaches 7-day streak - earns another badge
        const withStreakBadge = { ...withFirstBadge, badges: ['first_workout', 'week_warrior'] };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(withStreakBadge));

        await act(async () => {
            await result.current.addBadge('week_warrior');
        });
        expect(result.current.hasBadge('week_warrior')).toBe(true);

        // Check all badges
        expect(result.current.hasBadge('first_workout')).toBe(true);
        expect(result.current.hasBadge('week_warrior')).toBe(true);
        expect(result.current.hasBadge('nonexistent')).toBe(false);
    });

    it('handles privacy settings', async () => {
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(initialProfile));

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile?.is_private).toBe(false);

        // User makes profile private
        const privateProfile = { ...initialProfile, is_private: true };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(privateProfile));

        await act(async () => {
            await result.current.updateProfile({ is_private: true });
        });
        expect(result.current.profile?.is_private).toBe(true);
    });
});

describe('User Flow: Profile Cache Behavior', () => {
    const cachedProfile = {
        id: 'profile-1',
        user_id: 'test-user-id',
        username: 'cacheduser',
        display_name: 'Cached User',
        bio: 'From cache',
        avatar_url: null,
        badges: ['cached_badge'],
        is_private: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue(mockSupabaseResponse(null));
    });

    it('loads from cache for instant display', async () => {
        // Cache exists
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedProfile));

        // Fresh data from server
        const freshProfile = { ...cachedProfile, display_name: 'Fresh User' };
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(freshProfile));

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        // Should quickly show cached data
        await waitFor(() => {
            expect(result.current.profile).toBeTruthy();
        });

        // Cache should be used initially for instant display
        expect(result.current.profile?.username).toBe('cacheduser');
    });

    it('clears cache on logout', async () => {
        mockSupabase.single.mockResolvedValueOnce(mockSupabaseResponse(cachedProfile));

        const { result } = renderHook(() => useAthleteProfile(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.clearCache();
        });

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_athlete_profile');
        expect(result.current.profile).toBeNull();
    });
});
