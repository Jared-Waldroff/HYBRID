import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';
import { EVENT_TYPES } from '../hooks/useSquadEvents';

interface EventCardProps {
    event: {
        id: string;
        name: string;
        event_type: string;
        event_date: string;
        cover_image_url?: string | null;
        is_private: boolean;
        creator?: {
            display_name: string;
            avatar_url?: string;
        };
        participant_count?: number;
        is_participating?: boolean;
    };
    progress?: {
        completed: number;
        total: number;
    };
    onPress?: () => void;
    onJoin?: () => void;
    compact?: boolean;
}

export default function EventCard({
    event,
    progress,
    onPress,
    onJoin,
    compact = false
}: EventCardProps) {
    const { themeColors, colors: userColors } = useTheme();

    // Calculate days until event
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get event type info
    const eventType = EVENT_TYPES.find(t => t.id === event.event_type) || EVENT_TYPES[EVENT_TYPES.length - 1];

    // Progress percentage
    const progressPercent = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

    // Format event date
    const formatEventDate = () => {
        return eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: eventDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
    };

    // Countdown text
    const getCountdownText = () => {
        if (daysUntil < 0) return 'Event passed';
        if (daysUntil === 0) return 'Today!';
        if (daysUntil === 1) return 'Tomorrow!';
        if (daysUntil <= 7) return `${daysUntil} days`;
        if (daysUntil <= 30) return `${Math.ceil(daysUntil / 7)} weeks`;
        return `${Math.ceil(daysUntil / 30)} months`;
    };

    // Countdown color
    const getCountdownColor = () => {
        if (daysUntil <= 7) return '#ef4444'; // Red - urgent
        if (daysUntil <= 14) return '#f97316'; // Orange - soon
        if (daysUntil <= 30) return '#f59e0b'; // Yellow - coming up
        return themeColors.textSecondary;
    };

    if (compact) {
        return (
            <Pressable
                style={[styles.compactCard, { backgroundColor: themeColors.bgSecondary }]}
                onPress={onPress}
            >
                <View style={[styles.compactIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                    <Feather name={eventType.icon as any} size={20} color={userColors.accent_color} />
                </View>
                <View style={styles.compactInfo}>
                    <Text style={[styles.compactName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {event.name}
                    </Text>
                    <Text style={[styles.compactDate, { color: themeColors.textSecondary }]}>
                        {formatEventDate()} • {getCountdownText()}
                    </Text>
                </View>
                {progress && (
                    <View style={styles.compactProgress}>
                        <Text style={[styles.progressText, { color: userColors.accent_color }]}>
                            {progressPercent}%
                        </Text>
                    </View>
                )}
                <Feather name="chevron-right" size={20} color={themeColors.textMuted} />
            </Pressable>
        );
    }

    return (
        <Pressable
            style={[styles.card, { backgroundColor: themeColors.bgSecondary }]}
            onPress={onPress}
        >
            {/* Cover Image or Gradient */}
            <View style={[styles.coverContainer, { backgroundColor: themeColors.bgTertiary }]}>
                {event.cover_image_url ? (
                    <Image
                        source={{ uri: event.cover_image_url }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.coverGradient, { backgroundColor: `${userColors.accent_color}30` }]}>
                        <Feather name={eventType.icon as any} size={48} color={userColors.accent_color} />
                    </View>
                )}

                {/* Countdown Badge */}
                <View style={[styles.countdownBadge, { backgroundColor: themeColors.bgPrimary }]}>
                    <Text style={[styles.countdownText, { color: getCountdownColor() }]}>
                        {getCountdownText()}
                    </Text>
                </View>

                {/* Privacy Badge */}
                {event.is_private && (
                    <View style={[styles.privateBadge, { backgroundColor: themeColors.bgPrimary }]}>
                        <Feather name="lock" size={12} color={themeColors.textSecondary} />
                    </View>
                )}
            </View>

            {/* Event Info */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.typeTag}>
                        <Feather name={eventType.icon as any} size={14} color={userColors.accent_color} />
                        <Text style={[styles.typeText, { color: userColors.accent_color }]}>
                            {eventType.name}
                        </Text>
                    </View>
                    <Text style={[styles.date, { color: themeColors.textSecondary }]}>
                        {formatEventDate()}
                    </Text>
                </View>

                <Text style={[styles.name, { color: themeColors.textPrimary }]} numberOfLines={2}>
                    {event.name}
                </Text>

                {/* Creator & Participants */}
                <View style={styles.meta}>
                    {event.creator && (
                        <View style={styles.creator}>
                            {event.creator.avatar_url ? (
                                <Image
                                    source={{ uri: event.creator.avatar_url }}
                                    style={styles.creatorAvatar}
                                />
                            ) : (
                                <View style={[styles.creatorAvatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                                    <Text style={[styles.creatorInitial, { color: themeColors.textSecondary }]}>
                                        {event.creator.display_name?.[0]?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                            <Text style={[styles.creatorName, { color: themeColors.textSecondary }]} numberOfLines={1}>
                                by {event.creator.display_name}
                            </Text>
                        </View>
                    )}

                    <View style={styles.participants}>
                        <Feather name="users" size={14} color={themeColors.textMuted} />
                        <Text style={[styles.participantCount, { color: themeColors.textMuted }]}>
                            {event.participant_count || 0}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar (if participating) */}
                {progress && event.is_participating && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>
                                Training Progress
                            </Text>
                            <Text style={[styles.progressValue, { color: userColors.accent_color }]}>
                                {progress.completed}/{progress.total} ({progressPercent}%)
                            </Text>
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: themeColors.bgTertiary }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        backgroundColor: userColors.accent_color,
                                        width: `${progressPercent}%`
                                    }
                                ]}
                            />
                        </View>
                    </View>
                )}

                {/* Join Button (if not participating) */}
                {!event.is_participating && onJoin && (
                    <Pressable
                        style={[styles.joinButton, { backgroundColor: userColors.accent_color }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onJoin();
                        }}
                    >
                        <Text style={[styles.joinButtonText, { color: themeColors.accentText }]}>
                            Join Event
                        </Text>
                    </Pressable>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Full Card Styles
    card: {
        borderRadius: radii.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    coverContainer: {
        height: 120,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.sm,
    },
    countdownText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    privateBadge: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        padding: spacing.xs,
        borderRadius: radii.full,
    },
    content: {
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    typeText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
        textTransform: 'uppercase',
    },
    date: {
        fontSize: typography.sizes.sm,
    },
    name: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
    },
    meta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    creator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    creatorAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    creatorAvatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    creatorInitial: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    creatorName: {
        fontSize: typography.sizes.sm,
        flex: 1,
    },
    participants: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    participantCount: {
        fontSize: typography.sizes.sm,
    },
    progressContainer: {
        marginTop: spacing.md,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    progressLabel: {
        fontSize: typography.sizes.sm,
    },
    progressValue: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    joinButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    joinButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },

    // Compact Card Styles
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    compactIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactInfo: {
        flex: 1,
    },
    compactName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    compactDate: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    compactProgress: {
        paddingHorizontal: spacing.sm,
    },
    progressText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
});
