import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    Pressable,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { useSquad } from '../hooks/useSquad';
import { useSquadEvents } from '../hooks/useSquadEvents';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';
import { formatRelativeTime } from '../hooks/useActivityFeed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType =
    | 'squad_request'
    | 'squad_accept'
    | 'comment'
    | 'lfg'
    | 'squad_post'
    | 'event_invite'
    | 'event_soon'
    | 'workout_reminder';

interface NotificationRow {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data: {
        userId?: string;
        postId?: string;
        eventId?: string;
    };
    is_read: boolean;
    acted: boolean;
    created_at: string;
}

interface EnrichedNotification extends NotificationRow {
    actor?: {
        display_name: string;
        avatar_url: string;
    };
}

type SectionCategory = 'squad' | 'events' | 'training';

interface NotificationSection {
    key: SectionCategory;
    title: string;
    icon: keyof typeof Feather.glyphMap;
    unreadCount: number;
    data: EnrichedNotification[];
}

// ─── Section Mapping ─────────────────────────────────────────────────────────

const SQUAD_TYPES: NotificationType[] = ['squad_request', 'squad_accept', 'comment', 'lfg', 'squad_post'];
const EVENT_TYPES: NotificationType[] = ['event_invite', 'event_soon'];

function categorize(type: NotificationType): SectionCategory {
    if (SQUAD_TYPES.includes(type)) return 'squad';
    if (EVENT_TYPES.includes(type)) return 'events';
    return 'training';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const { markAllRead, refreshUnreadCount } = useNotifications();
    const { addSquadMember, loadSquad } = useSquad();
    const { joinEvent } = useSquadEvents();

    const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Track locally-acted notification ids so we can show "Responded" / "Joined" immediately
    const [actedIds, setActedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            const rows = (data || []) as NotificationRow[];

            // Bulk-fetch actor profiles
            const actorIds = [
                ...new Set(rows.map((n) => n.data?.userId).filter(Boolean) as string[]),
            ];

            let profileMap = new Map<string, { display_name: string; avatar_url: string }>();
            if (actorIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('athlete_profiles')
                    .select('user_id, display_name, avatar_url')
                    .in('user_id', actorIds);

                for (const p of profiles || []) {
                    profileMap.set(p.user_id, {
                        display_name: p.display_name,
                        avatar_url: p.avatar_url,
                    });
                }
            }

            const enriched: EnrichedNotification[] = rows.map((n) => ({
                ...n,
                actor: n.data?.userId ? profileMap.get(n.data.userId) : undefined,
            }));

            setNotifications(enriched);
        } catch (err) {
            console.error('Error in fetchNotifications:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    // Initial load
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Mark all as read 1 second after screen opens
    useEffect(() => {
        if (!user?.id) return;
        const timer = setTimeout(() => {
            markAllRead();
            refreshUnreadCount();
        }, 1000);
        return () => clearTimeout(timer);
    }, [user?.id, markAllRead, refreshUnreadCount]);

    // Pull to refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Sections ─────────────────────────────────────────────────────────────

    const sections: NotificationSection[] = React.useMemo(() => {
        const buckets: Record<SectionCategory, EnrichedNotification[]> = {
            squad: [],
            events: [],
            training: [],
        };

        for (const n of notifications) {
            buckets[categorize(n.type)].push(n);
        }

        const result: NotificationSection[] = [];

        if (buckets.squad.length > 0) {
            result.push({
                key: 'squad',
                title: 'Squad',
                icon: 'users',
                unreadCount: buckets.squad.filter((n) => !n.is_read).length,
                data: buckets.squad,
            });
        }
        if (buckets.events.length > 0) {
            result.push({
                key: 'events',
                title: 'Events',
                icon: 'calendar',
                unreadCount: buckets.events.filter((n) => !n.is_read).length,
                data: buckets.events,
            });
        }
        if (buckets.training.length > 0) {
            result.push({
                key: 'training',
                title: 'Training',
                icon: 'activity',
                unreadCount: buckets.training.filter((n) => !n.is_read).length,
                data: buckets.training,
            });
        }

        return result;
    }, [notifications]);

    // ── Actions ──────────────────────────────────────────────────────────────

    const markActed = useCallback(
        async (notificationId: string) => {
            setActedIds((prev) => new Set(prev).add(notificationId));
            await supabase
                .from('notifications')
                .update({ acted: true })
                .eq('id', notificationId);
        },
        [],
    );

    const handleAcceptSquad = useCallback(
        async (notification: EnrichedNotification) => {
            if (!notification.data?.userId) return;
            setActionLoading(notification.id);
            try {
                await addSquadMember(notification.data.userId);
                await loadSquad();
                await markActed(notification.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
                console.error('Error accepting squad request:', err);
            } finally {
                setActionLoading(null);
            }
        },
        [addSquadMember, loadSquad, markActed],
    );

    const handleDeclineSquad = useCallback(
        async (notification: EnrichedNotification) => {
            setActionLoading(notification.id);
            try {
                await markActed(notification.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (err) {
                console.error('Error declining squad request:', err);
            } finally {
                setActionLoading(null);
            }
        },
        [markActed],
    );

    const handleJoinEvent = useCallback(
        async (notification: EnrichedNotification) => {
            if (!notification.data?.eventId) return;
            setActionLoading(notification.id);
            try {
                await joinEvent(notification.data.eventId);
                await markActed(notification.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
                console.error('Error joining event:', err);
            } finally {
                setActionLoading(null);
            }
        },
        [joinEvent, markActed],
    );

    const handleTap = useCallback(
        (notification: EnrichedNotification) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            switch (notification.type) {
                case 'squad_accept':
                    navigation.navigate('Main', {
                        screen: 'Squad',
                        params: { screen: 'SquadMain', params: { initialTab: 'members' } },
                    });
                    break;
                case 'comment':
                    if (notification.data?.postId) {
                        navigation.navigate('Comments', { postId: notification.data.postId });
                    }
                    break;
                case 'lfg':
                case 'squad_post':
                    navigation.navigate('Main', {
                        screen: 'Squad',
                        params: { screen: 'SquadMain', params: { initialTab: 'feed' } },
                    });
                    break;
                case 'event_soon':
                case 'workout_reminder':
                    if (notification.data?.eventId) {
                        navigation.navigate('EventDetail', { id: notification.data.eventId });
                    }
                    break;
                default:
                    break;
            }
        },
        [navigation],
    );

    const handleMarkAllRead = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await markAllRead();
        await refreshUnreadCount();
        // Update local state to reflect read status
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }, [markAllRead, refreshUnreadCount]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const isActed = useCallback(
        (notification: EnrichedNotification) => notification.acted || actedIds.has(notification.id),
        [actedIds],
    );

    const iconForType = (type: NotificationType): keyof typeof Feather.glyphMap => {
        switch (type) {
            case 'squad_request':
                return 'user-plus';
            case 'squad_accept':
                return 'user-check';
            case 'comment':
                return 'message-circle';
            case 'lfg':
                return 'zap';
            case 'squad_post':
                return 'edit-3';
            case 'event_invite':
                return 'mail';
            case 'event_soon':
                return 'clock';
            case 'workout_reminder':
                return 'target';
            default:
                return 'bell';
        }
    };

    // ── Renderers ────────────────────────────────────────────────────────────

    const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
        <View style={[styles.sectionHeader, { borderBottomColor: themeColors.divider }]}>
            <View style={styles.sectionHeaderLeft}>
                <Feather name={section.icon} size={16} color={userColors.accent_color} />
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    {section.title}
                </Text>
            </View>
            {section.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: userColors.accent_color }]}>
                    <Text style={[styles.unreadBadgeText, { color: '#0a141f' }]}>
                        {section.unreadCount}
                    </Text>
                </View>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: EnrichedNotification }) => {
        const unread = !item.is_read;
        const acted = isActed(item);
        const isLoading = actionLoading === item.id;
        const needsAction =
            (item.type === 'squad_request' || item.type === 'event_invite') && !acted;

        return (
            <Pressable
                onPress={() => {
                    if (!needsAction) handleTap(item);
                }}
                style={[
                    styles.notificationRow,
                    {
                        backgroundColor: unread
                            ? `${userColors.accent_color}10`
                            : 'transparent',
                    },
                ]}
            >
                {/* Avatar or icon fallback */}
                {item.actor?.avatar_url ? (
                    <Image
                        source={{ uri: item.actor.avatar_url }}
                        style={[styles.avatar, { borderColor: themeColors.divider }]}
                    />
                ) : (
                    <View
                        style={[
                            styles.avatarFallback,
                            { backgroundColor: themeColors.bgTertiary },
                        ]}
                    >
                        <Feather
                            name={iconForType(item.type)}
                            size={18}
                            color={themeColors.textSecondary}
                        />
                    </View>
                )}

                {/* Body */}
                <View style={styles.notificationBody}>
                    <Text
                        style={[
                            styles.notificationText,
                            {
                                color: unread
                                    ? themeColors.textPrimary
                                    : themeColors.textSecondary,
                            },
                        ]}
                        numberOfLines={3}
                    >
                        {item.body}
                    </Text>
                    <Text
                        style={[
                            styles.timestamp,
                            { color: themeColors.textTertiary },
                        ]}
                    >
                        {formatRelativeTime(item.created_at)}
                    </Text>

                    {/* Inline actions for squad_request */}
                    {item.type === 'squad_request' && !acted && (
                        <View style={styles.actionRow}>
                            <Pressable
                                onPress={() => handleAcceptSquad(item)}
                                disabled={isLoading}
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: userColors.accent_color },
                                ]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#0a141f" />
                                ) : (
                                    <Text style={[styles.actionBtnText, { color: '#0a141f' }]}>
                                        Accept
                                    </Text>
                                )}
                            </Pressable>
                            <Pressable
                                onPress={() => handleDeclineSquad(item)}
                                disabled={isLoading}
                                style={[
                                    styles.actionBtnOutlined,
                                    { borderColor: userColors.accent_color },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.actionBtnText,
                                        { color: userColors.accent_color },
                                    ]}
                                >
                                    Decline
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Inline actions for event_invite */}
                    {item.type === 'event_invite' && !acted && (
                        <View style={styles.actionRow}>
                            <Pressable
                                onPress={() => handleJoinEvent(item)}
                                disabled={isLoading}
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: userColors.accent_color },
                                ]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#0a141f" />
                                ) : (
                                    <Text style={[styles.actionBtnText, { color: '#0a141f' }]}>
                                        Join Event
                                    </Text>
                                )}
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    if (item.data?.eventId) {
                                        navigation.navigate('EventDetail', {
                                            id: item.data.eventId,
                                        });
                                    }
                                }}
                                style={[
                                    styles.actionBtnOutlined,
                                    { borderColor: userColors.accent_color },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.actionBtnText,
                                        { color: userColors.accent_color },
                                    ]}
                                >
                                    View Details
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Acted label */}
                    {(item.type === 'squad_request' || item.type === 'event_invite') && acted && (
                        <Text
                            style={[
                                styles.actedLabel,
                                { color: themeColors.textTertiary },
                            ]}
                        >
                            {item.type === 'squad_request' ? 'Responded' : 'Joined'}
                        </Text>
                    )}
                </View>

                {/* Unread dot */}
                {unread && (
                    <View
                        style={[
                            styles.unreadDot,
                            { backgroundColor: userColors.accent_color },
                        ]}
                    />
                )}
            </Pressable>
        );
    };

    // ── Loading state ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <ScreenLayout hideHeader>
                <View style={styles.headerBar}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                        Notifications
                    </Text>
                    <Pressable
                        onPress={() => navigation.navigate('NotificationSettings')}
                        hitSlop={12}
                    >
                        <Feather name="settings" size={22} color={themeColors.textSecondary} />
                    </Pressable>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                </View>
            </ScreenLayout>
        );
    }

    // ── Empty state ──────────────────────────────────────────────────────────

    if (notifications.length === 0) {
        return (
            <ScreenLayout hideHeader>
                <View style={styles.headerBar}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                        Notifications
                    </Text>
                    <Pressable
                        onPress={() => navigation.navigate('NotificationSettings')}
                        hitSlop={12}
                    >
                        <Feather name="settings" size={22} color={themeColors.textSecondary} />
                    </Pressable>
                </View>
                <View style={styles.emptyContainer}>
                    <Feather name="bell-off" size={48} color={themeColors.textTertiary} />
                    <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>
                        No notifications yet
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    // ── Main ─────────────────────────────────────────────────────────────────

    const hasUnread = notifications.some((n) => !n.is_read);

    return (
        <ScreenLayout hideHeader>
            <View style={styles.headerBar}>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                    Notifications
                </Text>
                <Pressable
                    onPress={() => navigation.navigate('NotificationSettings')}
                    hitSlop={12}
                >
                    <Feather name="settings" size={22} color={themeColors.textSecondary} />
                </Pressable>
            </View>

            {hasUnread && (
                <Pressable onPress={handleMarkAllRead} style={styles.markAllRow}>
                    <Text style={[styles.markAllText, { color: userColors.accent_color }]}>
                        Mark all as read
                    </Text>
                </Pressable>
            )}

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={userColors.accent_color}
                    />
                }
                ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: themeColors.divider }]} />
                )}
            />
        </ScreenLayout>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
    },
    markAllRow: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    markAllText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.xxl,
    },
    emptyText: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: spacing.xxl,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xs,
    },
    unreadBadgeText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold,
    },

    // Notification row
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        borderWidth: 1,
        marginRight: spacing.md,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    notificationBody: {
        flex: 1,
    },
    notificationText: {
        fontSize: typography.sizes.sm,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: radii.full,
        marginLeft: spacing.sm,
        marginTop: spacing.xs + 2,
    },

    // Inline actions
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnOutlined: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    actedLabel: {
        fontSize: typography.sizes.sm,
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },

    // Separator
    separator: {
        height: 1,
        marginLeft: spacing.md + 40 + spacing.md, // aligned past avatar
    },
});
