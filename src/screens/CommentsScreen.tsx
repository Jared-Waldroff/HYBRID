import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    DeviceEventEmitter,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, typography, radii } from '../theme';
import { RootStackParamList } from '../navigation';
import { formatRelativeTime } from '../hooks/useActivityFeed';
import BadgeRow from '../components/BadgeRow';
import SquadUserModal from '../components/SquadUserModal';

type CommentsScreenRouteProp = RouteProp<RootStackParamList, 'Comments'>;

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: {
        display_name: string;
        avatar_url: string;
        badges?: string[];
    };
}

export default function CommentsScreen() {
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const route = useRoute<CommentsScreenRouteProp>();
    const navigation = useNavigation();
    const { postId } = route.params;

    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');

    // Squad Modal State
    const [selectedUser, setSelectedUser] = useState<{ id: string; display_name: string; avatar_url: string; badges?: string[] } | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            // 1. Fetch comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('feed_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (commentsError) throw commentsError;

            // 2. Extract unique user IDs
            const userIds = [...new Set((commentsData || []).map((c: any) => c.user_id))];

            // 3. Fetch profiles for these users
            let profileMap = new Map();
            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('athlete_profiles')
                    .select('user_id, display_name, avatar_url, badges')
                    .in('user_id', userIds);

                if (!profilesError && profiles) {
                    profiles.forEach((p: any) => {
                        profileMap.set(p.user_id, p);
                    });
                }
            }

            // 4. Map profiles to comments
            const commentsWithUser = (commentsData || []).map((c: any) => ({
                ...c,
                user: profileMap.get(c.user_id) || { display_name: 'Unknown Athlete', avatar_url: null }
            }));

            setComments(commentsWithUser);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async () => {
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('feed_comments')
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    content: newComment.trim(),
                });

            if (error) throw error;

            setNewComment('');
            // Refresh comments
            fetchComments();

            // Increment comment count on post (optional, handled by triggers usually or we can just optimistic update parent?)
            // For now just refresh local list.

            // Emit event to update parent feed
            DeviceEventEmitter.emit('commentAdded', { postId });

        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUserPress = (userId?: string, userProfile?: any) => {
        if (userId && userProfile) {
            setSelectedUser({
                id: userId,
                display_name: userProfile.display_name,
                avatar_url: userProfile.avatar_url,
                badges: userProfile.badges
            });
            setModalVisible(true);
        }
    };

    const renderItem = ({ item }: { item: Comment }) => (
        <View style={[styles.commentItem, { borderBottomColor: themeColors.glassBorder }]}>
            {/* Avatar */}
            <Pressable onPress={() => handleUserPress(item.user_id, item.user)}>
                {item.user?.avatar_url ? (
                    <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                        <Text style={[styles.avatarInitial, { color: themeColors.textSecondary }]}>
                            {item.user?.display_name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                )}
            </Pressable>

            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Pressable onPress={() => handleUserPress(item.user_id, item.user)}>
                        <Text style={[styles.userName, { color: themeColors.textPrimary }]}>
                            {item.user?.display_name || 'Unknown'}
                        </Text>
                    </Pressable>
                    {item.user?.badges && (
                        <View style={{ marginLeft: 4 }}>
                            <BadgeRow badges={item.user.badges} maxDisplay={1} size="small" />
                        </View>
                    )}
                    <Text style={[styles.timestamp, { color: themeColors.textMuted }]}>
                        {formatRelativeTime(item.created_at)}
                    </Text>
                </View>
                <Text style={[styles.commentText, { color: themeColors.textSecondary }]}>
                    {item.content}
                </Text>
            </View>
        </View>
    );

    return (
        <ScreenLayout hideHeader>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Custom Header since we hide default */}
                <View style={[styles.header, { borderBottomColor: themeColors.glassBorder }]}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={themeColors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Comments</Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={userColors.accent_color} />
                    </View>
                ) : (
                    <FlatList
                        data={comments}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                                    No comments yet. Be the first!
                                </Text>
                            </View>
                        }
                    />
                )}

                <View style={[styles.inputContainer, { backgroundColor: themeColors.bgSecondary, borderTopColor: themeColors.glassBorder }]}>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: themeColors.inputBg,
                            color: themeColors.textPrimary,
                            borderColor: themeColors.inputBorder
                        }]}
                        placeholder="Add a comment..."
                        placeholderTextColor={themeColors.textMuted}
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                        maxLength={500}
                    />
                    <Pressable
                        style={[
                            styles.sendButton,
                            { opacity: !newComment.trim() || submitting ? 0.5 : 1 }
                        ]}
                        onPress={handleSubmit}
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={userColors.accent_color} />
                        ) : (
                            <Feather name="send" size={20} color={userColors.accent_color} />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <SquadUserModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                user={selectedUser}
            />
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
        borderBottomWidth: 1,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: spacing.md,
    },
    commentItem: {
        flexDirection: 'row',
        padding: spacing.md,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: spacing.sm,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    avatarInitial: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.bold,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        flexWrap: 'wrap',
    },
    userName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.bold,
        marginRight: spacing.xs,
    },
    timestamp: {
        fontSize: typography.sizes.xs,
        marginLeft: spacing.xs,
    },
    commentText: {
        fontSize: typography.sizes.base,
        lineHeight: 20,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: typography.sizes.base,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: radii.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
        borderWidth: 1,
        marginRight: spacing.sm,
    },
    sendButton: {
        padding: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
