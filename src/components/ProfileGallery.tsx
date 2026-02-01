import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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
    const { themeColors, colors: userColors } = useTheme();
    const { posts, loading, hasMore, loadPosts } = useUserPosts(userId, 6); // Start with 6

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
                    <View style={[styles.emptyIcon, { backgroundColor: themeColors.bgTertiary }]}>
                        <Feather name="camera-off" size={24} color={themeColors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No posts yet</Text>
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
        padding: spacing.xl,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
    }
});
