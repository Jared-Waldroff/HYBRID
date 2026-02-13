import React, { useState, memo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation';
import { spacing, radii, typography, MIN_TOUCH_TARGET, colors } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WorkoutCardProps {
    workout: {
        id: string;
        name: string;
        color: string;
        is_completed?: boolean;
        notes?: string | null;  // JSON metadata for event workouts
        source_event_name?: string | null;  // Event name if synced from event
        source_event_id?: string | null;    // Event ID for redirection
        source_training_workout_id?: string | null;  // Link to event training workout
        workout_exercises?: Array<{
            id: string;
            exercise?: {
                name: string;
            };
        }>;
    };
    onDelete?: () => void;
}

function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors, colors: userColors } = useTheme();
    const [showMenu, setShowMenu] = useState(false);

    const exerciseNames = workout.workout_exercises
        ?.map((we) => we.exercise?.name)
        .filter(Boolean) || [];

    // Parse event workout metadata from notes
    const eventMetadata = React.useMemo(() => {
        if (!workout.source_training_workout_id || !workout.notes) return null;
        try {
            const parsed = JSON.parse(workout.notes);
            if (parsed.isEventWorkout) return parsed;
        } catch {
            // Not JSON, regular notes
        }
        return null;
    }, [workout.notes, workout.source_training_workout_id]);

    // Format target display for event workouts
    const targetDisplay = React.useMemo(() => {
        if (!eventMetadata) return null;
        const parts: string[] = [];
        if (eventMetadata.target_value && eventMetadata.target_unit) {
            parts.push(`${eventMetadata.target_value} ${eventMetadata.target_unit}`);
        }
        if (eventMetadata.target_zone) {
            const zoneLabel = eventMetadata.target_zone.replace('zone', 'Zone ');
            parts.push(zoneLabel);
        }
        // Always show workout type if available (unless it's 'custom' and we have other parts)
        if (eventMetadata.workout_type) {
            if (eventMetadata.workout_type !== 'custom' || parts.length === 0) {
                // Push to beginning if it's the main type
                if (eventMetadata.workout_type !== 'custom') {
                    parts.unshift(eventMetadata.workout_type);
                } else {
                    // Try to parse activity names from target_notes (which is JSON)
                    let activityNames: string[] = [];
                    try {
                        let activities = [];
                        if (eventMetadata.target_notes) {
                            const notesParsed = typeof eventMetadata.target_notes === 'string'
                                ? JSON.parse(eventMetadata.target_notes)
                                : eventMetadata.target_notes;

                            if (Array.isArray(notesParsed)) {
                                activities = notesParsed;
                            } else if (notesParsed?.activities && Array.isArray(notesParsed.activities)) {
                                activities = notesParsed.activities;
                            }
                        }

                        if (activities.length > 0) {
                            activityNames = activities.map((a: any) =>
                                a.workoutTypeName || a.exerciseName || a.type
                            ).filter(Boolean);
                        }
                    } catch (e) {
                        // ignore parse error
                    }

                    if (activityNames.length > 0) {
                        parts.push(activityNames.join(' | '));
                    } else {
                        parts.push('Custom');
                    }
                }
            }
        }
        return parts.length > 0 ? parts.join(' • ') : null;
    }, [eventMetadata]);

    const handlePress = () => {
        if (showMenu) {
            setShowMenu(false);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Redirect event workouts to CompleteEventWorkout (now in HomeStack)
        if (workout.source_event_id && workout.source_training_workout_id) {
            // @ts-ignore - CompleteEventWorkout is in HomeStack params now
            navigation.navigate('CompleteEventWorkout', {
                eventId: workout.source_event_id,
                trainingWorkoutId: workout.source_training_workout_id,
            });
            return;
        }

        navigation.navigate('ActiveWorkout', { id: workout.id });
    };

    const handleStartPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Redirect event workouts to CompleteEventWorkout (now in HomeStack)
        if (workout.source_event_id && workout.source_training_workout_id) {
            // @ts-ignore - CompleteEventWorkout is in HomeStack params now
            navigation.navigate('CompleteEventWorkout', {
                eventId: workout.source_event_id,
                trainingWorkoutId: workout.source_training_workout_id,
            });
            return;
        }

        navigation.navigate('ActiveWorkout', { id: workout.id });
    };

    const handleMenuPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowMenu(!showMenu);
    };

    const handleDelete = () => {
        setShowMenu(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete?.();
    };

    return (
        <Pressable
            style={[
                styles.card,
                {
                    backgroundColor: themeColors.glassBg,
                    borderColor: themeColors.glassBorder,
                },
            ]}
            onPress={handlePress}
        >
            {/* Color accent bar - LEFT side */}
            <View style={[styles.colorBar, { backgroundColor: workout.color }]} />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {workout.name}
                    </Text>

                    <View style={styles.headerRight}>
                        {/* 3-dot menu */}
                        <Pressable style={styles.menuButton} onPress={handleMenuPress}>
                            <Feather name="more-vertical" size={18} color={themeColors.textSecondary} />
                        </Pressable>

                        <Pressable
                            style={[styles.startButton, { backgroundColor: userColors.accent_color }]}
                            onPress={handleStartPress}
                        >
                            <Feather name="play" size={14} color="#fff" />
                            <Text style={styles.startButtonText}>Start</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Menu Dropdown */}
                {showMenu && (
                    <View style={[styles.menuDropdown, { backgroundColor: themeColors.bgSecondary }]}>
                        <Pressable style={styles.menuItem} onPress={handleDelete}>
                            <Feather name="trash-2" size={16} color="#ef4444" />
                            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
                        </Pressable>
                    </View>
                )}

                {/* Exercise list OR Event workout target */}
                {targetDisplay ? (
                    <View style={styles.exercises}>
                        <View style={styles.exerciseItem}>
                            <View style={[styles.exerciseDot, { backgroundColor: workout.color }]} />
                            <Text
                                style={[styles.exerciseName, { color: themeColors.textSecondary }]}
                                numberOfLines={1}
                            >
                                {targetDisplay}
                            </Text>
                        </View>
                        {eventMetadata?.description && (
                            <Text style={[styles.eventDescription, { color: themeColors.textMuted }]} numberOfLines={2}>
                                {eventMetadata.description}
                            </Text>
                        )}
                        {/* If we have event text, we can show it here if we want more detail?
                            For now, targetDisplay covers the main info.
                        */}
                    </View>
                ) : (exerciseNames.length > 0 && (
                    <View style={styles.exercises}>
                        {exerciseNames.map((name, index) => (
                            <View key={index} style={styles.exerciseItem}>
                                <View style={[styles.exerciseDot, { backgroundColor: workout.color }]} />
                                <Text
                                    style={[styles.exerciseName, { color: themeColors.textSecondary }]}
                                    numberOfLines={1}
                                >
                                    {name}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Event tag */}
                {workout.source_event_name && (
                    <View style={[styles.eventTag, { backgroundColor: colors.accentPrimary }]}>
                        <Feather name="flag" size={12} color="#fff" />
                        <Text style={[styles.eventTagText, { color: '#fff' }]} numberOfLines={1}>
                            {workout.source_event_name}
                        </Text>
                    </View>
                )}

                {/* Completed badge */}
                {workout.is_completed && (
                    <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
                        <Feather name="check" size={12} color={colors.success} />
                        <Text style={[styles.completedText, { color: colors.success }]}>Completed</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    colorBar: {
        width: 4,
    },
    content: {
        flex: 1,
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        flex: 1,
        marginRight: spacing.sm,
    },
    menuButton: {
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuDropdown: {
        position: 'absolute',
        top: spacing.md + MIN_TOUCH_TARGET,
        right: spacing.md,
        borderRadius: radii.md,
        padding: spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: MIN_TOUCH_TARGET,
    },
    menuItemText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
    },
    startButtonText: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    exercises: {
        gap: spacing.xs,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    exerciseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    exerciseName: {
        fontSize: typography.sizes.sm,
        flex: 1,
    },
    moreText: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        marginTop: spacing.sm,
    },
    completedText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    eventTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        marginTop: spacing.sm,
        maxWidth: '100%',
    },
    eventTagText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
        flexShrink: 1,
    },
    eventDescription: {
        fontSize: typography.sizes.xs,
        marginTop: spacing.xs,
        lineHeight: 16,
    },
});

export default memo(WorkoutCard);
