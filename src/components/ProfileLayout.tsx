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
    myEvents?: any[]; // Avoiding circular import for SquadEvent
    onInviteToEvent?: (eventId: string) => void;
}

export default function ProfileLayout({
    user,
    isOwnProfile,
    stats,
    children,
    loading,
    onEditProfile,
    onViewBadges,
    isSquadMember,
    myEvents,
    onInviteToEvent
}: ProfileLayoutProps) {
    const { themeColors, colors: userColors } = useTheme();

    // Event Invite Section
    const renderInviteSection = () => {
        if (!myEvents || myEvents.length === 0 || isOwnProfile || !onInviteToEvent || !isSquadMember) return null;

        return (
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    Invite to Event
                </Text>
                <View style={styles.eventsList}>
                    {myEvents.map(event => (
                        <Pressable
                            key={event.id}
                            style={[
                                styles.eventItem,
                                { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.glassBorder }
                            ]}
                            onPress={() => onInviteToEvent(event.id)}
                        >
                            <View style={[styles.eventIcon, { backgroundColor: event.color || userColors.accent_color }]}>
                                <Feather name="calendar" size={16} color="#fff" />
                            </View>
                            <View style={styles.eventInfo}>
                                <Text style={[styles.eventName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                    {event.name}
                                </Text>
                                <Text style={[styles.eventDate, { color: themeColors.textSecondary }]}>
                                    {new Date(event.event_date).toLocaleDateString()}
                                </Text>
                            </View>
                            <Feather name="plus" size={18} color={userColors.accent_color} />
                        </Pressable>
                    ))}
                </View>
            </View>
        );
    };

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
            <ProfileGallery userId={user?.user_id || user?.id} />

            {/* View Achievements Button */}
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

            {/* Invite to Event Section */}
            {renderInviteSection()}

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
    sectionContainer: {
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
    },
    eventsList: {
        gap: spacing.sm,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    eventIcon: {
        width: 32,
        height: 32,
        borderRadius: radii.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    eventInfo: {
        flex: 1,
    },
    eventName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    eventDate: {
        fontSize: typography.sizes.xs,
    },
});
