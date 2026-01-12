import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';
import { useGoogleCalendarSync, SyncOptions, SyncResult } from '../hooks/useGoogleCalendarSync';

interface CalendarSyncModalProps {
    visible: boolean;
    onClose: () => void;
    workouts: any[];
}

type SyncRange = 'month' | '3months' | '6months' | 'year';
type TimeOption = '06:00' | '07:00' | '08:00' | '09:00' | '12:00' | '17:00' | '18:00' | '19:00';
type DurationOption = 30 | 45 | 60 | 90 | 120;

const TIME_OPTIONS: { value: TimeOption; label: string }[] = [
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
];

const DURATION_OPTIONS: { value: DurationOption; label: string }[] = [
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
];

export default function CalendarSyncModal({ visible, onClose, workouts }: CalendarSyncModalProps) {
    const { themeColors, colors: userColors } = useTheme();
    const { syncing, progress, preferences, loadPreferences, syncWorkouts } = useGoogleCalendarSync();

    const [syncRange, setSyncRange] = useState<SyncRange>('month');
    const [selectedTime, setSelectedTime] = useState<TimeOption>('07:00');
    const [selectedDuration, setSelectedDuration] = useState<DurationOption>(60);
    const [result, setResult] = useState<SyncResult | null>(null);
    const [showResult, setShowResult] = useState(false);

    // Load saved preferences when modal opens
    useEffect(() => {
        if (visible) {
            loadPreferences().then(prefs => {
                if (prefs.preferred_workout_time) {
                    const time = prefs.preferred_workout_time.slice(0, 5) as TimeOption;
                    if (TIME_OPTIONS.find(t => t.value === time)) {
                        setSelectedTime(time);
                    }
                }
                if (prefs.preferred_workout_duration) {
                    const dur = prefs.preferred_workout_duration as DurationOption;
                    if (DURATION_OPTIONS.find(d => d.value === dur)) {
                        setSelectedDuration(dur);
                    }
                }
            });
            setResult(null);
            setShowResult(false);
        }
    }, [visible, loadPreferences]);

    const getSyncDates = (): { start: Date; end: Date; label: string } => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);

        switch (syncRange) {
            case 'month':
                return {
                    start,
                    end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
                    label: `${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                };
            case '3months':
                return {
                    start,
                    end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
                    label: 'Next 3 months',
                };
            case '6months':
                return {
                    start,
                    end: new Date(today.getFullYear(), today.getMonth() + 6, 0),
                    label: 'Next 6 months',
                };
            case 'year':
                return {
                    start,
                    end: new Date(today.getFullYear(), today.getMonth() + 12, 0),
                    label: 'Full year',
                };
        }
    };

    const getWorkoutCount = (): number => {
        const { start, end } = getSyncDates();
        return workouts.filter(w => {
            const date = new Date(w.scheduled_date);
            return date >= start && date <= end;
        }).length;
    };

    const handleSync = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const { start, end } = getSyncDates();
        const options: SyncOptions = {
            startDate: start,
            endDate: end,
            preferredTime: selectedTime,
            durationMinutes: selectedDuration,
        };

        const syncResult = await syncWorkouts(workouts, options);
        setResult(syncResult);
        setShowResult(true);

        if (syncResult.synced > 0) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleClose = () => {
        setShowResult(false);
        setResult(null);
        onClose();
    };

    const renderRangeOption = (range: SyncRange, label: string) => {
        const isSelected = syncRange === range;
        return (
            <Pressable
                key={range}
                style={[
                    styles.rangeOption,
                    {
                        backgroundColor: isSelected ? `${userColors.accent_color}20` : themeColors.glassBg,
                        borderColor: isSelected ? userColors.accent_color : themeColors.glassBorder,
                    },
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSyncRange(range);
                }}
            >
                <View style={[
                    styles.radioCircle,
                    { borderColor: isSelected ? userColors.accent_color : themeColors.textMuted },
                ]}>
                    {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: userColors.accent_color }]} />
                    )}
                </View>
                <Text style={[styles.rangeLabel, { color: themeColors.textPrimary }]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable
                    style={[styles.modal, { backgroundColor: themeColors.bgSecondary }]}
                    onPress={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Feather name="calendar" size={24} color={userColors.accent_color} />
                            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                                Sync to Calendar
                            </Text>
                        </View>
                        <Pressable onPress={handleClose} hitSlop={10}>
                            <Feather name="x" size={24} color={themeColors.textSecondary} />
                        </Pressable>
                    </View>

                    {showResult ? (
                        /* Result View */
                        <View style={styles.resultContainer}>
                            <View style={[styles.resultIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                                <Feather
                                    name={result?.errors === 0 ? 'check-circle' : 'alert-circle'}
                                    size={48}
                                    color={result?.errors === 0 ? '#10b981' : '#f59e0b'}
                                />
                            </View>
                            <Text style={[styles.resultTitle, { color: themeColors.textPrimary }]}>
                                Sync Complete!
                            </Text>
                            <View style={styles.resultStats}>
                                <View style={styles.resultStat}>
                                    <Text style={[styles.resultNumber, { color: '#10b981' }]}>
                                        {result?.synced || 0}
                                    </Text>
                                    <Text style={[styles.resultLabel, { color: themeColors.textSecondary }]}>
                                        Synced
                                    </Text>
                                </View>
                                {(result?.skipped || 0) > 0 && (
                                    <View style={styles.resultStat}>
                                        <Text style={[styles.resultNumber, { color: themeColors.textMuted }]}>
                                            {result?.skipped || 0}
                                        </Text>
                                        <Text style={[styles.resultLabel, { color: themeColors.textSecondary }]}>
                                            Already Synced
                                        </Text>
                                    </View>
                                )}
                                {(result?.errors || 0) > 0 && (
                                    <View style={styles.resultStat}>
                                        <Text style={[styles.resultNumber, { color: '#ef4444' }]}>
                                            {result?.errors || 0}
                                        </Text>
                                        <Text style={[styles.resultLabel, { color: themeColors.textSecondary }]}>
                                            Errors
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Pressable
                                style={[styles.doneButton, { backgroundColor: userColors.accent_color }]}
                                onPress={handleClose}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </Pressable>
                        </View>
                    ) : syncing ? (
                        /* Syncing View */
                        <View style={styles.syncingContainer}>
                            <ActivityIndicator size="large" color={userColors.accent_color} />
                            <Text style={[styles.syncingText, { color: themeColors.textPrimary }]}>
                                Syncing workouts...
                            </Text>
                            <Text style={[styles.progressText, { color: themeColors.textSecondary }]}>
                                {progress}% complete
                            </Text>
                            <View style={[styles.progressBar, { backgroundColor: themeColors.glassBg }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { backgroundColor: userColors.accent_color, width: `${progress}%` },
                                    ]}
                                />
                            </View>
                        </View>
                    ) : (
                        /* Options View */
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            {/* Sync Range */}
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                                SYNC RANGE
                            </Text>
                            <View style={styles.rangeContainer}>
                                {renderRangeOption('month', `This month (${new Date().toLocaleDateString('en-US', { month: 'short' })})`)}
                                {renderRangeOption('3months', 'Next 3 months')}
                                {renderRangeOption('6months', 'Next 6 months')}
                                {renderRangeOption('year', 'Full year')}
                            </View>

                            {/* Workout Count */}
                            <View style={[styles.infoBox, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                                <Feather name="info" size={18} color={userColors.accent_color} />
                                <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
                                    {getWorkoutCount()} workouts will be synced
                                </Text>
                            </View>

                            {/* Workout Time */}
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                                ⏰ WORKOUT START TIME
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.pillContainer}>
                                    {TIME_OPTIONS.map(option => (
                                        <Pressable
                                            key={option.value}
                                            style={[
                                                styles.pill,
                                                {
                                                    backgroundColor: selectedTime === option.value
                                                        ? userColors.accent_color
                                                        : themeColors.glassBg,
                                                    borderColor: selectedTime === option.value
                                                        ? userColors.accent_color
                                                        : themeColors.glassBorder,
                                                },
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedTime(option.value);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.pillText,
                                                    { color: selectedTime === option.value ? '#fff' : themeColors.textSecondary },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Duration */}
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                                ⏱️ WORKOUT DURATION
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.pillContainer}>
                                    {DURATION_OPTIONS.map(option => (
                                        <Pressable
                                            key={option.value}
                                            style={[
                                                styles.pill,
                                                {
                                                    backgroundColor: selectedDuration === option.value
                                                        ? userColors.accent_color
                                                        : themeColors.glassBg,
                                                    borderColor: selectedDuration === option.value
                                                        ? userColors.accent_color
                                                        : themeColors.glassBorder,
                                                },
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedDuration(option.value);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.pillText,
                                                    { color: selectedDuration === option.value ? '#fff' : themeColors.textSecondary },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Sync Button */}
                            <Pressable
                                style={[styles.syncButton, { backgroundColor: userColors.accent_color }]}
                                onPress={handleSync}
                            >
                                <Feather name="upload-cloud" size={20} color="#fff" />
                                <Text style={styles.syncButtonText}>Sync to Calendar</Text>
                            </Pressable>

                            <Text style={[styles.disclaimer, { color: themeColors.textMuted }]}>
                                Events will be added to your device calendar and sync with Google Calendar if configured.
                            </Text>
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        maxHeight: '85%',
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    content: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.semibold,
        letterSpacing: 1,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    rangeContainer: {
        gap: spacing.sm,
    },
    rangeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.md,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    rangeLabel: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    infoText: {
        fontSize: typography.sizes.sm,
        flex: 1,
    },
    pillContainer: {
        flexDirection: 'row',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    pillText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    syncButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    disclaimer: {
        fontSize: typography.sizes.xs,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 18,
    },
    syncingContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    syncingText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginTop: spacing.md,
    },
    progressText: {
        fontSize: typography.sizes.sm,
    },
    progressBar: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        marginTop: spacing.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    resultContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    resultIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    resultTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.lg,
    },
    resultStats: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginBottom: spacing.xl,
    },
    resultStat: {
        alignItems: 'center',
    },
    resultNumber: {
        fontSize: 32,
        fontWeight: typography.weights.bold,
    },
    resultLabel: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    doneButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
});
