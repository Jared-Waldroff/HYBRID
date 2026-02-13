import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useUserPosts } from '../hooks/useUserPosts';
import { spacing, colors } from '../theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface ProfileGalleryProps {
    userId?: string;
    onPostPress?: (post: any) => void;
}

export default function ProfileGallery({ userId, onPostPress }: ProfileGalleryProps) {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { themeColors, colors: userColors } = useTheme();

    const { posts, loading, hasMore, loadPosts, error } = useUserPosts(userId, 6); // Start with 6

    // Initial load
    React.useEffect(() => {
        loadPosts(true);
    }, [loadPosts]);

    const handleLoadMore = () => {
        loadPosts();
    };

    const renderItem = ({ item }: { item: any }) => {
        const hasPhoto = item.photo_urls && item.photo_urls.length > 0;

        return (
            <Pressable
                style={[styles.item, { borderColor: themeColors.bgPrimary }]}
                onPress={() => onPostPress?.(item)}
            >
                {hasPhoto ? (
                    <Image source={{ uri: item.photo_urls[0] }} style={styles.image} />
                ) : (
                    <View style={[styles.placeholder, { backgroundColor: themeColors.bgTertiary }]}>
                        <Feather name="activity" size={24} color={themeColors.textSecondary} />
                        <Text style={[styles.placeholderText, { color: themeColors.textSecondary }]}>
                            {item.workout?.name || 'Workout'}
                        </Text>
                    </View>
                )}
                {/* Multiple photos indicator */}
                {item.photo_urls && item.photo_urls.length > 1 && (
                    <View style={styles.multiIcon}>
                        <Feather name="layers" size={12} color="#fff" />
                    </View>
                )}
            </Pressable>
        );
    };

    if (loading && posts.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                {/* Skeleton loader? Just empty for now */}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Grid */}
            <View style={styles.grid}>
                {posts.map((post) => (
                    <View key={post.id} style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
                        {renderItem({ item: post })}
                    </View>
                ))}
            </View>

            {/* Load More Button */}
            {hasMore && (
                <Pressable
                    style={[styles.loadMoreBtn, { borderTopColor: themeColors.glassBorder }]}
                    onPress={handleLoadMore}
                >
                    <Text style={[styles.loadMoreText, { color: themeColors.textSecondary }]}>
                        {loading ? 'Loading...' : 'Load more posts'}
                    </Text>
                    {!loading && <Feather name="chevron-down" size={16} color={themeColors.textSecondary} />}
                </Pressable>
            )}

            {posts.length === 0 && !loading && (
                <View style={[styles.emptyContainer, { borderColor: themeColors.glassBorder }]}>
                    <View style={[styles.emptyIcon, { backgroundColor: userColors.accent_color + '20' }]}>
                        <Feather name="image" size={48} color={userColors.accent_color} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Posts Yet</Text>
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                        Share your workouts and achievements with your squad.
                    </Text>

                    {/* Show Create Post button if it's my profile */}
                    {user?.id === userId && (
                        <Pressable
                            style={[styles.createButton, { backgroundColor: userColors.accent_color }]}
                            onPress={() => navigation.navigate('CreatePost')}
                        >
                            <Feather name="plus" size={20} color={themeColors.accentText} />
                            <Text style={[styles.createButtonText, { color: themeColors.accentText }]}>
                                Create Post
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    item: {
        flex: 1,
        height: '100%',
        borderWidth: 1, // Separator
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    placeholderText: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
    },
    multiIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 2,
        borderRadius: 4,
    },
    loadMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderTopWidth: 1,
    },
    loadMoreText: {
        fontSize: 12,
        marginRight: 4,
    },
    loadingContainer: {
        height: ITEM_SIZE,
        width: '100%',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: spacing.md, // Reduced from xl
        marginTop: spacing.sm, // Reduced from md
    },
    emptyIcon: {
        width: 48, // Reduced from 80
        height: 48, // Reduced from 80
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm, // Reduced from md
    },
    emptyTitle: {
        fontSize: 14, // Reduced from 18
        fontWeight: '600',
        marginBottom: 2, // Reduced
    },
    emptyText: {
        fontSize: 12, // Reduced from 14
        textAlign: 'center',
        maxWidth: 200, // Reduced width
        marginBottom: spacing.md, // Reduced from lg
        color: '#6b7280', // Gray 500 equivalent
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8, // Reduced
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        gap: spacing.xs,
    },
    createButtonText: {
        fontSize: 12, // Reduced from 14
        fontWeight: '600',
    }
});
