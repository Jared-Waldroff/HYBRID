import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAthleteProfile } from '../hooks/useAthleteProfile';
import { useNotifications } from '../context/NotificationContext';
import { spacing, typography, MIN_TOUCH_TARGET } from '../theme';

interface AppHeaderProps {
    /**
     * @deprecated showBack is now ignored as the header always shows the bell.
     */
    showBack?: boolean;
    title?: string;
    showProfile?: boolean;
}

export default function AppHeader({ title, showProfile = true }: AppHeaderProps) {
    const navigation = useNavigation<any>();
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const { profile } = useAthleteProfile();
    const { unreadCount } = useNotifications();

    // Get user initials for fallback avatar
    const getInitials = () => {
        if (profile?.display_name) {
            const names = profile.display_name.split(' ');
            return names.map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return '?';
    };

    const handleBell = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Main', { screen: 'NotificationsTab' });
    };

    const handleSettings = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Main', { screen: 'SettingsTab' });
    };

    return (
        <View style={[styles.header, { backgroundColor: themeColors.glassBg, borderBottomColor: themeColors.glassBorder }]}>
            {/* Left - Always Bell */}
            <Pressable style={styles.iconButton} onPress={handleBell}>
                <View>
                    <Feather
                        name="bell"
                        size={22}
                        color={themeColors.textPrimary}
                    />
                    {unreadCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: userColors.accent_color }]}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>

            {/* Center - Logo/Title */}
            <View style={styles.center}>
                {title ? (
                    <Text style={[styles.title, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {title}
                    </Text>
                ) : (
                    <View style={styles.logoContainer}>
                        <Text style={[styles.logoText, { color: themeColors.textPrimary }]}>HYBRID</Text>
                    </View>
                )}
            </View>

            {/* Right - Profile Avatar (goes to Settings) */}
            <View style={styles.iconButton}>
                {showProfile && (
                    <Pressable onPress={handleSettings}>
                        <View style={[styles.avatarContainer, { borderColor: userColors.accent_color }]}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: userColors.accent_color }]}>
                                    <Text style={styles.avatarInitials}>{getInitials()}</Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
    },
    iconButton: {
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 2,
    },
    logoDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
        maxWidth: 200,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
});
