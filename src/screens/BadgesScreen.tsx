import React from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';
import ScreenLayout from '../components/ScreenLayout';
import BadgeGrid from '../components/BadgeGrid';
import { useAuth } from '../context/AuthContext';
import { useAthleteProfile } from '../hooks/useAthleteProfile';

export default function BadgesScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { themeColors, colors: userColors } = useTheme();
    const { user: currentUser } = useAuth();
    const { profile: myProfile } = useAthleteProfile();

    // Get user from params, or fallback to current user's profile (for tab navigation)
    const { user: passedUser } = route.params || {};
    const user = passedUser || myProfile;
    const isFromTab = !passedUser; // No back button when accessed via tab swipe

    // If no user and no profile yet, show loading or empty state
    if (!user) {
        return (
            <ScreenLayout>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: themeColors.textPrimary }}>Loading achievements...</Text>
                </View>
            </ScreenLayout>
        );
    }

    const isOwnProfile = user.id === currentUser?.id || user.user_id === currentUser?.id;

    return (
        <ScreenLayout>
            <View style={styles.header}>
                {isFromTab ? (
                    <View style={{ width: 24 }} />
                ) : (
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={themeColors.textPrimary} />
                    </Pressable>
                )}
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                    {isOwnProfile ? 'My Achievements' : `${user.display_name}'s Achievements`}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <BadgeGrid
                    earnedBadges={user.badges}
                    showLocked={true}
                />
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 80,
    }
});
