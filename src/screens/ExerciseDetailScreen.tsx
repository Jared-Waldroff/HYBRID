import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useExercises } from '../hooks/useExercises';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ScreenLayout from '../components/ScreenLayout';

const { width } = Dimensions.get('window');

export default function ExerciseDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { exerciseId, exerciseName } = route.params as { exerciseId: string; exerciseName: string };
    const { themeColors } = useTheme();
    const { getExerciseById, getExerciseHistory } = useExercises();
    const { user } = useAuth();

    const [exercise, setExercise] = useState<any>(null);
    const [stats, setStats] = useState<any>({ pr: 0, sessions: 0, totalReps: 0, averageWeight: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [exerciseId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch exercise details
            const { data: exerciseData, error: exError } = await getExerciseById(exerciseId);
            if (exError) throw new Error(exError);
            if (!exerciseData) {
                setError('Exercise not found');
                setLoading(false);
                return;
            }

            setExercise(exerciseData);

            // Fetch exercise history
            const { data: historyData } = await getExerciseHistory(exerciseId, 50);
            if (historyData && historyData.length > 0) {
                setHistory(historyData);

                // Calculate stats from history
                const weights = historyData.map(h => parseFloat(h.weight) || 0);
                const reps = historyData.map(h => parseInt(h.reps) || 0);
                const uniqueDates = new Set(historyData.map(h => new Date(h.completed_at).toDateString()));

                setStats({
                    pr: Math.max(...weights, 0),
                    sessions: uniqueDates.size,
                    totalReps: reps.reduce((a, b) => a + b, 0),
                    averageWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
                });
            }
        } catch (err: any) {
            console.error('Error loading exercise:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    // Simple bar chart for progress visualization
    const renderProgressBars = () => {
        if (history.length === 0) return null;

        // Group by date and get max weight for each day (last 10 sessions)
        const byDate: { [key: string]: number } = {};
        history.forEach(h => {
            const date = new Date(h.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const weight = parseFloat(h.weight) || 0;
            if (!byDate[date] || weight > byDate[date]) {
                byDate[date] = weight;
            }
        });

        const entries = Object.entries(byDate).reverse().slice(-8);
        const maxWeight = Math.max(...entries.map(([_, w]) => w), 1);

        return (
            <View style={styles.chartContainer}>
                <View style={styles.barsContainer}>
                    {entries.map(([date, weight], index) => (
                        <View key={index} style={styles.barWrapper}>
                            <View style={styles.barLabelTop}>
                                <Text style={[styles.barValue, { color: themeColors.textPrimary }]}>
                                    {weight}
                                </Text>
                            </View>
                            <View style={[styles.barBackground, { backgroundColor: themeColors.inputBg }]}>
                                <View
                                    style={[
                                        styles.barFill,
                                        { height: `${(weight / maxWeight) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.barLabel, { color: themeColors.textMuted }]}>{date.split(' ')[0]}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <ScreenLayout showBack title={exerciseName || 'Loading...'}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={themeColors.textPrimary} />
                    <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                        Loading exercise data...
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    if (error || !exercise) {
        return (
            <ScreenLayout showBack title="Error">
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color="#ef4444" />
                    <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
                        {error || 'Exercise not found'}
                    </Text>
                    <Pressable style={styles.errorBtn} onPress={handleBack}>
                        <Text style={styles.errorBtnText}>Go Back</Text>
                    </Pressable>
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout showBack title={exercise.name}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Progress Chart */}
                <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                        Progress Over Time
                    </Text>
                    {history.length > 0 ? (
                        renderProgressBars()
                    ) : (
                        <View style={styles.noData}>
                            <Feather name="bar-chart-2" size={32} color={themeColors.textMuted} />
                            <Text style={[styles.noDataText, { color: themeColors.textSecondary }]}>
                                No data yet. Complete some sets to see your progress!
                            </Text>
                        </View>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Personal Record</Text>
                        <Text style={[styles.statValue, styles.prValue]}>{stats.pr} lbs</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Sessions</Text>
                        <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.sessions}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Total Reps</Text>
                        <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.totalReps}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Avg Weight</Text>
                        <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{Math.round(stats.averageWeight)} lbs</Text>
                    </View>
                </View>

                {/* Recent History */}
                <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                        Recent History
                    </Text>
                    {history.length > 0 ? (
                        <View style={styles.historyList}>
                            {history.slice(0, 15).map((h, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.historyRow,
                                        i < history.slice(0, 15).length - 1 && { borderBottomColor: themeColors.glassBorder, borderBottomWidth: 1 },
                                    ]}
                                >
                                    <View style={styles.historyLeft}>
                                        <Text style={[styles.historyDate, { color: themeColors.textPrimary }]}>
                                            {new Date(h.completed_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </Text>
                                        <Text style={[styles.historyYear, { color: themeColors.textMuted }]}>
                                            {new Date(h.completed_at).getFullYear()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyRight}>
                                        <Text style={[styles.historyWeight, { color: '#c9a227' }]}>
                                            {h.weight} lbs
                                        </Text>
                                        <Text style={[styles.historyReps, { color: themeColors.textSecondary }]}>
                                            × {h.reps} reps
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noData}>
                            <Text style={[styles.noDataText, { color: themeColors.textSecondary }]}>
                                No history yet
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 24,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    errorBtn: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    errorBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    chartContainer: {
        height: 160,
    },
    barsContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: 24,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    barLabelTop: {
        height: 20,
        justifyContent: 'flex-end',
    },
    barValue: {
        fontSize: 10,
        fontWeight: '600',
    },
    barBackground: {
        width: '80%',
        height: 100,
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    barFill: {
        width: '100%',
        backgroundColor: '#c9a227',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 9,
        marginTop: 4,
    },
    noData: {
        paddingVertical: 32,
        alignItems: 'center',
        gap: 12,
    },
    noDataText: {
        fontSize: 14,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: (width - 32 - 12) / 2,
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    prValue: {
        color: '#c9a227',
    },
    historyList: {},
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    historyDate: {
        fontSize: 14,
        fontWeight: '500',
    },
    historyYear: {
        fontSize: 11,
    },
    historyRight: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    historyWeight: {
        fontSize: 16,
        fontWeight: '600',
    },
    historyReps: {
        fontSize: 12,
    },
});
