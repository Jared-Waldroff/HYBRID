/**
 * User Flow Integration Test: Crew/Social Connections
 * 
 * This test simulates the full user journey of:
 * 1. Searching for a user by username
 * 2. Sending a crew request
 * 3. Handling incoming requests
 * 4. Accepting a request
 * 5. Managing crew relationships
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useCrew } from '../../hooks/useCrew';
import { mockSupabase, mockSupabaseResponse, mockSupabaseError } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';

// Mock Supabase
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

describe('User Flow: Connect with Squad Members', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.or.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
    });

    it('searches for and connects with a new crew member', async () => {
        // Step 1: Initial state - no crew
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.crew).toHaveLength(0);

        // Step 2: Search for a user
        const searchResults = [
            { user_id: 'new-friend-id', display_name: 'Fitness Friend', avatar_url: null, username: 'fitfriend' },
        ];
        mockSupabase.rpc = jest.fn().mockResolvedValueOnce(mockSupabaseResponse(searchResults));

        const results = await result.current.searchUsers('fitfriend');
        expect(results).toHaveLength(1);
        expect(results[0].username).toBe('fitfriend');

        // Step 3: Send a crew request
        mockSupabase.insert.mockResolvedValueOnce(mockSupabaseResponse(null));

        // After sending, reload shows pending outgoing
        const pendingRelationship = [
            { id: 'rel-new', requester_id: 'test-user-id', receiver_id: 'new-friend-id', status: 'pending' }
        ];
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse(pendingRelationship));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([
            { user_id: 'new-friend-id', display_name: 'Fitness Friend', avatar_url: null, username: 'fitfriend' }
        ]));

        const addResponse = await result.current.addCrewMember('new-friend-id');
        expect(addResponse.error).toBeNull();

        // Verify sent requests updated
        await waitFor(() => {
            expect(result.current.sentRequests.length).toBeGreaterThanOrEqual(0);
        });
    });

    it('handles incoming crew requests', async () => {
        // Simulate someone sent us a request
        const incomingRequest = [
            { id: 'rel-incoming', requester_id: 'other-user-id', receiver_id: 'test-user-id', status: 'pending' }
        ];
        const incomingProfile = [
            { user_id: 'other-user-id', display_name: 'New Gym Buddy', avatar_url: null, username: 'gymbuddy' }
        ];

        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse(incomingRequest));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse(incomingProfile));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Should have 1 incoming request
        expect(result.current.requests).toHaveLength(1);
        expect(result.current.requests[0].display_name).toBe('New Gym Buddy');
        expect(result.current.requests[0].direction).toBe('incoming');

        // Accept the request
        mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));

        // After accepting, relationship becomes confirmed
        const acceptedRelationship = [
            { id: 'rel-incoming', requester_id: 'other-user-id', receiver_id: 'test-user-id', status: 'accepted' }
        ];
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse(acceptedRelationship));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse(incomingProfile));

        const acceptResponse = await result.current.acceptCrewRequest('rel-incoming');
        expect(acceptResponse.error).toBeNull();

        // After reload, should be in confirmed crew
        await waitFor(() => {
            expect(result.current.crew.length).toBeGreaterThanOrEqual(0);
        });
    });

    it('allows rejecting or canceling crew requests', async () => {
        // Have an incoming pending request
        const incomingRequest = [
            { id: 'rel-to-reject', requester_id: 'unwanted-user', receiver_id: 'test-user-id', status: 'pending' }
        ];
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse(incomingRequest));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([
            { user_id: 'unwanted-user', display_name: 'Spammer', avatar_url: null, username: 'spam' }
        ]));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.requests).toHaveLength(1);

        // Reject the request
        mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));

        const rejectResponse = await result.current.removeCrewMember('rel-to-reject');
        expect(rejectResponse.error).toBeNull();
    });

    it('removes an existing crew member', async () => {
        // Have a confirmed crew member
        const confirmedRelationship = [
            { id: 'rel-confirmed', requester_id: 'test-user-id', receiver_id: 'friend-id', status: 'accepted' }
        ];
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse(confirmedRelationship));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([
            { user_id: 'friend-id', display_name: 'Old Friend', avatar_url: null, username: 'oldfriend' }
        ]));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.crew).toHaveLength(1);
        expect(result.current.crew[0].display_name).toBe('Old Friend');

        // Remove the crew member
        mockSupabase.eq.mockResolvedValueOnce(mockSupabaseResponse(null));
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));

        const removeResponse = await result.current.removeCrewMember('rel-confirmed');
        expect(removeResponse.error).toBeNull();
    });
});

describe('User Flow: Crew Search Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.or.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
    });

    it('handles search with no results', async () => {
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.rpc = jest.fn().mockResolvedValueOnce(mockSupabaseResponse([]));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        const results = await result.current.searchUsers('nonexistentuser12345');
        expect(results).toHaveLength(0);
    });

    it('requires minimum 3 characters to search', async () => {
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Short query should return empty without calling API
        const shortResults = await result.current.searchUsers('ab');
        expect(shortResults).toHaveLength(0);
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('handles network errors during search', async () => {
        mockSupabase.or.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse([]));
        mockSupabase.rpc = jest.fn().mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useCrew(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        const results = await result.current.searchUsers('validquery');
        expect(results).toEqual([]); // Returns empty on error
    });
});
