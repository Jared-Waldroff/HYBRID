import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Image,
    Dimensions,
    Modal,
    ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';
import { FeedPost, formatRelativeTime, formatDuration } from '../hooks/useActivityFeed';
import { FEELING_OPTIONS } from '../hooks/useEventWorkouts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedPostCardProps {
    post: FeedPost;
    onLfg: () => void;
    onComment: () => void;
    onUserPress?: (userId: string) => void;
    onEventPress?: (eventId: string) => void;
}

export default function FeedPostCard({
    post,
    onLfg,
    onComment,
    onUserPress,
    onEventPress,
}: FeedPostCardProps) {
    const { themeColors, colors: userColors } = useTheme();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);

    // Get feeling emoji
    const feeling = FEELING_OPTIONS.find(f => f.id === post.completion?.feeling);

    // Format workout result
    const formatResult = () => {
        if (!post.completion) return null;

        const parts: string[] = [];

        if (post.completion.actual_value && post.completion.actual_unit) {
            parts.push(`${post.completion.actual_value} ${post.completion.actual_unit}`);
        }

        if (post.completion.actual_zone) {
            const zoneNum = post.completion.actual_zone.replace('zone', '');
            parts.push(`Zone ${zoneNum}`);
        }

        if (post.completion.duration_seconds) {
            parts.push(formatDuration(post.completion.duration_seconds));
        }

        return parts.length > 0 ? parts.join(' • ') : null;
    };

    const result = formatResult();
    const hasPhotos = post.photo_urls && post.photo_urls.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgSecondary }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.userInfo}
                    onPress={() => onUserPress?.(post.user_id)}
                >
                    {post.user?.avatar_url ? (
                        <Image
                            source={{ uri: post.user.avatar_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                            <Text style={[styles.avatarInitial, { color: themeColors.textSecondary }]}>
                                {post.user?.display_name?.[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: themeColors.textPrimary }]}>
                            {post.user?.display_name || 'Unknown'}
                        </Text>
                        <View style={styles.headerMeta}>
                            <Text style={[styles.timeAgo, { color: themeColors.textMuted }]}>
                                {formatRelativeTime(post.created_at)}
                            </Text>
                            {post.event && (
                                <>
                                    <Text style={[styles.metaDot, { color: themeColors.textMuted }]}>•</Text>
                                    <Pressable onPress={() => onEventPress?.(post.event_id)}>
                                        <Text style={[styles.eventName, { color: userColors.accent_color }]}>
                                            {post.event.name}
                                        </Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                </Pressable>

                {feeling && (
                    <View style={[styles.feelingBadge, { backgroundColor: `${feeling.color}20` }]}>
                        <Text style={styles.feelingEmoji}>{feeling.emoji}</Text>
                    </View>
                )}
            </View>

            {/* Workout Info */}
            {post.completion?.training_workout && (
                <View style={[styles.workoutCard, { backgroundColor: themeColors.bgTertiary }]}>
                    <View style={styles.workoutHeader}>
                        <Feather name="activity" size={16} color={userColors.accent_color} />
                        <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>
                            {post.completion.training_workout.name}
                        </Text>
                    </View>

                    {result && (
                        <View style={styles.resultRow}>
                            <Text style={[styles.resultLabel, { color: themeColors.textSecondary }]}>
                                Completed:
                            </Text>
                            <Text style={[styles.resultValue, { color: userColors.accent_color }]}>
                                {result}
                            </Text>
                        </View>
                    )}

                    {post.completion.training_workout.target_value && (
                        <View style={styles.targetRow}>
                            <Text style={[styles.targetLabel, { color: themeColors.textMuted }]}>
                                Target: {post.completion.training_workout.target_value} {post.completion.training_workout.target_unit}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Caption */}
            {post.caption && (
                <Text style={[styles.caption, { color: themeColors.textPrimary }]}>
                    {post.caption}
                </Text>
            )}

            {/* Photos */}
            {hasPhotos && (
                <Pressable
                    style={styles.photoContainer}
                    onPress={() => setShowImageModal(true)}
                >
                    <Image
                        source={{ uri: post.photo_urls[currentImageIndex] }}
                        style={styles.photo}
                        resizeMode="cover"
                    />

                    {/* Photo counter */}
                    {post.photo_urls.length > 1 && (
                        <View style={[styles.photoCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <Text style={styles.photoCounterText}>
                                {currentImageIndex + 1}/{post.photo_urls.length}
                            </Text>
                        </View>
                    )}

                    {/* Photo dots */}
                    {post.photo_urls.length > 1 && (
                        <View style={styles.photoDots}>
                            {post.photo_urls.map((_, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.photoDot,
                                        {
                                            backgroundColor: index === currentImageIndex
                                                ? '#ffffff'
                                                : 'rgba(255,255,255,0.5)'
                                        }
                                    ]}
                                    onPress={() => setCurrentImageIndex(index)}
                                />
                            ))}
                        </View>
                    )}
                </Pressable>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <Pressable
                    style={styles.actionButton}
                    onPress={onLfg}
                >
                    <View style={[
                        styles.lfgButton,
                        post.has_lfg && { backgroundColor: `${userColors.accent_color}20` }
                    ]}>
                        <Text style={styles.lfgEmoji}>🔥</Text>
                        <Text style={[
                            styles.lfgText,
                            { color: post.has_lfg ? userColors.accent_color : themeColors.textSecondary }
                        ]}>
                            LFG{post.lfg_count > 0 ? ` (${post.lfg_count})` : ''}
                        </Text>
                    </View>
                </Pressable>

                <Pressable
                    style={styles.actionButton}
                    onPress={onComment}
                >
                    <View style={styles.commentButton}>
                        <Feather name="message-circle" size={18} color={themeColors.textSecondary} />
                        <Text style={[styles.commentText, { color: themeColors.textSecondary }]}>
                            {post.comment_count > 0 ? post.comment_count : 'Comment'}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {/* Image Modal */}
            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowImageModal(false)}
                >
                    <View style={styles.modalContent}>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                                setCurrentImageIndex(index);
                            }}
                        >
                            {post.photo_urls.map((url, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: url }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            ))}
                        </ScrollView>

                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setShowImageModal(false)}
                        >
                            <Feather name="x" size={24} color="#ffffff" />
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radii.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    userDetails: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    userName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    timeAgo: {
        fontSize: typography.sizes.sm,
    },
    metaDot: {
        marginHorizontal: spacing.xs,
        fontSize: typography.sizes.sm,
    },
    eventName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    feelingBadge: {
        padding: spacing.xs,
        borderRadius: radii.full,
    },
    feelingEmoji: {
        fontSize: 20,
    },
    workoutCard: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
    },
    workoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    workoutName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    resultLabel: {
        fontSize: typography.sizes.sm,
    },
    resultValue: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    targetRow: {
        marginTop: spacing.xs,
    },
    targetLabel: {
        fontSize: typography.sizes.sm,
    },
    caption: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        fontSize: typography.sizes.base,
        lineHeight: 22,
    },
    photoContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoCounter: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.sm,
    },
    photoCounterText: {
        color: '#ffffff',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    photoDots: {
        position: 'absolute',
        bottom: spacing.md,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    photoDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    lfgButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        gap: spacing.xs,
    },
    lfgEmoji: {
        fontSize: 18,
    },
    lfgText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    commentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        gap: spacing.xs,
    },
    commentText: {
        fontSize: typography.sizes.base,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
    },
    modalImage: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: spacing.md,
        padding: spacing.sm,
    },
});
