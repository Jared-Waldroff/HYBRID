import React, { useState } from 'react';
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
        source_event_name?: string | null;  // Event name if synced from event
        workout_exercises?: Array<{
            id: string;
            exercise?: {
                name: string;
            };
        }>;
    };
    onDelete?: () => void;
}

export default function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors } = useTheme();
    const [showMenu, setShowMenu] = useState(false);

    const exerciseNames = workout.workout_exercises
        ?.map((we) => we.exercise?.name)
        .filter(Boolean) || [];

    const handlePress = () => {
        if (showMenu) {
            setShowMenu(false);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ActiveWorkout', { id: workout.id });
    };

    const handleStartPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                            style={[styles.startButton, { backgroundColor: colors.accentPrimary }]}
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

                {/* Exercise list */}
                {exerciseNames.length > 0 && (
                    <View style={styles.exercises}>
                        {exerciseNames.slice(0, 4).map((name, index) => (
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
                        {exerciseNames.length > 4 && (
                            <Text style={[styles.moreText, { color: themeColors.textMuted }]}>
                                +{exerciseNames.length - 4} more
                            </Text>
                        )}
                    </View>
                )}

                {/* Event tag */}
                {workout.source_event_name && (
                    <View style={[styles.eventTag, { backgroundColor: colors.accentPrimary + '20' }]}>
                        <Feather name="flag" size={12} color={colors.accentPrimary} />
                        <Text style={[styles.eventTagText, { color: colors.accentPrimary }]} numberOfLines={1}>
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
});
