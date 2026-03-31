import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type PrefKey =
    | 'squadRequests'
    | 'squadPosts'
    | 'comments'
    | 'lfgReactions'
    | 'eventInvites'
    | 'eventSoon'
    | 'workoutReminders'
    | 'checkInReminders';

interface ToggleRowItem {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    description: string;
    prefKey: PrefKey;
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

interface ToggleRowProps {
    item: ToggleRowItem;
    value: boolean;
    onValueChange: (v: boolean) => void;
    accent: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    showDivider: boolean;
    dividerColor: string;
}

function ToggleRow({
    item,
    value,
    onValueChange,
    accent,
    bgTertiary,
    textPrimary,
    textSecondary,
    textMuted,
    showDivider,
    dividerColor,
}: ToggleRowProps) {
    return (
        <>
            <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                    <Feather name={item.icon} size={18} color={textSecondary} />
                    <View style={styles.toggleText}>
                        <Text style={[styles.toggleTitle, { color: textPrimary }]}>
                            {item.label}
                        </Text>
                        <Text style={[styles.toggleDesc, { color: textMuted }]}>
                            {item.description}
                        </Text>
                    </View>
                </View>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: bgTertiary, true: `${accent}50` }}
                    thumbColor={value ? accent : textMuted}
                />
            </View>
            {showDivider && (
                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            )}
        </>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    accent: string;
    textPrimary: string;
}

function SectionHeader({ icon, title, accent, textPrimary }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeader}>
            <Feather name={icon} size={20} color={accent} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                {title}
            </Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SQUAD_TOGGLES: ToggleRowItem[] = [
    {
        icon: 'user-plus',
        label: 'Squad Requests',
        description: 'Someone sends or accepts a request',
        prefKey: 'squadRequests',
    },
    {
        icon: 'message-circle',
        label: 'Comments',
        description: 'Someone comments on your post',
        prefKey: 'comments',
    },
    {
        icon: 'zap',
        label: 'LFG Reactions',
        description: 'Someone reacts LFG to your post',
        prefKey: 'lfgReactions',
    },
    {
        icon: 'edit-3',
        label: 'Squad Posts',
        description: 'Someone in your squad posts',
        prefKey: 'squadPosts',
    },
];

const EVENT_TOGGLES: ToggleRowItem[] = [
    {
        icon: 'mail',
        label: 'Event Invites',
        description: 'Someone invites you to an event',
        prefKey: 'eventInvites',
    },
    {
        icon: 'clock',
        label: 'Event Starting Soon',
        description: 'Reminder before an event',
        prefKey: 'eventSoon',
    },
];

const TRAINING_TOGGLES: ToggleRowItem[] = [
    {
        icon: 'bell',
        label: 'Workout Reminders',
        description: 'Reminder before a training workout',
        prefKey: 'workoutReminders',
    },
    {
        icon: 'check-square',
        label: 'Check-In Reminders',
        description: 'Periodic training progress nudges',
        prefKey: 'checkInReminders',
    },
];

export default function NotificationSettingsScreen() {
    const navigation = useNavigation<any>();
    const { themeColors, colors: userColors } = useTheme();
    const { preferences, updatePreferences, isRegistered, registerForNotifications } = useNotifications();

    const [registeringPush, setRegisteringPush] = React.useState(false);

    const accent = userColors.accent_color;

    const handleEnablePush = async () => {
        setRegisteringPush(true);
        await registerForNotifications();
        setRegisteringPush(false);
    };

    const handleToggle = (key: PrefKey, value: boolean) => {
        updatePreferences({ [key]: value });
    };

    const handleSoundToggle = (choice: 'custom' | 'default') => {
        updatePreferences({ sound: choice });
    };

    const renderToggles = (items: ToggleRowItem[]) =>
        items.map((item, index) => (
            <ToggleRow
                key={item.prefKey}
                item={item}
                value={preferences[item.prefKey]}
                onValueChange={(v) => handleToggle(item.prefKey, v)}
                accent={accent}
                bgTertiary={themeColors.bgTertiary}
                textPrimary={themeColors.textPrimary}
                textSecondary={themeColors.textSecondary}
                textMuted={themeColors.textMuted}
                showDivider={index < items.length - 1}
                dividerColor={themeColors.divider}
            />
        ));

    return (
        <ScreenLayout hideHeader>
            {/* ── Custom Header ── */}
            <View style={[styles.header, { borderBottomColor: themeColors.divider }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
                    <Feather name="arrow-left" size={24} color={themeColors.textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                    Notification Settings
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* ── 1. Push Notifications ── */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <SectionHeader
                        icon="bell"
                        title="Push Notifications"
                        accent={accent}
                        textPrimary={themeColors.textPrimary}
                    />

                    {isRegistered ? (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                                <Feather name="check-circle" size={16} color="#10b981" />
                                <Text style={[styles.statusText, { color: '#10b981' }]}>Enabled</Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                You'll receive notifications on this device
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: '#f5970620' }]}>
                                <Feather name="alert-circle" size={16} color="#f59706" />
                                <Text style={[styles.statusText, { color: '#f59706' }]}>Not Enabled</Text>
                            </View>
                            <Text style={[styles.statusHint, { color: themeColors.textMuted }]}>
                                Enable to receive push notifications on this device
                            </Text>
                            <Pressable
                                style={[styles.enableButton, { backgroundColor: accent }]}
                                onPress={handleEnablePush}
                                disabled={registeringPush}
                            >
                                {registeringPush ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.enableButtonText}>Enable Notifications</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* ── 2. Sound ── */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <SectionHeader
                        icon="volume-2"
                        title="Sound"
                        accent={accent}
                        textPrimary={themeColors.textPrimary}
                    />

                    <View style={styles.soundRow}>
                        <Pressable
                            style={[
                                styles.soundOption,
                                preferences.sound === 'custom'
                                    ? { backgroundColor: `${accent}20`, borderColor: accent }
                                    : { backgroundColor: 'transparent', borderColor: themeColors.glassBorder },
                            ]}
                            onPress={() => handleSoundToggle('custom')}
                        >
                            <Text
                                style={[
                                    styles.soundOptionText,
                                    { color: preferences.sound === 'custom' ? accent : themeColors.textMuted },
                                ]}
                            >
                                Custom (HYBRID)
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.soundOption,
                                preferences.sound === 'default'
                                    ? { backgroundColor: `${accent}20`, borderColor: accent }
                                    : { backgroundColor: 'transparent', borderColor: themeColors.glassBorder },
                            ]}
                            onPress={() => handleSoundToggle('default')}
                        >
                            <Text
                                style={[
                                    styles.soundOptionText,
                                    { color: preferences.sound === 'default' ? accent : themeColors.textMuted },
                                ]}
                            >
                                System Default
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── 3. Squad Activity ── */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <SectionHeader
                        icon="users"
                        title="Squad Activity"
                        accent={accent}
                        textPrimary={themeColors.textPrimary}
                    />
                    {renderToggles(SQUAD_TOGGLES)}
                </View>

                {/* ── 4. Events ── */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <SectionHeader
                        icon="calendar"
                        title="Events"
                        accent={accent}
                        textPrimary={themeColors.textPrimary}
                    />
                    {renderToggles(EVENT_TOGGLES)}
                </View>

                {/* ── 5. Training ── */}
                <View style={[styles.section, { backgroundColor: themeColors.bgSecondary }]}>
                    <SectionHeader
                        icon="activity"
                        title="Training"
                        accent={accent}
                        textPrimary={themeColors.textPrimary}
                    />
                    {renderToggles(TRAINING_TOGGLES)}
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    headerSpacer: {
        width: 40,
    },

    // ScrollView
    scroll: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
    },

    // Section card
    section: {
        borderRadius: radii.lg,
        padding: spacing.md,
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

    // Push status
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
    },
    enableButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    enableButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },

    // Sound toggle
    soundRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    soundOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    soundOptionText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },

    // Toggle rows
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
});
