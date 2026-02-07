import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAthleteProfile } from '../hooks/useAthleteProfile';
import { supabase } from '../lib/supabaseClient';
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

    const { id } = route.params || {};
    const targetUserId = id || user?.id; // Default to current user if no ID
    const isOwnProfile = !id || id === user?.id;

    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [isSquadMember, setIsSquadMember] = useState(false);

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
                    .eq('squad_id', user.id) // My Squad
                    .eq('member_id', targetUserId)
                    .single();

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
                />
            </ScrollView>
        </ScreenLayout>
    );
}
