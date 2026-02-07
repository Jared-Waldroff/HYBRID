import React, { useState, useEffect, memo } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Modal,
    ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';
import { FeedPost, formatRelativeTime, formatDuration } from '../hooks/useActivityFeed';

import { FEELING_OPTIONS } from '../hooks/useEventWorkouts';
import WorkoutCard from './WorkoutCard';
import BadgeRow from './BadgeRow';

// expo-image provides built-in disk/memory caching
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedPostCardProps {
    post: FeedPost;
    onLfg: () => void;
    onComment: () => void;
    onUserPress?: (userId: string, user: any) => void;
    onEventPress?: (eventId: string) => void;
    isOwner?: boolean;
    onOptions?: () => void;
}

function FeedPostCard({
    post,
    onLfg,
    onComment,
    onUserPress,
    onEventPress,
    isOwner,
    onOptions,
}: FeedPostCardProps) {
    const { themeColors, colors: userColors } = useTheme();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
    const [showTrainingWorkoutDetails, setShowTrainingWorkoutDetails] = useState(false);
    const [imageAspectRatio, setImageAspectRatio] = useState(1.33); // Default 4:3, updates on load

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

    // Calculate schedule mismatch for event workouts
    const getScheduleMismatch = () => {
        if (!post.completion?.completed_at || !post.completion?.training_workout?.days_before_event || !post.event?.event_date) {
            return null;
        }

        // Calculate scheduled date from event date minus days_before_event
        const eventDate = new Date(post.event.event_date);
        const scheduledDate = new Date(eventDate);
        scheduledDate.setDate(scheduledDate.getDate() - post.completion.training_workout.days_before_event);

        // Get completion date (just the date part)
        const completedDate = new Date(post.completion.completed_at);

        // Reset times to compare just dates
        scheduledDate.setHours(0, 0, 0, 0);
        completedDate.setHours(0, 0, 0, 0);

        // Calculate difference in days
        const diffTime = completedDate.getTime() - scheduledDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return null; // On time

        if (diffDays < 0) {
            return { type: 'early', days: Math.abs(diffDays), color: '#10b981' }; // Green - completed early
        } else {
            return { type: 'late', days: diffDays, color: '#f97316' }; // Orange - completed late
        }
    };

    const result = formatResult();
    const scheduleMismatch = getScheduleMismatch();
    const hasPhotos = post.photo_urls && post.photo_urls.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgSecondary }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={styles.userInfo}
                    onPress={() => onUserPress?.(post.user_id, post.user)}
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
                        <View style={styles.userNameRow}>
                            <Text style={[styles.userName, { color: themeColors.textPrimary }]}>
                                {post.user?.display_name || 'Unknown'}
                            </Text>
                            {post.user?.badges && post.user.badges.length > 0 && (
                                <BadgeRow badges={post.user.badges} maxDisplay={3} size="small" userName={post.user.display_name} />
                            )}
                        </View>
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

                {isOwner && (
                    <Pressable
                        style={styles.optionsButton}
                        onPress={onOptions}
                        hitSlop={10}
                    >
                        <Feather name="more-horizontal" size={20} color={themeColors.textSecondary} />
                    </Pressable>
                )}
            </View>

            {/* Photos (Top) */}
            {hasPhotos && (
                <Pressable
                    style={[styles.photoContainer, { aspectRatio: imageAspectRatio }]}
                    onPress={() => setShowImageModal(true)}
                >
                    <Image
                        source={{ uri: post.photo_urls[currentImageIndex] }}
                        style={styles.photo}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        placeholder={blurhash}
                        transition={200}
                        onLoad={(e) => {
                            const { width, height } = e.source;
                            if (width && height) {
                                setImageAspectRatio(width / height);
                            }
                        }}
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

            {/* Caption (Middle) - Added padding */}
            {post.caption && (
                <Text style={[styles.caption, { color: themeColors.textPrimary, paddingTop: spacing.sm }]}>
                    {post.caption}
                </Text>
            )}

            {/* Event Training Workout Info (Bottom) - Now Clickable */}
            {post.completion?.training_workout && (
                <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                    <Pressable
                        style={[
                            styles.workoutCard,
                            {
                                backgroundColor: themeColors.glassBg,
                                borderColor: themeColors.glassBorder,
                                borderWidth: 1,
                                padding: 0,
                                overflow: 'hidden'
                            }
                        ]}
                        onPress={() => setShowTrainingWorkoutDetails(true)}
                    >
                        {/* Color Bar */}
                        <View style={[
                            styles.colorBar,
                            { backgroundColor: post.completion.training_workout.color || userColors.accent_color }
                        ]} />

                        <View style={styles.workoutContent}>
                            <View style={styles.workoutHeader}>
                                <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>
                                    {post.completion.training_workout.name}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {post.completion.training_workout.target_zone && (
                                        <View style={[styles.zoneBadge, { backgroundColor: '#ef4444' + '20' }]}>
                                            <Text style={[styles.zoneText, { color: '#ef4444' }]}>
                                                {post.completion.training_workout.target_zone.replace('zone', 'Zone ')}
                                            </Text>
                                        </View>
                                    )}
                                    <Feather name="chevron-right" size={20} color={themeColors.textSecondary} />
                                </View>
                            </View>

                            {post.completion.training_workout.description && (
                                <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={2}>
                                    {post.completion.training_workout.description}
                                </Text>
                            )}

                            <View style={styles.statsRow}>
                                {result && (
                                    <View style={styles.statItem}>
                                        <Feather name="check-circle" size={14} color={userColors.accent_color} />
                                        <Text style={[styles.statValue, { color: userColors.accent_color }]}>
                                            {result}
                                        </Text>
                                    </View>
                                )}
                                {scheduleMismatch && (
                                    <View style={[styles.statItem, { marginLeft: result ? spacing.sm : 0 }]}>
                                        <Feather
                                            name={scheduleMismatch.type === 'early' ? 'clock' : 'alert-circle'}
                                            size={12}
                                            color={scheduleMismatch.color}
                                        />
                                        <Text style={[styles.statValue, { color: scheduleMismatch.color, fontSize: typography.sizes.xs }]}>
                                            {scheduleMismatch.days} day{scheduleMismatch.days !== 1 ? 's' : ''} {scheduleMismatch.type}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

            {/* Regular Workout Linked Card (Simplified with Exercise List) */}
            {post.workout && (
                <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                    <Pressable
                        style={[
                            styles.workoutAttachment,
                            {
                                backgroundColor: themeColors.glassBg,
                                borderColor: themeColors.glassBorder,
                                borderLeftColor: post.workout.color || userColors.accent_color
                            }
                        ]}
                        onPress={() => {
                            console.log('[FeedPostCard] Opening workout details, exercises:', post.workout?.workout_exercises?.length);
                            if (post.workout?.workout_exercises?.length) {
                                console.log('[FeedPostCard] First exercise sets:', JSON.stringify(post.workout.workout_exercises[0]));
                            }
                            setShowWorkoutDetails(true);
                        }}
                    >
                        <View style={styles.attachmentContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                                <Text style={[styles.attachmentTitle, { color: themeColors.textPrimary }]}>
                                    {post.workout.name}
                                </Text>
                                <Feather name="chevron-right" size={20} color={themeColors.textSecondary} />
                            </View>

                            {/* Exercise Summary List */}
                            {post.workout.workout_exercises && post.workout.workout_exercises.length > 0 ? (
                                <View style={{ gap: 4 }}>
                                    {post.workout.workout_exercises.slice(0, 3).map((we: any, idx: number) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: post.workout?.color || userColors.accent_color }} />
                                            <Text style={{ fontSize: typography.sizes.sm, color: themeColors.textSecondary }} numberOfLines={1}>
                                                {we.exercise?.name}
                                            </Text>
                                        </View>
                                    ))}
                                    {post.workout.workout_exercises.length > 3 && (
                                        <Text style={{ fontSize: typography.sizes.xs, color: themeColors.textMuted, marginTop: 2 }}>
                                            +{post.workout.workout_exercises.length - 3} more
                                        </Text>
                                    )}
                                </View>
                            ) : (
                                <Text style={[styles.attachmentSubtitle, { color: themeColors.textSecondary }]}>
                                    View Workout Details
                                </Text>
                            )}
                        </View>
                    </Pressable>
                </View>
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
                            {post.comment_count > 0
                                ? `${post.comment_count} ${post.comment_count === 1 ? 'Comment' : 'Comments'}`
                                : 'Comment'}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {/* Inline Comments Preview */}
            {post.preview_comments && post.preview_comments.length > 0 && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                    {post.preview_comments.map((comment) => (
                        <View key={comment.id} style={{ flexDirection: 'row', marginTop: 8 }}>
                            {/* Avatar */}
                            <Pressable onPress={() => onUserPress?.(comment.user_id, comment.user)}>
                                {comment.user?.avatar_url ? (
                                    <Image
                                        source={{ uri: comment.user.avatar_url }}
                                        style={{ width: 24, height: 24, borderRadius: 12, marginRight: spacing.sm }}
                                    />
                                ) : (
                                    <View style={{
                                        width: 24, height: 24, borderRadius: 12, marginRight: spacing.sm,
                                        backgroundColor: themeColors.bgTertiary, alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: themeColors.textSecondary }}>
                                            {comment.user?.display_name?.[0]?.toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <Pressable onPress={() => onUserPress?.(comment.user_id, comment.user)}>
                                        <Text style={{ fontSize: typography.sizes.sm, fontWeight: 'bold', color: themeColors.textPrimary, marginRight: 4 }}>
                                            {comment.user?.display_name || 'User'}
                                        </Text>
                                    </Pressable>
                                    {/* Badges inline? BadgeRow is usually multiple. */}
                                    {/* We can render BadgeRow with size small */}
                                    <View style={{ transform: [{ scale: 0.8 }] }}>
                                        {/* Assuming BadgeRow can take custom style or we wrap it. */}
                                        {/* Since BadgeRow fetches badges if passed strings, we need to ensure useActivityFeed passes badges? */}
                                        {/* useActivityFeed preview_comments query fetches user:athlete_profiles(badges). Yes. */}
                                        {comment.user?.badges && <BadgeRow badges={comment.user.badges} maxDisplay={1} size="small" />}
                                    </View>
                                </View>
                                <Text style={{ fontSize: typography.sizes.sm, color: themeColors.textSecondary }}>
                                    {comment.content}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {post.comment_count > post.preview_comments.length && (
                        <Pressable onPress={onComment} style={{ marginTop: 8, marginLeft: 32 }}>
                            <Text style={{ fontSize: typography.sizes.sm, color: themeColors.textMuted }}>
                                View all {post.comment_count} comments
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* Image Modal */}
            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
            >
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.95)' }]}
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

            {/* Workout Details Modal */}
            <Modal
                visible={showWorkoutDetails}
                animationType="fade" // Changed to fade for standard overlay feel
                transparent
                onRequestClose={() => setShowWorkoutDetails(false)}
            >
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }]}
                    onPress={() => setShowWorkoutDetails(false)}
                >
                    <Pressable
                        style={[
                            styles.detailsModalContent,
                            {
                                backgroundColor: themeColors.bgSecondary,
                                margin: spacing.lg,
                                borderRadius: radii.xl,
                                maxHeight: '80%',
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.detailsModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.detailsColorDot, { backgroundColor: post.workout?.color || userColors.accent_color }]} />
                                <Text style={[styles.detailsModalTitle, { color: themeColors.textPrimary }]}>
                                    {post.workout?.name}
                                </Text>
                            </View>
                            <Pressable onPress={() => setShowWorkoutDetails(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={false}>
                            {post.workout?.workout_exercises?.map((we: any, index: number) => (
                                <View key={index} style={[styles.detailsExerciseItem, { borderColor: themeColors.glassBorder }]}>
                                    <Text style={[styles.detailsExerciseName, { color: themeColors.textPrimary }]}>
                                        {we.exercise?.name}
                                    </Text>

                                    {/* Sets Display */}
                                    {we.sets && we.sets.length > 0 ? (
                                        <View style={styles.detailsSetsContainer}>
                                            <View style={styles.detailsSetHeader}>
                                                <Text style={[styles.detailsSetHeaderText, { color: themeColors.textSecondary, width: 40 }]}>Set</Text>
                                                <Text style={[styles.detailsSetHeaderText, { color: themeColors.textSecondary, flex: 1, textAlign: 'center' }]}>lbs</Text>
                                                <Text style={[styles.detailsSetHeaderText, { color: themeColors.textSecondary, flex: 1, textAlign: 'center' }]}>Reps</Text>
                                            </View>
                                            {we.sets.map((set: any, setIndex: number) => (
                                                <View key={set.id || setIndex} style={styles.detailsSetRow}>
                                                    <Text style={[styles.detailsSetText, { color: themeColors.textSecondary, width: 40 }]}>
                                                        {setIndex + 1}
                                                    </Text>
                                                    <Text style={[styles.detailsSetText, { color: themeColors.textPrimary, flex: 1, textAlign: 'center' }]}>
                                                        {String(set.weight || 0)}
                                                    </Text>
                                                    <Text style={[styles.detailsSetText, { color: themeColors.textPrimary, flex: 1, textAlign: 'center' }]}>
                                                        {String(set.reps || 0)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.sm, marginTop: 4 }}>
                                            No sets recorded
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal >

            {/* Training Workout Details Modal (for Event Workouts) */}
            <Modal
                visible={showTrainingWorkoutDetails}
                animationType="fade"
                transparent
                onRequestClose={() => setShowTrainingWorkoutDetails(false)}
            >
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }]}
                    onPress={() => setShowTrainingWorkoutDetails(false)}
                >
                    <Pressable
                        style={[
                            styles.detailsModalContent,
                            {
                                backgroundColor: themeColors.bgSecondary,
                                margin: spacing.lg,
                                borderRadius: radii.xl,
                                maxHeight: '80%',
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.detailsModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.detailsColorDot, { backgroundColor: post.completion?.training_workout?.color || userColors.accent_color }]} />
                                <Text style={[styles.detailsModalTitle, { color: themeColors.textPrimary }]}>
                                    {post.completion?.training_workout?.name}
                                </Text>
                            </View>
                            <Pressable onPress={() => setShowTrainingWorkoutDetails(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={false}>
                            {/* Description */}
                            {post.completion?.training_workout?.description && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.xs, marginBottom: 4 }}>
                                        Description
                                    </Text>
                                    <Text style={{ color: themeColors.textPrimary, fontSize: typography.sizes.base }}>
                                        {post.completion.training_workout.description}
                                    </Text>
                                </View>
                            )}

                            {/* Target */}
                            {post.completion?.training_workout?.target_value && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.xs, marginBottom: 4 }}>
                                        Target
                                    </Text>
                                    <Text style={{ color: themeColors.textPrimary, fontSize: typography.sizes.base }}>
                                        {post.completion.training_workout.target_value} {post.completion.training_workout.target_unit || ''}
                                    </Text>
                                </View>
                            )}

                            {/* Zone */}
                            {post.completion?.training_workout?.target_zone && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.xs, marginBottom: 4 }}>
                                        Target Zone
                                    </Text>
                                    <View style={[styles.zoneBadge, { backgroundColor: '#ef4444' + '20', alignSelf: 'flex-start' }]}>
                                        <Text style={[styles.zoneText, { color: '#ef4444' }]}>
                                            {post.completion.training_workout.target_zone.replace('zone', 'Zone ')}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Result */}
                            {result && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.xs, marginBottom: 4 }}>
                                        Completed Result
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Feather name="check-circle" size={18} color={userColors.accent_color} />
                                        <Text style={{ color: userColors.accent_color, fontSize: typography.sizes.lg, fontWeight: '600' }}>
                                            {result}
                                        </Text>
                                    </View>
                                </View>
                            )}



                            {/* Feeling */}
                            {feeling && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={{ color: themeColors.textMuted, fontSize: typography.sizes.xs, marginBottom: 4 }}>
                                        How it felt
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 24 }}>{feeling.emoji}</Text>
                                        <Text style={{ color: themeColors.textPrimary, fontSize: typography.sizes.base }}>
                                            {feeling.label}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View >
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
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
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
    optionsButton: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    workoutCard: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radii.md,
    },
    colorBar: {
        height: 4,
        width: '100%',
    },
    workoutContent: {
        padding: spacing.md,
    },
    workoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    workoutName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
        flex: 1,
    },
    zoneBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radii.sm,
    },
    zoneText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    description: {
        fontSize: typography.sizes.sm,
        marginBottom: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statValue: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
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
        backgroundColor: '#f0f0f0', // Visible background to debug layout size
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
        // backgroundColor removed here to allow overrides
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
    // New styles for simplified workout attachment
    workoutAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderLeftWidth: 4,
    },
    attachmentContent: {
        flex: 1,
    },
    attachmentTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
        marginBottom: 2,
    },
    attachmentSubtitle: {
        fontSize: typography.sizes.sm,
    },
    // Workout Details Modal
    detailsModalContent: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderBottomLeftRadius: radii.xl,
        borderBottomRightRadius: radii.xl,
        maxHeight: '80%',
        padding: spacing.lg,
        paddingBottom: 40,
    },
    detailsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    detailsModalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    detailsColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    detailsScrollView: {
        flexGrow: 1,
        flexShrink: 1,
    },
    detailsExerciseItem: {
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderRadius: radii.lg,
    },
    detailsExerciseName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
    },
    detailsSetsContainer: {
        gap: 4,
    },
    detailsSetHeader: {
        flexDirection: 'row',
        paddingVertical: 4,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    detailsSetHeaderText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
        textTransform: 'uppercase',
    },
    detailsSetRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    detailsSetText: {
        fontSize: typography.sizes.sm,
    },
});

export default memo(FeedPostCard);
