import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfileHeader from './ProfileHeader';
import ProfileGallery from './ProfileGallery';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography, radii } from '../theme';

interface ProfileLayoutProps {
    user: any;
    isOwnProfile: boolean;
    stats?: { posts: number; followers: number; following: number };
    children?: React.ReactNode;
    loading?: boolean;
    onEditProfile?: () => void;
    onViewBadges?: () => void;
    isSquadMember?: boolean;
}

export default function ProfileLayout({
    user,
    isOwnProfile,
    stats,
    children,
    loading,
    onEditProfile,
    onViewBadges,
    isSquadMember
}: ProfileLayoutProps) {
    const { themeColors, colors: userColors } = useTheme();

    return (
        <View style={styles.container}>
            {/* Header */}
            <ProfileHeader
                user={user}
                isOwnProfile={isOwnProfile}
                stats={stats}
                loading={loading}
                onEditProfile={onEditProfile}
                onFollow={() => { console.log('Add to Squad Pressed') }}
                isSquadMember={isSquadMember}
            />

            {/* Gallery Section */}
            <View style={styles.sectionHeader} />
            <ProfileGallery userId={user?.id || user?.user_id} />

            {/* View Achievements Button (Replaces Milestones/Badges Section) */}
            <View style={[styles.badgesSection, { borderTopColor: themeColors.glassBorder, borderBottomColor: themeColors.glassBorder }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.viewBadgesButton,
                        { backgroundColor: themeColors.bgSecondary },
                        pressed && { opacity: 0.8 }
                    ]}
                    onPress={onViewBadges}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={[styles.iconContainer, { backgroundColor: userColors.accent_color + '20' }]}>
                            <Feather name="award" size={20} color={userColors.accent_color} />
                        </View>
                        <Text style={[styles.buttonText, { color: themeColors.textPrimary }]}>
                            View Achievements & Stats
                        </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={themeColors.textMuted} />
                </Pressable>
            </View>

            {/* Additional Content (Settings, etc.) */}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionHeader: {
        // height: spacing.md, 
    },
    badgesSection: {
        borderTopWidth: 1,
        borderBottomWidth: 1, // Add bottom border to separate from settings/content below
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    viewBadgesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radii.md,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: radii.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
});
