import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PROFILE_CACHE_KEY = 'cached_athlete_profile';

interface AthleteProfile {
    id?: string;
    user_id?: string;
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    badges?: string[];
    is_private?: boolean;
}

export function useAthleteProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<AthleteProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load cached profile immediately on mount
    useEffect(() => {
        const loadCachedProfile = async () => {
            try {
                const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Only use cache if it's for the current user
                    if (parsed.user_id === user?.id) {
                        setProfile(parsed);
                    }
                }
            } catch (err) {
                console.warn('Failed to load cached profile:', err);
            }
        };

        if (user) {
            loadCachedProfile();
        }
    }, [user?.id]);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const { data, error: fetchError } = await supabase
                .from('athlete_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            const profileData = data || null;
            setProfile(profileData);
            setError(null);

            // Cache the profile for instant loading next time
            if (profileData) {
                await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileData));
            }
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const updateProfile = async (updates: Partial<AthleteProfile>) => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const { data, error: updateError } = await supabase
                .from('athlete_profiles')
                .upsert(
                    {
                        user_id: user.id,
                        ...updates,
                    },
                    { onConflict: 'user_id' }
                )
                .select()
                .single();

            if (updateError) throw updateError;

            setProfile(data);

            // Update cache
            if (data) {
                await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
            }

            return { data, error: null };
        } catch (err: any) {
            console.error('Error updating profile:', err);
            return { data: null, error: err.message };
        }
    };

    const hasBadge = (badgeId: string) => {
        return profile?.badges?.includes(badgeId) || false;
    };

    const addBadge = async (badgeId: string) => {
        if (!user || hasBadge(badgeId)) return { error: 'Badge already exists or not authenticated' };

        try {
            const currentBadges = profile?.badges || [];
            const newBadges = [...currentBadges, badgeId];

            const { data, error: updateError } = await supabase
                .from('athlete_profiles')
                .upsert(
                    {
                        user_id: user.id,
                        badges: newBadges,
                    },
                    { onConflict: 'user_id' }
                )
                .select()
                .single();

            if (updateError) throw updateError;

            const updatedProfile = { ...profile, badges: newBadges };
            setProfile(updatedProfile as AthleteProfile);

            // Update cache
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));

            return { data, error: null };
        } catch (err: any) {
            console.error('Error adding badge:', err);
            return { data: null, error: err.message };
        }
    };

    const removeBadge = async (badgeId: string) => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const currentBadges = profile?.badges || [];
            const newBadges = currentBadges.filter((b) => b !== badgeId);

            const { data, error: updateError } = await supabase
                .from('athlete_profiles')
                .update({ badges: newBadges })
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            const updatedProfile = { ...profile, badges: newBadges };
            setProfile(updatedProfile as AthleteProfile);

            // Update cache
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updatedProfile));

            return { data, error: null };
        } catch (err: any) {
            console.error('Error removing badge:', err);
            return { data: null, error: err.message };
        }
    };

    // Clear cache on logout
    const clearCache = async () => {
        await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
        setProfile(null);
    };

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        profile,
        loading,
        error,
        fetchProfile,
        updateProfile,
        hasBadge,
        addBadge,
        removeBadge,
        clearCache,
    };
}
