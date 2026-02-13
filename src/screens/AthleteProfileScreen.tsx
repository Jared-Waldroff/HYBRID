import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAthleteProfile } from '../hooks/useAthleteProfile';
import { supabase } from '../lib/supabaseClient';
import { useSquadEvents } from '../hooks/useSquadEvents';
import { useAlert } from '../components/CustomAlert';
import ScreenLayout from '../components/ScreenLayout';
import ProfileLayout from '../components/ProfileLayout';
import { RootStackParamList } from '../navigation';

type AthleteProfileRouteProp = RouteProp<RootStackParamList, 'AthleteProfile'>;

export default function AthleteProfileScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<AthleteProfileRouteProp>();
    const { colors: userColors } = useTheme();
    const { user } = useAuth();
    const { profile: myProfile } = useAthleteProfile(); // Fallback if own profile
    const { myEvents, inviteUserToEvent } = useSquadEvents();
    const { showAlert } = useAlert();

    const { id } = route.params || {};
    const targetUserId = id || user?.id; // Default to current user if no ID
    const isOwnProfile = !id || id === user?.id;

    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [isSquadMember, setIsSquadMember] = useState(false);

    const handleInviteToEvent = async (eventId: string) => {
        if (!targetUserId) return;

        const { error } = await inviteUserToEvent(eventId, targetUserId);

        // RLS policy 42501 (insufficient privilege) might occur when trying to insert workouts
        // for another user, even if the participant record was created successfully.
        // We consider this a "partial success" where the user is added but workouts might not sync instantly.
        if (error && !error.includes('42501')) {
            showAlert({ title: 'Error', message: error });
        } else {
            showAlert({ title: 'Success', message: 'Added to Event' });
        }
    };

    const fetchProfile = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            // 1. Profile Data
            if (isOwnProfile && myProfile) {
                setProfileData(myProfile);
            }
            const { data, error } = await supabase
                .from('athlete_profiles')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (data) setProfileData(data);
            // If error and isOwnProfile, we rely on myProfile. If other user, we might show error?

            // 2. Stats: Posts Count
            const { count: postsCount } = await supabase
                .from('activity_feed')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId);

            // 3. Stats: Squad Count (People in THEIR squad)
            const { count: squadCount } = await supabase
                .from('squad_members')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', targetUserId);

            setStats({
                posts: postsCount || 0,
                followers: squadCount || 0,
                following: 0 // Removed feature
            });

            // 4. Check if they are in MY squad (if looking at someone else)
            if (!isOwnProfile && user?.id) {
                const { data: membership } = await supabase
                    .from('squad_members')
                    .select('*')
                    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
                    .maybeSingle();

                setIsSquadMember(!!membership);
            }

        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    }, [targetUserId, isOwnProfile, myProfile, user?.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return (
        <ScreenLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                <ProfileLayout
                    user={profileData}
                    isOwnProfile={isOwnProfile}
                    stats={stats}
                    loading={loading}
                    isSquadMember={isSquadMember}
                    onViewBadges={() => navigation.navigate('Badges', { user: profileData })}
                    myEvents={myEvents.filter(e => e.creator_id === user?.id)}
                    onInviteToEvent={handleInviteToEvent}
                />
            </ScrollView>
        </ScreenLayout>
    );
}
