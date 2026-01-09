import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Vibration,
    TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';

import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../navigation';
import ScreenLayout from '../components/ScreenLayout';
import { colors, spacing, radii, typography, MIN_TOUCH_TARGET } from '../theme';
import { useCFWorkoutScores, formatScore } from '../hooks/useCFWorkoutScores';

type CrossFitWorkoutRouteProp = RouteProp<RootStackParamList, 'CrossFitWorkout'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CF_NAVY = '#0a1929';

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

interface TimerConfig {
    type: 'countdown' | 'countup';
    duration: number; // in seconds
    cap?: number; // for countup timers
}

// Parse workout format to determine timer behavior
function parseTimerConfig(format: string): TimerConfig {
    // AMRAP workouts - countdown from the duration
    const amrapMatch = format.match(/(\d+)-minute\s+AMRAP/i);
    if (amrapMatch) {
        const minutes = parseInt(amrapMatch[1]);
        return { type: 'countdown', duration: minutes * 60 };
    }

    // For Time workouts - count up with a cap
    const forTimeMatch = format.match(/For\s+Time\s*\((\d+)-minute\s+cap\)/i);
    if (forTimeMatch) {
        const minutes = parseInt(forTimeMatch[1]);
        return { type: 'countup', duration: 0, cap: minutes * 60 };
    }

    // Rounds For Time
    const roundsMatch = format.match(/(\d+)\s+Rounds?\s+For\s+Time\s*\((\d+)-minute\s+cap\)/i);
    if (roundsMatch) {
        const minutes = parseInt(roundsMatch[2]);
        return { type: 'countup', duration: 0, cap: minutes * 60 };
    }

    // Intervals - use first number as initial time
    const intervalMatch = format.match(/Intervals?\s*\((\d+)\s*min/i);
    if (intervalMatch) {
        const minutes = parseInt(intervalMatch[1]);
        return { type: 'countdown', duration: minutes * 60 };
    }

    // Default - 15 minute count up
    return { type: 'countup', duration: 0, cap: 15 * 60 };
}

function formatTime(seconds: number): string {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function CrossFitWorkoutScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<CrossFitWorkoutRouteProp>();
    const { id } = route.params;
    const { themeColors, colors: userColors } = useTheme();

    const [workout, setWorkout] = useState<any>(null);
    const [cfData, setCfData] = useState<CFWorkoutData | null>(null);
    const [loading, setLoading] = useState(true);

    const [timerConfig, setTimerConfig] = useState<TimerConfig | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [workoutCompleted, setWorkoutCompleted] = useState(false);

    // Score input state
    const [scoreRounds, setScoreRounds] = useState('');
    const [scoreReps, setScoreReps] = useState('');
    const [scoreMinutes, setScoreMinutes] = useState('');
    const [scoreSeconds, setScoreSeconds] = useState('');
    const [scoreNotes, setScoreNotes] = useState('');

    // Countdown intro state (3, 2, 1, Go!)
    const [countdownIntro, setCountdownIntro] = useState<number | null>(null);
    const [showIntro, setShowIntro] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Score tracking hook
    const { scores, bestScore, saveScore, loading: scoresLoading } = useCFWorkoutScores(cfData?.id);

    // Keep screen awake
    useEffect(() => {
        activateKeepAwakeAsync();
        return () => {
            deactivateKeepAwake();
            if (timerRef.current) clearInterval(timerRef.current);
            if (soundRef.current) soundRef.current.unloadAsync();
        };
    }, []);

    // Load workout data
    useEffect(() => {
        const loadWorkout = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                setWorkout(data);

                // Parse CF data from notes
                if (data?.notes) {
                    try {
                        const parsed = JSON.parse(data.notes);
                        if (parsed.isCrossFit) {
                            setCfData(parsed);
                            const config = parseTimerConfig(parsed.format);
                            setTimerConfig(config);
                            // Set initial time based on timer type
                            setCurrentTime(config.type === 'countdown' ? config.duration : 0);
                        }
                    } catch (e) {
                        console.error('Error parsing CF data:', e);
                    }
                }
            } catch (err) {
                console.error('Error loading workout:', err);
            }

            setLoading(false);
        };

        loadWorkout();
    }, [id]);

    // Timer tick
    useEffect(() => {
        if (isRunning && timerConfig) {
            timerRef.current = setInterval(() => {
                setCurrentTime(prev => {
                    if (timerConfig.type === 'countdown') {
                        const newTime = prev - 1;
                        if (newTime <= 0) {
                            handleTimerComplete();
                            return 0;
                        }
                        return newTime;
                    } else {
                        // Count up
                        const newTime = prev + 1;
                        if (timerConfig.cap && newTime >= timerConfig.cap) {
                            handleTimerComplete();
                            return timerConfig.cap;
                        }
                        return newTime;
                    }
                });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [isRunning, timerConfig]);

    // Play beep sound using vibration patterns (reliable in Expo Go)
    const playBeep = async (isGo: boolean = false) => {
        if (isGo) {
            // GO! - Stronger, longer vibration
            Vibration.vibrate([0, 300]);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            // 3, 2, 1 - Short beep-like vibration
            Vibration.vibrate(100);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    };

    // Countdown intro tick (3, 2, 1, Go!)
    useEffect(() => {
        if (showIntro && countdownIntro !== null) {
            if (countdownIntro > 0) {
                // Play beep for 3, 2, 1
                playBeep(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                const timeout = setTimeout(() => {
                    setCountdownIntro(prev => (prev !== null ? prev - 1 : null));
                }, 1000);
                return () => clearTimeout(timeout);
            } else {
                // GO! - Play higher beep and start timer IMMEDIATELY
                playBeep(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsRunning(true); // Start timer immediately when GO! appears

                // Hide the GO! overlay after a brief moment
                const timeout = setTimeout(() => {
                    setShowIntro(false);
                    setCountdownIntro(null);
                }, 800);
                return () => clearTimeout(timeout);
            }
        }
    }, [showIntro, countdownIntro]);

    const handleTimerComplete = useCallback(async () => {
        setIsRunning(false);
        setIsComplete(true);

        // Vibrate pattern for completion alarm
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);

        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []);

    const startTimer = () => {
        if (isComplete) {
            // Reset timer
            if (timerConfig) {
                setCurrentTime(timerConfig.type === 'countdown' ? timerConfig.duration : 0);
            }
            setIsComplete(false);
        }

        // Start 3-2-1-Go countdown
        setShowIntro(true);
        setCountdownIntro(3);
    };

    const pauseTimer = () => {
        setIsRunning(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setIsComplete(false);
        if (timerConfig) {
            setCurrentTime(timerConfig.type === 'countdown' ? timerConfig.duration : 0);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const stopWorkout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const completeWorkout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setWorkoutCompleted(true);

        // Save score based on workout type
        if (cfData) {
            const isAmrap = cfData.format.toLowerCase().includes('amrap');

            if (isAmrap) {
                // Save rounds + reps score
                await saveScore({
                    cf_workout_id: cfData.id,
                    workout_id: id,
                    score_type: 'rounds_reps',
                    rounds: parseInt(scoreRounds) || 0,
                    reps: parseInt(scoreReps) || 0,
                    notes: scoreNotes || undefined,
                });
            } else {
                // Save time score
                const totalSeconds = (parseInt(scoreMinutes) || 0) * 60 + (parseInt(scoreSeconds) || 0);
                await saveScore({
                    cf_workout_id: cfData.id,
                    workout_id: id,
                    score_type: 'time',
                    time_seconds: totalSeconds > 0 ? totalSeconds : currentTime,
                    notes: scoreNotes || undefined,
                });
            }
        }

        // Update database
        await supabase
            .from('workouts')
            .update({ is_completed: true })
            .eq('id', id);

        // Navigate back after brief delay
        setTimeout(() => {
            navigation.goBack();
        }, 500);
    };

    if (loading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                    <Text style={[styles.loadingText, { color: themeColors.textTertiary }]}>
                        Loading workout...
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    if (!cfData) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: themeColors.textTertiary }]}>
                        Workout not found
                    </Text>
                    <Pressable
                        style={[styles.button, { backgroundColor: userColors.accent_color }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </Pressable>
                </View>
            </ScreenLayout>
        );
    }

    // 3-2-1-Go overlay
    if (showIntro) {
        return (
            <View style={[styles.introOverlay, { backgroundColor: CF_NAVY }]}>
                <Text style={styles.introNumber}>
                    {countdownIntro === 0 ? 'GO!' : countdownIntro}
                </Text>
            </View>
        );
    }

    return (
        <ScreenLayout>
            {/* Title Bar */}
            <View style={[styles.titleBar, { borderBottomColor: themeColors.glassBorder }]}>
                <Pressable style={styles.backButton} onPress={stopWorkout}>
                    <Feather name="x" size={24} color={themeColors.textPrimary} />
                </Pressable>
                <View style={styles.titleInfo}>
                    <Text style={[styles.titleText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {cfData.name}
                    </Text>
                    <Text style={[styles.subtitleText, { color: themeColors.textTertiary }]}>
                        {cfData.format}
                    </Text>
                </View>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Timer Display */}
                <View style={[styles.timerContainer, { backgroundColor: CF_NAVY }]}>
                    <Text style={[styles.timerLabel, { color: 'rgba(255,255,255,0.6)' }]}>
                        {timerConfig?.type === 'countdown' ? 'TIME REMAINING' : 'ELAPSED TIME'}
                    </Text>
                    <Text style={[
                        styles.timerText,
                        isComplete && { color: colors.success }
                    ]}>
                        {formatTime(currentTime)}
                    </Text>
                    {timerConfig?.cap && timerConfig.type === 'countup' && (
                        <Text style={[styles.timerCap, { color: 'rgba(255,255,255,0.5)' }]}>
                            Cap: {formatTime(timerConfig.cap)}
                        </Text>
                    )}

                    {/* Timer Controls */}
                    <View style={styles.timerControls}>
                        {!isRunning ? (
                            <Pressable
                                style={[styles.timerBtn, styles.startBtn]}
                                onPress={startTimer}
                            >
                                <Feather name="play" size={24} color="#fff" />
                                <Text style={styles.timerBtnText}>
                                    {isComplete ? 'Restart' : 'Start'}
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                style={[styles.timerBtn, styles.pauseBtn]}
                                onPress={pauseTimer}
                            >
                                <Feather name="pause" size={24} color="#fff" />
                                <Text style={styles.timerBtnText}>Pause</Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={[styles.timerBtn, styles.resetBtn]}
                            onPress={resetTimer}
                        >
                            <Feather name="rotate-ccw" size={20} color="#fff" />
                        </Pressable>
                    </View>
                </View>

                {/* Completion Banner */}
                {isComplete && (
                    <View style={[styles.completeBanner, { backgroundColor: colors.success }]}>
                        <Feather name="check-circle" size={24} color="#fff" />
                        <Text style={styles.completeText}>WORKOUT COMPLETE!</Text>
                    </View>
                )}

                {/* Workout Details */}
                <View style={[styles.workoutCard, { backgroundColor: themeColors.bgSecondary }]}>
                    {/* Format at top */}
                    <Text style={[styles.workoutFormat, { color: themeColors.textPrimary }]}>
                        {cfData.format}
                    </Text>

                    <Text style={[styles.workoutTitle, { color: '#c9a227' }]}>
                        {cfData.subtitle}
                    </Text>

                    <Text style={[styles.workoutDescription, { color: themeColors.textPrimary }]}>
                        {cfData.description.trim()}
                    </Text>

                    {/* Rx Weights */}
                    <View style={styles.rxContainer}>
                        <View style={styles.rxBox}>
                            <View style={styles.rxHeader}>
                                <Feather name="user" size={14} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.rxLabel}>Rx Men</Text>
                            </View>
                            <Text style={styles.rxValue}>{cfData.rxWeights?.male || 'N/A'}</Text>
                        </View>
                        <View style={styles.rxBox}>
                            <View style={styles.rxHeader}>
                                <Feather name="user" size={14} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.rxLabel}>Rx Women</Text>
                            </View>
                            <Text style={styles.rxValue}>{cfData.rxWeights?.female || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Score Input Section */}
                <View style={[styles.scoreSection, { backgroundColor: themeColors.bgSecondary }]}>
                    <Text style={[styles.scoreSectionTitle, { color: themeColors.textPrimary }]}>
                        Your Score
                    </Text>

                    {cfData?.format.toLowerCase().includes('amrap') ? (
                        // AMRAP: Rounds + Reps input
                        <View style={styles.scoreInputRow}>
                            <View style={styles.scoreInputGroup}>
                                <Text style={[styles.scoreInputLabel, { color: themeColors.textSecondary }]}>
                                    Rounds
                                </Text>
                                <TextInput
                                    style={[styles.scoreInput, {
                                        backgroundColor: themeColors.inputBg,
                                        borderColor: themeColors.inputBorder,
                                        color: themeColors.textPrimary
                                    }]}
                                    value={scoreRounds}
                                    onChangeText={setScoreRounds}
                                    placeholder="0"
                                    placeholderTextColor={themeColors.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text style={[styles.scorePlus, { color: themeColors.textSecondary }]}>+</Text>
                            <View style={styles.scoreInputGroup}>
                                <Text style={[styles.scoreInputLabel, { color: themeColors.textSecondary }]}>
                                    Reps
                                </Text>
                                <TextInput
                                    style={[styles.scoreInput, {
                                        backgroundColor: themeColors.inputBg,
                                        borderColor: themeColors.inputBorder,
                                        color: themeColors.textPrimary
                                    }]}
                                    value={scoreReps}
                                    onChangeText={setScoreReps}
                                    placeholder="0"
                                    placeholderTextColor={themeColors.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                    ) : (
                        // For Time: Time input
                        <View style={styles.scoreInputRow}>
                            <View style={styles.scoreInputGroup}>
                                <Text style={[styles.scoreInputLabel, { color: themeColors.textSecondary }]}>
                                    Minutes
                                </Text>
                                <TextInput
                                    style={[styles.scoreInput, {
                                        backgroundColor: themeColors.inputBg,
                                        borderColor: themeColors.inputBorder,
                                        color: themeColors.textPrimary
                                    }]}
                                    value={scoreMinutes}
                                    onChangeText={setScoreMinutes}
                                    placeholder="0"
                                    placeholderTextColor={themeColors.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text style={[styles.scorePlus, { color: themeColors.textSecondary }]}>:</Text>
                            <View style={styles.scoreInputGroup}>
                                <Text style={[styles.scoreInputLabel, { color: themeColors.textSecondary }]}>
                                    Seconds
                                </Text>
                                <TextInput
                                    style={[styles.scoreInput, {
                                        backgroundColor: themeColors.inputBg,
                                        borderColor: themeColors.inputBorder,
                                        color: themeColors.textPrimary
                                    }]}
                                    value={scoreSeconds}
                                    onChangeText={setScoreSeconds}
                                    placeholder="00"
                                    placeholderTextColor={themeColors.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                        </View>
                    )}

                    {/* Notes input */}
                    <TextInput
                        style={[styles.scoreNotesInput, {
                            backgroundColor: themeColors.inputBg,
                            borderColor: themeColors.inputBorder,
                            color: themeColors.textPrimary
                        }]}
                        value={scoreNotes}
                        onChangeText={setScoreNotes}
                        placeholder="Add notes (optional)"
                        placeholderTextColor={themeColors.textMuted}
                        multiline
                    />
                </View>

                {/* History Section */}
                {scores.length > 0 && (
                    <View style={[styles.historySection, { backgroundColor: themeColors.bgSecondary }]}>
                        <Text style={[styles.scoreSectionTitle, { color: themeColors.textPrimary }]}>
                            Previous Attempts
                        </Text>
                        {scores.slice(0, 5).map((score, index) => (
                            <View
                                key={score.id}
                                style={[
                                    styles.historyItem,
                                    bestScore?.id === score.id && styles.historyItemBest
                                ]}
                            >
                                <View style={styles.historyItemLeft}>
                                    <Text style={[styles.historyScore, { color: themeColors.textPrimary }]}>
                                        {formatScore(score)}
                                    </Text>
                                    <Text style={[styles.historyDate, { color: themeColors.textMuted }]}>
                                        {new Date(score.completed_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                {bestScore?.id === score.id && (
                                    <View style={styles.bestBadge}>
                                        <Feather name="award" size={12} color="#c9a227" />
                                        <Text style={styles.bestBadgeText}>PR</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Complete Workout Button */}
                <Pressable
                    style={[
                        styles.completeButton,
                        workoutCompleted
                            ? { backgroundColor: colors.success }
                            : { backgroundColor: userColors.accent_color }
                    ]}
                    onPress={completeWorkout}
                    disabled={workoutCompleted}
                >
                    <Feather
                        name={workoutCompleted ? 'check-circle' : 'check'}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.completeButtonText}>
                        {workoutCompleted ? 'Completed!' : 'Complete Workout'}
                    </Text>
                </Pressable>

                {/* Done Button */}
                {isComplete && (
                    <Pressable
                        style={[styles.doneButton, { backgroundColor: themeColors.bgSecondary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.doneButtonText, { color: themeColors.textPrimary }]}>Go Back</Text>
                    </Pressable>
                )}
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    titleBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        gap: spacing.sm,
    },
    backButton: {
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleInfo: {
        flex: 1,
        alignItems: 'center',
    },
    titleText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    subtitleText: {
        fontSize: typography.sizes.xs,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.sm,
    },
    timerContainer: {
        borderRadius: radii.lg,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    timerLabel: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
        letterSpacing: 1,
        marginBottom: spacing.xs,
    },
    timerText: {
        fontSize: 72,
        fontWeight: typography.weights.bold,
        color: '#fff',
        fontVariant: ['tabular-nums'],
    },
    timerCap: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    timerControls: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    timerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        minWidth: 120,
        minHeight: MIN_TOUCH_TARGET,
    },
    startBtn: {
        backgroundColor: colors.success,
    },
    pauseBtn: {
        backgroundColor: '#c9a227',
    },
    resetBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        minWidth: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.md,
    },
    timerBtnText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    completeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.md,
    },
    completeText: {
        color: '#fff',
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    workoutCard: {
        borderRadius: radii.lg,
        paddingTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        marginBottom: spacing.md,
    },
    workoutFormat: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
    },
    workoutTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.md,
    },
    workoutDescription: {
        fontSize: typography.sizes.base,
        lineHeight: 20,
    },
    rxContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    rxBox: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.sm,
        borderRadius: radii.sm,
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
        fontWeight: typography.weights.medium,
    },
    rxValue: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        minHeight: MIN_TOUCH_TARGET,
        marginBottom: spacing.sm,
    },
    completeButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    doneButton: {
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        minHeight: MIN_TOUCH_TARGET,
    },
    doneButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.sizes.base,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
    },
    errorText: {
        fontSize: typography.sizes.base,
    },
    button: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        minHeight: MIN_TOUCH_TARGET,
    },
    buttonText: {
        color: '#fff',
        fontWeight: typography.weights.semibold,
    },
    introOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    introNumber: {
        fontSize: 200,
        fontWeight: typography.weights.bold,
        color: '#fff',
    },
    // Score input styles
    scoreSection: {
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    scoreSectionTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.md,
    },
    scoreInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    scoreInputGroup: {
        alignItems: 'center',
    },
    scoreInputLabel: {
        fontSize: typography.sizes.sm,
        marginBottom: spacing.xs,
    },
    scoreInput: {
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        textAlign: 'center',
        minWidth: 80,
    },
    scorePlus: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.sm,
    },
    scoreNotesInput: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        fontSize: typography.sizes.base,
        minHeight: 60,
    },
    // History styles
    historySection: {
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    historyItemBest: {
        backgroundColor: 'rgba(201, 162, 39, 0.1)',
        marginHorizontal: -spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
    },
    historyItemLeft: {},
    historyScore: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    historyDate: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    bestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(201, 162, 39, 0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
    },
    bestBadgeText: {
        color: '#c9a227',
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.semibold,
    },
});
