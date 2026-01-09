import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSquadEvents, SquadEvent, TrainingWorkout, EVENT_TYPES } from '../hooks/useSquadEvents';
import { useEventWorkouts, ParticipantProgress } from '../hooks/useEventWorkouts';
import { useActivityFeed } from '../hooks/useActivityFeed';
import ScreenLayout from '../components/ScreenLayout';
import FeedPostCard from '../components/FeedPostCard';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

type TabType = 'overview' | 'training' | 'feed';

export default function EventDetailScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<EventDetailRouteProp>();
    const { user } = useAuth();
    const { themeColors, colors: userColors } = useTheme();
    const { getEventById, joinEvent, leaveEvent, getTrainingPlan } = useSquadEvents();
    const { getParticipantProgress } = useEventWorkouts();
    const { feed, loading: feedLoading, loadFeed, toggleLfg } = useActivityFeed();

    const [event, setEvent] = useState<SquadEvent | null>(null);
    const [trainingPlan, setTrainingPlan] = useState<TrainingWorkout[]>([]);
    const [participants, setParticipants] = useState<ParticipantProgress[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadEventData = useCallback(async () => {
        const eventData = await getEventById(route.params.id);
        setEvent(eventData);

        if (eventData) {
            const [plan, progress] = await Promise.all([
                getTrainingPlan(eventData.id),
                getParticipantProgress(eventData.id),
            ]);
            setTrainingPlan(plan);
            setParticipants(progress);
            loadFeed(eventData.id);
        }

        setLoading(false);
    }, [route.params.id, getEventById, getTrainingPlan, getParticipantProgress, loadFeed]);

    useEffect(() => {
        loadEventData();
    }, [loadEventData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadEventData();
        setRefreshing(false);
    };

    const handleJoin = async () => {
        if (!event) return;
        const result = await joinEvent(event.id);
        if (!result.error) {
            await loadEventData();
        }
    };

    const handleLeave = async () => {
        if (!event) return;
        Alert.alert(
            'Leave Event',
            'Are you sure you want to leave this event? Your progress will be preserved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await leaveEvent(event.id);
                        if (!result.error) {
                            navigation.goBack();
                        }
                    }
                },
            ]
        );
    };

    const handleWorkoutPress = (workout: TrainingWorkout) => {
        if (!event) return;
        navigation.navigate('CompleteEventWorkout', {
            trainingWorkoutId: workout.id,
            eventId: event.id,
        });
    };

    const handleLfg = async (postId: string) => {
        await toggleLfg(postId);
    };

    if (loading) {
        return (
            <ScreenLayout title="Event" showBack>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                </View>
            </ScreenLayout>
        );
    }

    if (!event) {
        return (
            <ScreenLayout title="Event" showBack>
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color={themeColors.textMuted} />
                    <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
                        Event not found
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    // Calculate days until event
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get event type info
    const eventType = EVENT_TYPES.find(t => t.id === event.event_type) || EVENT_TYPES[EVENT_TYPES.length - 1];

    // Calculate overall progress
    const myProgress = participants.find(p => p.user_id === user?.id);
    const completedCount = trainingPlan.filter(w => w.is_completed).length;
    const progressPercent = trainingPlan.length > 0
        ? Math.round((completedCount / trainingPlan.length) * 100)
        : 0;

    const renderOverviewTab = () => (
        <View style={styles.tabContent}>
            {/* Progress Card */}
            {event.is_participating && (
                <View style={[styles.progressCard, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]}>
                            Your Progress
                        </Text>
                        <Text style={[styles.progressPercent, { color: userColors.accent_color }]}>
                            {progressPercent}%
                        </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: themeColors.bgTertiary }]}>
                        <View
                            style={[
                                styles.progressFill,
                                { backgroundColor: userColors.accent_color, width: `${progressPercent}%` }
                            ]}
                        />
                    </View>
                    <Text style={[styles.progressStats, { color: themeColors.textSecondary }]}>
                        {completedCount} of {trainingPlan.length} workouts completed
                    </Text>
                </View>
            )}

            {/* Leaderboard */}
            <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    Leaderboard
                </Text>
                {participants.length > 0 ? (
                    participants.map((participant, index) => (
                        <View
                            key={participant.user_id}
                            style={[
                                styles.participantRow,
                                index < participants.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.divider }
                            ]}
                        >
                            <View style={styles.participantRank}>
                                <Text style={[styles.rankNumber, { color: themeColors.textMuted }]}>
                                    #{index + 1}
                                </Text>
                            </View>
                            {participant.avatar_url ? (
                                <Image
                                    source={{ uri: participant.avatar_url }}
                                    style={styles.participantAvatar}
                                />
                            ) : (
                                <View style={[styles.participantAvatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                                    <Text style={[styles.avatarInitial, { color: themeColors.textSecondary }]}>
                                        {participant.display_name?.[0]?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.participantInfo}>
                                <Text style={[styles.participantName, { color: themeColors.textPrimary }]}>
                                    {participant.display_name}
                                    {participant.user_id === user?.id && ' (You)'}
                                </Text>
                                <Text style={[styles.participantStats, { color: themeColors.textSecondary }]}>
                                    {participant.completed_workouts}/{participant.total_workouts} workouts
                                </Text>
                            </View>
                            <Text style={[styles.participantPercent, { color: userColors.accent_color }]}>
                                {participant.completion_percentage}%
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                        No participants yet
                    </Text>
                )}
            </View>
        </View>
    );

    const renderTrainingTab = () => (
        <View style={styles.tabContent}>
            {trainingPlan.length > 0 ? (
                trainingPlan.map((workout, index) => {
                    const workoutDate = new Date(workout.scheduled_date || '');
                    const isPast = workoutDate < today;
                    const isToday = workout.scheduled_date === today.toISOString().split('T')[0];

                    return (
                        <Pressable
                            key={workout.id}
                            style={[
                                styles.workoutCard,
                                { backgroundColor: themeColors.bgSecondary },
                                workout.is_completed && styles.completedWorkout,
                            ]}
                            onPress={() => handleWorkoutPress(workout)}
                        >
                            <View style={[styles.workoutColor, { backgroundColor: workout.color }]} />
                            <View style={styles.workoutContent}>
                                <View style={styles.workoutHeader}>
                                    <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>
                                        {workout.name}
                                    </Text>
                                    {workout.is_completed ? (
                                        <View style={[styles.completedBadge, { backgroundColor: '#10b98120' }]}>
                                            <Feather name="check" size={14} color="#10b981" />
                                        </View>
                                    ) : isToday ? (
                                        <View style={[styles.todayBadge, { backgroundColor: `${userColors.accent_color}20` }]}>
                                            <Text style={[styles.todayText, { color: userColors.accent_color }]}>Today</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <Text style={[styles.workoutDate, { color: themeColors.textSecondary }]}>
                                    {workoutDate.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                    {isPast && !workout.is_completed && (
                                        <Text style={{ color: '#ef4444' }}> (Overdue)</Text>
                                    )}
                                </Text>

                                {(workout.target_value || workout.target_notes) && (
                                    <View style={styles.targetRow}>
                                        <Feather name="target" size={14} color={themeColors.textMuted} />
                                        <Text style={[styles.targetText, { color: themeColors.textMuted }]}>
                                            {workout.target_value && workout.target_unit
                                                ? `${workout.target_value} ${workout.target_unit}`
                                                : workout.target_notes
                                            }
                                            {workout.target_zone && ` • ${workout.target_zone.replace('zone', 'Zone ')}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Feather name="chevron-right" size={20} color={themeColors.textMuted} />
                        </Pressable>
                    );
                })
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="clipboard" size={48} color={themeColors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>
                        No Training Plan
                    </Text>
                    <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                        This event doesn't have a training plan yet.
                    </Text>
                </View>
            )}
        </View>
    );

    const renderFeedTab = () => (
        <View style={styles.tabContent}>
            {feedLoading ? (
                <ActivityIndicator size="large" color={userColors.accent_color} style={styles.feedLoader} />
            ) : feed.length > 0 ? (
                feed.map(post => (
                    <FeedPostCard
                        key={post.id}
                        post={post}
                        onLfg={() => handleLfg(post.id)}
                        onComment={() => {/* TODO: Open comments */ }}
                    />
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="message-square" size={48} color={themeColors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>
                        No Activity Yet
                    </Text>
                    <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                        Complete a workout and share it to get things started!
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <ScreenLayout title={event.name} showBack>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={userColors.accent_color}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Event Header */}
                <View style={[styles.header, { backgroundColor: themeColors.bgSecondary }]}>
                    {event.cover_image_url ? (
                        <Image
                            source={{ uri: event.cover_image_url }}
                            style={styles.coverImage}
                        />
                    ) : (
                        <View style={[styles.coverPlaceholder, { backgroundColor: `${userColors.accent_color}30` }]}>
                            <Feather name={eventType.icon as any} size={64} color={userColors.accent_color} />
                        </View>
                    )}

                    <View style={styles.headerContent}>
                        <View style={styles.typeRow}>
                            <View style={[styles.typeBadge, { backgroundColor: `${userColors.accent_color}20` }]}>
                                <Feather name={eventType.icon as any} size={14} color={userColors.accent_color} />
                                <Text style={[styles.typeText, { color: userColors.accent_color }]}>
                                    {eventType.name}
                                </Text>
                            </View>
                            {event.is_private && (
                                <View style={[styles.privateBadge, { backgroundColor: themeColors.bgTertiary }]}>
                                    <Feather name="lock" size={12} color={themeColors.textSecondary} />
                                    <Text style={[styles.privateText, { color: themeColors.textSecondary }]}>Private</Text>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.eventName, { color: themeColors.textPrimary }]}>
                            {event.name}
                        </Text>

                        <View style={styles.eventMeta}>
                            <View style={styles.metaItem}>
                                <Feather name="calendar" size={16} color={themeColors.textSecondary} />
                                <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                                    {eventDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Feather name="clock" size={16} color={themeColors.textSecondary} />
                                <Text style={[
                                    styles.metaText,
                                    { color: daysUntil <= 7 ? '#ef4444' : themeColors.textSecondary }
                                ]}>
                                    {daysUntil <= 0 ? 'Event passed' : `${daysUntil} days left`}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Feather name="users" size={16} color={themeColors.textSecondary} />
                                <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                                    {participants.length} participants
                                </Text>
                            </View>
                        </View>

                        {/* Join/Leave Button */}
                        {event.is_participating ? (
                            <Pressable
                                style={[styles.leaveButton, { borderColor: '#ef4444' }]}
                                onPress={handleLeave}
                            >
                                <Text style={[styles.leaveButtonText, { color: '#ef4444' }]}>
                                    Leave Event
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                style={[styles.joinButton, { backgroundColor: userColors.accent_color }]}
                                onPress={handleJoin}
                            >
                                <Feather name="plus" size={20} color={themeColors.accentText} />
                                <Text style={[styles.joinButtonText, { color: themeColors.accentText }]}>
                                    Join Event
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabs, { borderBottomColor: themeColors.divider }]}>
                    {(['overview', 'training', 'feed'] as TabType[]).map(tab => (
                        <Pressable
                            key={tab}
                            style={[
                                styles.tab,
                                activeTab === tab && { borderBottomColor: userColors.accent_color }
                            ]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === tab ? userColors.accent_color : themeColors.textMuted }
                            ]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Tab Content */}
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'training' && renderTrainingTab()}
                {activeTab === 'feed' && renderFeedTab()}
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    errorText: {
        fontSize: typography.sizes.base,
    },
    header: {
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: 160,
    },
    coverPlaceholder: {
        width: '100%',
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        padding: spacing.md,
    },
    typeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        gap: 4,
    },
    typeText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    privateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        gap: 4,
    },
    privateText: {
        fontSize: typography.sizes.sm,
    },
    eventName: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.sm,
    },
    eventMeta: {
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaText: {
        fontSize: typography.sizes.sm,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.xs,
    },
    joinButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    leaveButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    leaveButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginHorizontal: spacing.md,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    tabContent: {
        padding: spacing.md,
    },
    progressCard: {
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.md,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    progressTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    progressPercent: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressStats: {
        fontSize: typography.sizes.sm,
    },
    section: {
        padding: spacing.md,
        borderRadius: radii.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.md,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    participantRank: {
        width: 30,
    },
    rankNumber: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    participantAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    participantAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    participantStats: {
        fontSize: typography.sizes.sm,
    },
    participantPercent: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    workoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radii.md,
        marginBottom: spacing.sm,
        overflow: 'hidden',
    },
    completedWorkout: {
        opacity: 0.7,
    },
    workoutColor: {
        width: 4,
        alignSelf: 'stretch',
    },
    workoutContent: {
        flex: 1,
        padding: spacing.md,
    },
    workoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    workoutName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
        flex: 1,
    },
    completedBadge: {
        padding: 4,
        borderRadius: radii.full,
    },
    todayBadge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.sm,
    },
    todayText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    workoutDate: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: 4,
    },
    targetText: {
        fontSize: typography.sizes.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.medium,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    feedLoader: {
        marginTop: spacing.xl,
    },
});
