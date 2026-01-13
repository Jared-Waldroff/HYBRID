
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSquadEvents } from '../../hooks/useSquadEvents';
import { mockSupabase, mockSupabaseResponse } from '../mocks/supabase';
import { MockAuthProvider } from '../test-utils';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
    supabase: jest.requireActual('../mocks/supabase').mockSupabase,
}));

// Mock Image.prefetch
jest.mock('expo-image', () => ({
    Image: {
        prefetch: jest.fn(),
    },
}));

describe('useSquadEvents', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads events and separates my events', async () => {
        const mockEvents = [
            { id: '1', name: 'Public Event', creator_id: 'other-user', participants: [{ count: 5 }] },
            { id: '2', name: 'My Event', creator_id: 'test-user-id', participants: [{ count: 1 }] },
        ];

        // Mock user's participations
        const mockParticipations = [{ event_id: '1' }]; // User joined event 1

        // Mock creator profiles
        const mockProfiles = [
            { user_id: 'other-user', display_name: 'Other', avatar_url: null },
            { user_id: 'test-user-id', display_name: 'Me', avatar_url: null }
        ];

        // Mock chains
        // Step 1: squad_events query (eq is_active -> return this)
        // Step 2: participants query (eq user_id -> return value)
        mockSupabase.eq
            .mockReturnValueOnce(mockSupabase) // for is_active - return builder
            .mockResolvedValueOnce(mockSupabaseResponse(mockParticipations)); // for user_id - return data

        mockSupabase.from.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.order.mockResolvedValueOnce(mockSupabaseResponse(mockEvents)); // loadEvents main query

        // Mock profiles check
        mockSupabase.from.mockReturnThis();
        mockSupabase.select.mockReturnThis();
        mockSupabase.in.mockResolvedValueOnce(mockSupabaseResponse(mockProfiles));

        const { result } = renderHook(() => useSquadEvents(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Check all events loaded
        expect(result.current.events).toHaveLength(2);

        // Check my events (created OR joined)
        // Event 1: Joined (via mockParticipations)
        // Event 2: Created (via creator_id)
        // So both should be in myEvents
        expect(result.current.myEvents).toHaveLength(2);
    });

    it('joins an event successfully', async () => {
        mockSupabase.insert.mockResolvedValue(mockSupabaseResponse(null));

        const { result } = renderHook(() => useSquadEvents(), {
            wrapper: MockAuthProvider,
        });

        await waitFor(async () => {
            await result.current.joinEvent('event-123');
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('event_participants');
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
            event_id: 'event-123',
            user_id: 'test-user-id'
        }));
    });
});
