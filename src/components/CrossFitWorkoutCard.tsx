import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { spacing, typography } from '../theme';
import { getRandomCrossFitWorkout } from '../data/crossfitWorkouts';
import { RootStackParamList } from '../navigation';
import { useTheme } from '../context/ThemeContext';

interface CFWorkoutData {
    isCrossFit: boolean;
    id: string;
    year: number;
    name: string;
    subtitle: string;
    format: string;
    description: string;
    rxWeights: {
        male: string;
        female: string;
    };
}

interface CrossFitWorkoutCardProps {
    workout: {
        id: string;
        name: string;
        notes?: string;
    };
    onReroll: (newCfData: string) => void;
    onDelete: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CrossFitWorkoutCard({ workout, onReroll, onDelete }: CrossFitWorkoutCardProps) {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors, theme } = useTheme();

    // Theme-aware colors
    const cardBgColor = theme === 'dark' ? '#0a1929' : '#1e3a5f';
    const [showActions, setShowActions] = useState(false);
    const [localCfData, setLocalCfData] = useState<CFWorkoutData | null>(null);

    // Parse CF workout data from notes (initial load or when workout changes from server)
    useEffect(() => {
        try {
            if (workout.notes) {
                const parsed = JSON.parse(workout.notes);
                if (parsed.isCrossFit) {
                    setLocalCfData(parsed);
                }
            }
        } catch (e) {
            // Not a CF workout or invalid JSON
        }
    }, [workout.notes]);

    if (!localCfData) {
        return null; // Not a CrossFit workout
    }

    const handleToggleActions = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowActions(!showActions);
    };

    const handleCardPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('CrossFitWorkout', { id: workout.id });
    };

    const handleReroll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Get new random workout and update LOCAL state immediately (optimistic update)
        const cfWorkout = getRandomCrossFitWorkout();
        const newCfData: CFWorkoutData = {
            isCrossFit: true,
            id: cfWorkout.id,
            year: cfWorkout.year,
            name: cfWorkout.name,
            subtitle: cfWorkout.subtitle,
            format: cfWorkout.format,
            description: cfWorkout.description,
            rxWeights: cfWorkout.rxWeights,
        };

        // Update UI instantly
        setLocalCfData(newCfData);

        // Sync to database in background
        onReroll(JSON.stringify(newCfData));
    };

    const handleDelete = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowActions(false);
        onDelete();
    };

    return (
        <Pressable style={styles.container} onPress={handleCardPress}>
            {/* Gold accent left border */}
            <View style={[styles.accentBorder, { backgroundColor: '#c9a227' }]} />

            <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                {/* Header Row */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {/* CF Badge */}
                        <View style={styles.cfBadge}>
                            <Text style={styles.cfBadgeText}>CF</Text>
                            <Text style={styles.cfBadgeYear}>{localCfData.year}</Text>
                        </View>

                        {/* Title */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.workoutName}>{localCfData.name}</Text>
                            <Text style={styles.workoutFormat}>{localCfData.format}</Text>
                            <Text style={styles.workoutSubtitle}>{localCfData.subtitle}</Text>
                        </View>
                    </View>

                    {/* 3-dot menu */}
                    <Pressable
                        style={styles.menuButton}
                        onPress={handleToggleActions}
                    >
                        <Feather name="more-horizontal" size={20} color="#fff" />
                    </Pressable>
                </View>

                {/* Inline Action Buttons - shown when menu is toggled */}
                {showActions && (
                    <View style={styles.actionButtonsRow}>
                        <Pressable style={styles.actionButton} onPress={handleReroll}>
                            <Feather name="refresh-cw" size={14} color="#fff" />
                            <Text style={styles.actionButtonText}>Different WOD</Text>
                        </Pressable>
                        <Pressable style={styles.actionButton} onPress={handleDelete}>
                            <Feather name="trash-2" size={14} color="#fff" />
                            <Text style={styles.actionButtonText}>Remove</Text>
                        </Pressable>
                    </View>
                )}

                {/* Format */}
                <View style={styles.sectionBox}>
                    <Text style={styles.formatLabel}>FORMAT: </Text>
                    <Text style={styles.formatValue}>{localCfData.format}</Text>
                </View>

                {/* Exercises/Description - in its own container */}
                <View style={styles.sectionBox}>
                    <Text style={styles.description}>{localCfData.description}</Text>
                </View>

                {/* RX Weights */}
                <View style={styles.rxContainer}>
                    <View style={styles.rxBox}>
                        <View style={styles.rxHeader}>
                            <Text style={styles.rxLabel}>RX</Text>
                            <Feather name="user" size={12} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text style={styles.rxValue}>{localCfData.rxWeights.male}</Text>
                    </View>
                    <View style={styles.rxBox}>
                        <View style={styles.rxHeader}>
                            <Text style={styles.rxLabel}>RX</Text>
                            <Feather name="user" size={12} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text style={styles.rxValue}>{localCfData.rxWeights.female}</Text>
                    </View>
                </View>

                {/* Start Workout Button */}
                <Pressable
                    style={styles.startButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.navigate('CrossFitWorkout', { id: workout.id });
                    }}
                >
                    <Feather name="play-circle" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>Start Workout</Text>
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        borderRadius: 16,
        overflow: 'hidden',
    },
    accentBorder: {
        width: 5,
    },
    card: {
        flex: 1,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    cfBadge: {
        backgroundColor: 'rgba(201, 162, 39, 0.15)',
        borderWidth: 1,
        borderColor: '#c9a227',
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        alignItems: 'center',
        marginRight: spacing.md,
    },
    cfBadgeText: {
        color: '#c9a227',
        fontSize: typography.sizes.sm,
        fontWeight: '700',
    },
    cfBadgeYear: {
        color: '#c9a227',
        fontSize: typography.sizes.xs,
        fontWeight: '500',
    },
    titleContainer: {
        flex: 1,
    },
    workoutName: {
        color: '#fff',
        fontSize: typography.sizes.xl,
        fontWeight: '700',
    },
    workoutFormat: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: '600',
        opacity: 0.9,
        marginTop: 2,
        marginBottom: 4,
    },
    workoutSubtitle: {
        color: '#c9a227',
        fontSize: typography.sizes.sm,
    },
    menuButton: {
        padding: spacing.xs,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    sectionBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.sm,
    },
    formatLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: typography.sizes.sm,
        fontWeight: '500',
    },
    formatValue: {
        color: '#c9a227',
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    description: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontFamily: 'monospace',
        lineHeight: 22,
    },
    rxContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    rxBox: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.sm,
        borderRadius: 8,
        alignItems: 'center',
    },
    rxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    rxLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: typography.sizes.xs,
        fontWeight: '500',
    },
    rxValue: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: '600',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#22c55e',
        paddingVertical: spacing.md,
        borderRadius: 12,
        marginTop: spacing.md,
    },
    startButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: '600',
    },
});
