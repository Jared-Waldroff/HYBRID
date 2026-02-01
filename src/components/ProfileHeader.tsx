import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';

interface ProfileHeaderProps {
    user: {
        display_name?: string;
        username?: string;
        avatar_url?: string;
        bio?: string;
    } | null;
    stats?: {
        posts: number;
        followers: number;
        following: number;
    };
    isOwnProfile: boolean;
    onEditProfile?: () => void;
    onFollow?: () => void;
    loading?: boolean;
    isSquadMember?: boolean;
}

export default function ProfileHeader({
    user,
    stats = { posts: 0, followers: 0, following: 0 },
    isOwnProfile,
    onEditProfile,
    onFollow,
    loading,
    isSquadMember
}: ProfileHeaderProps) {
    const { themeColors, colors: userColors } = useTheme();
    const [showFullPhoto, setShowFullPhoto] = React.useState(false);

    if (loading) {
        return (
            <View style={[styles.container, { padding: spacing.xl, justifyContent: 'center' }]}>
                <ActivityIndicator color={userColors.accent_color} />
            </View>
        );
    }

    if (!user) return null;

    return (
        <View style={styles.container}>
            {/* Top Row: Avatar + Name/Stats */}
            <View style={styles.topRow}>
                {/* Avatar */}
                <Pressable style={styles.avatarContainer} onPress={() => setShowFullPhoto(true)}>
                    <View style={[styles.avatarRing, { borderColor: isOwnProfile ? themeColors.glassBorder : userColors.accent_color }]}>
                        {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                                <Text style={[styles.avatarInitial, { color: themeColors.textSecondary }]}>
                                    {user.display_name?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>

                {/* Right Column: Name + Stats */}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.headerName, { color: themeColors.textPrimary, marginTop: 4 }]} numberOfLines={1}>
                        {user.display_name}
                    </Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.posts}</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.followers}</Text>
                            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Squad</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Bio Section */}
            <View style={styles.bioContainer}>
                {user.bio && (
                    <Text style={[styles.bio, { color: themeColors.textSecondary }]}>
                        {user.bio}
                    </Text>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                {isOwnProfile ? (
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.glassBorder }]}
                        onPress={onEditProfile}
                    >
                        <Text style={[styles.actionBtnText, { color: themeColors.textPrimary }]}>Edit profile</Text>
                    </Pressable>
                ) : (
                    <>
                        {!isSquadMember && (
                            <Pressable
                                style={[styles.actionBtn, { backgroundColor: userColors.accent_color }]}
                                onPress={onFollow}
                            >
                                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Add to Squad</Text>
                            </Pressable>
                        )}
                    </>
                )}
            </View>

            {/* Full Photo Modal */}
            <Modal visible={showFullPhoto} transparent animationType="fade" onRequestClose={() => setShowFullPhoto(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowFullPhoto(false)}>
                    <View style={styles.fullPhotoContainer}>
                        {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.fullPhoto} resizeMode="contain" />
                        ) : (
                            <View style={[styles.fullPhotoPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                                <Text style={[styles.fullPhotoInitial, { color: themeColors.textSecondary }]}>
                                    {user.display_name?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatarRing: {
        padding: 4,
        borderRadius: 50,
        borderWidth: 2,
        marginBottom: 4,
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 32,
        fontWeight: 'bold',
    },

    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: spacing.xl,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    statLabel: {
        fontSize: typography.sizes.xs,
    },
    bioContainer: {
        marginBottom: spacing.md,
    },
    username: {
        fontWeight: 'bold',
        marginBottom: 2,
    },
    bio: {
        fontSize: typography.sizes.sm,
        lineHeight: 20,
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    actionBtnText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    headerName: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.md,
        marginLeft: spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullPhotoContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullPhoto: {
        width: '100%',
        height: '80%',
    },
    fullPhotoPlaceholder: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullPhotoInitial: {
        fontSize: 80,
        fontWeight: 'bold',
    }
});
