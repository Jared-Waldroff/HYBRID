import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useActivityFeed } from '../hooks/useActivityFeed';
import ScreenLayout from '../components/ScreenLayout';
import FeedPostCard from '../components/FeedPostCard';
import { spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ActivityFeedRouteProp = RouteProp<RootStackParamList, 'ActivityFeed'>;

export default function ActivityFeedScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ActivityFeedRouteProp>();
    const { themeColors, colors: userColors } = useTheme();
    const { feed, loading, loadFeed, toggleLfg } = useActivityFeed();

    const [refreshing, setRefreshing] = React.useState(false);

    const eventId = route.params?.eventId;

    const handleLoadFeed = useCallback(() => {
        loadFeed(eventId);
    }, [eventId, loadFeed]);

    useEffect(() => {
        handleLoadFeed();
    }, [handleLoadFeed]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await handleLoadFeed();
        setRefreshing(false);
    };

    const handleLfg = async (postId: string) => {
        await toggleLfg(postId);
    };

    const handleComment = (postId: string) => {
        // TODO: Open comments modal
        console.log('Open comments for', postId);
    };

    const handleUserPress = (userId: string) => {
        navigation.navigate('AthleteProfile', { id: userId });
    };

    const handleEventPress = (eventId: string) => {
        navigation.navigate('EventDetail', { id: eventId });
    };

    return (
        <ScreenLayout hideHeader>
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                </View>
            ) : (
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
                    {feed.length > 0 ? (
                        feed.map(post => (
                            <FeedPostCard
                                key={post.id}
                                post={post}
                                onLfg={() => handleLfg(post.id)}
                                onComment={() => handleComment(post.id)}
                                onUserPress={handleUserPress}
                                onEventPress={handleEventPress}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                                <Feather name="message-square" size={48} color={userColors.accent_color} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                                No Activity Yet
                            </Text>
                            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                                When you and your squad complete event workouts, they'll show up here.
                                {'\n\n'}
                                Get training and share your progress! 💪
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.lg,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
        lineHeight: 22,
    },
});
