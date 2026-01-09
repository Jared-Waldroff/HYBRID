import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { cancelAllNotifications, getScheduledNotificationCount } from '../services/notificationService';

export default function NotificationSettingsScreen() {
    const { themeColors, colors: userColors } = useTheme();
    const {
        preferences,
        updatePreferences,
        isRegistered,
        registerForNotifications,
        scheduledCount,
        refreshScheduledCount,
    } = useNotifications();

    const [loading, setLoading] = useState(false);
    const [registeringPush, setRegisteringPush] = useState(false);

    useEffect(() => {
        refreshScheduledCount();
    }, [refreshScheduledCount]);

    const handleEnablePush = async () => {
        setRegisteringPush(true);
        const success = await registerForNotifications();
        setRegisteringPush(false);

        if (!success) {
            Alert.alert(
                'Notifications Disabled',
                'Please enable notifications in your device settings to receive workout reminders and squad activity updates.'
            );
        }
    };

    const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
        setLoading(true);
        await updatePreferences({ [key]: value });
        setLoading(false);
    };

    const handleClearAll = async () => {
        Alert.alert(
            'Clear All Reminders',
            'This will cancel all scheduled workout reminders. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelAllNotifications();
                        await refreshScheduledCount();
                        Alert.alert('Done', 'All scheduled reminders have been cleared.');
                    }
                }
            ]
        );
    };

    return (
        <ScreenLayout title="Notifications" showBack>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Push Notification Status */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="bell" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                            Push Notifications
                        </Text>
                    </View>

                    {isRegistered ? (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                                <Feather name="check-circle" size={16} color="#10b981" />
                                <Text style={[styles.statusText, { color: '#10b981' }]}>
                                    Enabled
                                </Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                You'll receive notifications on this device
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#f5970620' }]}>
                                <Feather name="alert-circle" size={16} color="#f59706" />
                                <Text style={[styles.statusText, { color: '#f59706' }]}>
                                    Not Enabled
                                </Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                Enable to receive workout reminders
                            </Text>
                            <Pressable
                                style={[styles.enableButton, { backgroundColor: userColors.accent_color }]}
                                onPress={handleEnablePush}
                                disabled={registeringPush}
                            >
                                {registeringPush ? (
                                    <ActivityIndicator size="small" color={themeColors.accentText} />
                                ) : (
                                    <Text style={[styles.enableButtonText, { color: themeColors.accentText }]}>
                                        Enable Notifications
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Notification Types */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="sliders" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                            Notification Types
                        </Text>
                    </View>

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Feather name="activity" size={18} color={themeColors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
                                    Workout Reminders
                                </Text>
                                <Text style={[styles.toggleDesc, { color: themeColors.textMuted }]}>
                                    Get reminded about upcoming training workouts
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.workoutReminders}
                            onValueChange={(v) => handleToggle('workoutReminders', v)}
                            trackColor={{ false: themeColors.bgTertiary, true: `${userColors.accent_color}50` }}
                            thumbColor={preferences.workoutReminders ? userColors.accent_color : themeColors.textMuted}
                            disabled={loading}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Feather name="calendar" size={18} color={themeColors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
                                    Check-In Reminders
                                </Text>
                                <Text style={[styles.toggleDesc, { color: themeColors.textMuted }]}>
                                    Periodic reminders to log your training progress
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.checkInReminders}
                            onValueChange={(v) => handleToggle('checkInReminders', v)}
                            trackColor={{ false: themeColors.bgTertiary, true: `${userColors.accent_color}50` }}
                            thumbColor={preferences.checkInReminders ? userColors.accent_color : themeColors.textMuted}
                            disabled={loading}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

                    <View style={styles.toggleItem}>
                        <View style={styles.toggleInfo}>
                            <Feather name="users" size={18} color={themeColors.textSecondary} />
                            <View style={styles.toggleText}>
                                <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
                                    Squad Activity
                                </Text>
                                <Text style={[styles.toggleDesc, { color: themeColors.textMuted }]}>
                                    LFG reactions and comments on your posts
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={preferences.squadActivity}
                            onValueChange={(v) => handleToggle('squadActivity', v)}
                            trackColor={{ false: themeColors.bgTertiary, true: `${userColors.accent_color}50` }}
                            thumbColor={preferences.squadActivity ? userColors.accent_color : themeColors.textMuted}
                            disabled={loading}
                        />
                    </View>
                </View>

                {/* Scheduled Reminders */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.sectionHeader}>
                        <Feather name="clock" size={20} color={userColors.accent_color} />
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                            Scheduled Reminders
                        </Text>
                    </View>

                    <View style={styles.scheduledInfo}>
                        <View style={[styles.countBadge, { backgroundColor: `${userColors.accent_color}20` }]}>
                            <Text style={[styles.countNumber, { color: userColors.accent_color }]}>
                                {scheduledCount}
                            </Text>
                        </View>
                        <Text style={[styles.scheduledText, { color: themeColors.textSecondary }]}>
                            {scheduledCount === 1 ? 'reminder scheduled' : 'reminders scheduled'}
                        </Text>
                    </View>

                    {scheduledCount > 0 && (
                        <Pressable
                            style={[styles.clearButton, { borderColor: '#ef4444' }]}
                            onPress={handleClearAll}
                        >
                            <Feather name="trash-2" size={16} color="#ef4444" />
                            <Text style={[styles.clearButtonText, { color: '#ef4444' }]}>
                                Clear All Reminders
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* Info */}
                <View style={[styles.infoCard, { backgroundColor: `${userColors.accent_color}10` }]}>
                    <Feather name="info" size={18} color={userColors.accent_color} />
                    <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
                        Workout reminders are automatically scheduled when you join events with training plans.
                        You'll receive a reminder the evening before each workout.
                    </Text>
                </View>
            </ScrollView>
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
    section: {
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    statusRow: {
        gap: spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        gap: 6,
    },
    statusText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    statusHint: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    enableButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    enableButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    toggleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        gap: spacing.sm,
        marginRight: spacing.md,
    },
    toggleText: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    toggleDesc: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginVertical: spacing.xs,
    },
    scheduledInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    countBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countNumber: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
    },
    scheduledText: {
        fontSize: typography.sizes.base,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.xs,
    },
    clearButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    infoCard: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: typography.sizes.sm,
        lineHeight: 20,
    },
});
