import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    SectionList,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { useWorkouts } from '../hooks/useWorkouts';
import { RootStackParamList, MainTabParamList } from '../navigation';
import WorkoutCard from '../components/WorkoutCard';
import CrossFitWorkoutCard from '../components/CrossFitWorkoutCard';
import ScreenLayout from '../components/ScreenLayout';
import { getRandomCrossFitWorkout } from '../data/crossfitWorkouts';
import { colors, spacing, radii, typography, MIN_TOUCH_TARGET } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type HomeRouteProp = RouteProp<MainTabParamList, 'Home'>;

// Helper functions (unchanged)
const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayKey = () => formatDateKey(new Date());

const formatDisplayDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Generate dates starting from a given date going forward
const generateDatesFromToday = (daysBack: number = 0, daysForward: number = 14): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -daysBack; i <= daysForward; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }
    return dates;
};

// DaySection interfaces and component
interface DaySectionProps {
    date: Date;
    workouts: any[];
    onCreateWorkout: () => void;
    onCreateCFWorkout: (dateKey: string) => void;
    onRefresh: () => void;
    onDeleteWorkout: (id: string) => void;
}

function DaySection({ date, workouts, onCreateWorkout, onCreateCFWorkout, onRefresh, onDeleteWorkout }: DaySectionProps) {
    const { themeColors, showCF } = useTheme();
    const dateKey = formatDateKey(date);
    const isToday = dateKey === getTodayKey();
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

    return (
        <View style={[styles.daySection, isPast && styles.pastDay]}>
            <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                <View>
                    <Text style={[styles.dayTitle, { color: themeColors.textPrimary }]}>
                        {formatDisplayDate(date)}
                    </Text>
                    <Text style={[styles.dayDate, { color: themeColors.textTertiary }]}>
                        {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </Text>
                </View>
                <View style={styles.headerButtons}>
                    {showCF && (
                        <Pressable
                            style={[styles.cfButton]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onCreateCFWorkout(dateKey);
                            }}
                        >
                            <Feather name="zap" size={14} color="#fff" />
                            <Text style={styles.cfButtonText}>CF</Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={[styles.addButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onCreateWorkout();
                        }}
                    >
                        <Feather name="plus" size={16} color={themeColors.textPrimary} />
                        <Text style={[styles.addButtonText, { color: themeColors.textPrimary }]}>
                            Add Workout
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.dayContent}>
                {workouts.length > 0 ? (
                    workouts.map((workout) => (
                        <WorkoutCard key={workout.id} workout={workout} onDelete={() => onDeleteWorkout(workout.id)} />
                    ))
                ) : (
                    <View style={[styles.emptyDay, { backgroundColor: themeColors.inputBg }]}>
                        <Feather name="calendar" size={24} color={themeColors.textMuted} />
                        <Text style={[styles.emptyDayText, { color: themeColors.textMuted }]}>
                            Rest Day
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<HomeRouteProp>();
    const { themeColors, colors: userColors, showCF, theme } = useTheme();
    const { workouts, loading, fetchWorkouts, createWorkout, updateWorkout, deleteWorkout } = useWorkouts();
    // Start with today at index 0, show 14 days ahead (no past dates initially)
    const [dates, setDates] = useState<Date[]>(() => generateDatesFromToday(0, 14));
    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef<any>(null);

    // Transform dates into sections with workout data
    const sections = useMemo(() => {
        return dates.map(date => {
            const dateStr = formatDateKey(date);
            const dayWorkouts = workouts.filter((w: any) => w.scheduled_date === dateStr);
            return {
                date,
                dateKey: dateStr,
                data: dayWorkouts.length > 0 ? dayWorkouts : [{ id: `empty-${dateStr}`, isEmpty: true }],
            };
        });
    }, [dates, workouts]);

    // Handle selectedDate from calendar navigation
    useEffect(() => {
        const selectedDate = route.params?.selectedDate;
        if (selectedDate) {
            const targetDate = new Date(selectedDate + 'T12:00:00');
            // Put selected date at index 0 (TOP) so it's immediately visible
            // User can use "Load Earlier Days" button to see previous dates
            // and scroll down to see future dates
            const newDates: Date[] = [];
            for (let i = 0; i <= 28; i++) {
                const d = new Date(targetDate);
                d.setDate(d.getDate() + i);
                newDates.push(d);
            }
            setDates(newDates);
        }
    }, [route.params?.selectedDate, route.params?.timestamp]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchWorkouts();
        setRefreshing(false);
    }, [fetchWorkouts]);

    // Refresh workouts when screen comes into focus (e.g., after creating a workout)
    useFocusEffect(
        useCallback(() => {
            fetchWorkouts();
        }, [fetchWorkouts])
    );

    const handleCreateWorkout = (dateKey: string) => {
        navigation.navigate('CreateWorkout', { date: dateKey });
    };

    const handleCreateCFWorkout = async (dateKey: string) => {
        const cfWorkout = getRandomCrossFitWorkout();

        // Store CF workout data as JSON for custom rendering
        const cfData = JSON.stringify({
            isCrossFit: true,
            id: cfWorkout.id,
            year: cfWorkout.year,
            name: cfWorkout.name,
            subtitle: cfWorkout.subtitle,
            format: cfWorkout.format,
            description: cfWorkout.description,
            rxWeights: cfWorkout.rxWeights,
        });

        await createWorkout(
            {
                name: `CF ${cfWorkout.name}`,
                scheduled_date: dateKey,
                color: '#1e3a5f', // Navy blue for CrossFit
                notes: cfData,
            },
            []
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleRerollCFWorkout = async (workoutId: string, cfData: string) => {
        // Card already updated UI instantly - just sync to database in background
        const parsed = JSON.parse(cfData);
        await updateWorkout(workoutId, {
            name: `CF ${parsed.name}`,
            notes: cfData,
        });
    };

    const handleDeleteCFWorkout = async (workoutId: string) => {
        await deleteWorkout(workoutId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const loadMoreDates = (direction: 'past' | 'future') => {
        setDates((prevDates) => {
            const newDates = [...prevDates];

            if (direction === 'past') {
                const firstDate = new Date(prevDates[0]);
                // Add dates in order so earlier dates are at the top
                for (let i = 1; i <= 14; i++) {
                    const d = new Date(firstDate);
                    d.setDate(d.getDate() - i);
                    newDates.unshift(d);
                }
            } else {
                const lastDate = new Date(prevDates[prevDates.length - 1]);
                for (let i = 1; i <= 14; i++) {
                    const d = new Date(lastDate);
                    d.setDate(d.getDate() + i);
                    newDates.push(d);
                }
            }

            return newDates;
        });
    };

    const scrollToToday = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Reset dates to start from today (today at index 0)
        setDates(generateDatesFromToday(0, 14));
        // Scroll to top (first section) after state updates
        setTimeout(() => {
            flatListRef.current?.scrollToLocation({
                sectionIndex: 0,
                itemIndex: 0,
                animated: true,
                viewPosition: 0,
            });
        }, 100);
    };

    if (loading && workouts.length === 0) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                    <Text style={[styles.loadingText, { color: themeColors.textTertiary }]}>
                        Loading workouts...
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout>

            <SectionList
                ref={flatListRef}
                sections={sections}
                keyExtractor={(item: any) => item.id}
                renderSectionHeader={({ section }: any) => {
                    const isToday = section.dateKey === getTodayKey();
                    const isPast = section.date < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                        <View style={[
                            styles.stickyDayHeader,
                            { backgroundColor: themeColors.bgPrimary, borderBottomColor: themeColors.glassBorder },
                            isPast && styles.pastDayHeader,
                        ]}>
                            <View>
                                <Text style={[styles.dayTitle, { color: themeColors.textPrimary }]}>
                                    {formatDisplayDate(section.date)}
                                </Text>
                                <Text style={[styles.dayDate, { color: themeColors.textTertiary }]}>
                                    {section.date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </View>
                            <View style={styles.headerButtons}>
                                {showCF && (
                                    <Pressable
                                        style={[styles.cfButton, { backgroundColor: theme === 'dark' ? '#0a1929' : '#1e3a5f', borderColor: '#c9a227', borderWidth: 1 }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            handleCreateCFWorkout(section.dateKey);
                                        }}
                                    >
                                        <Text style={[styles.cfButtonText, { color: '#c9a227' }]}>CF</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    style={[styles.addButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        handleCreateWorkout(section.dateKey);
                                    }}
                                >
                                    <Text style={[styles.addButtonText, { color: themeColors.textPrimary }]}>
                                        + Add Workout
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                }}
                renderItem={({ item, section }: any) => {
                    const isPast = section.date < new Date(new Date().setHours(0, 0, 0, 0));
                    if (item.isEmpty) {
                        return (
                            <View style={[styles.emptyDay, { backgroundColor: themeColors.inputBg }, isPast && styles.pastItem]}>
                                <Feather name="calendar" size={24} color={themeColors.textMuted} />
                                <Text style={[styles.emptyDayText, { color: themeColors.textMuted }]}>
                                    Rest Day
                                </Text>
                            </View>
                        );
                    }

                    // Check if this is a CrossFit workout
                    let isCFWorkout = false;
                    try {
                        if (item.notes) {
                            const parsed = JSON.parse(item.notes);
                            isCFWorkout = parsed.isCrossFit === true;
                        }
                    } catch (e) { }

                    if (isCFWorkout) {
                        return (
                            <View style={[styles.cardWrapper, isPast && styles.pastItem]}>
                                <CrossFitWorkoutCard
                                    workout={item}
                                    onReroll={(cfData) => handleRerollCFWorkout(item.id, cfData)}
                                    onDelete={() => handleDeleteCFWorkout(item.id)}
                                />
                            </View>
                        );
                    }

                    return (
                        <View style={[styles.cardWrapper, isPast && styles.pastItem]}>
                            <WorkoutCard workout={item} onDelete={() => deleteWorkout(item.id)} />
                        </View>
                    );
                }}
                stickySectionHeadersEnabled={true}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={userColors.accent_color}
                    />
                }
                onScrollToIndexFailed={() => { }}
                ListHeaderComponent={
                    <Pressable
                        style={[styles.loadMoreButton, { backgroundColor: themeColors.inputBg }]}
                        onPress={() => loadMoreDates('past')}
                    >
                        <Text style={[styles.loadMoreText, { color: themeColors.textSecondary }]}>
                            Load Earlier Days
                        </Text>
                    </Pressable>
                }
                ListFooterComponent={
                    <Pressable
                        style={[styles.loadMoreButton, { backgroundColor: themeColors.inputBg }]}
                        onPress={() => loadMoreDates('future')}
                    >
                        <Text style={[styles.loadMoreText, { color: themeColors.textSecondary }]}>
                            Load More Days
                        </Text>
                    </Pressable>
                }
            />

            {/* Floating Today Button */}
            <Pressable
                style={[styles.todayButton, { backgroundColor: userColors.accent_color }]}
                onPress={scrollToToday}
            >
                <Feather name="calendar" size={18} color="#fff" />
                <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyDayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    pastDayHeader: {
        // Empty - don't dim the sticky header itself to avoid translucency
    },
    pastItem: {
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerButton: {
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
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
    listContent: {
        paddingBottom: spacing.md,
    },
    daySection: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
    },
    pastDay: {
        opacity: 0.5,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    dayHeaderToday: {
        // Could add special styling for today
    },
    dayTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    dayDate: {
        fontSize: typography.sizes.sm,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        minHeight: MIN_TOUCH_TARGET,
    },
    addButtonText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    dayContent: {
        gap: spacing.sm,
    },
    emptyDay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radii.md,
    },
    emptyDayText: {
        fontSize: typography.sizes.sm,
    },
    loadMoreButton: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
        minHeight: MIN_TOUCH_TARGET,
        justifyContent: 'center',
    },
    loadMoreText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    todayButton: {
        position: 'absolute',
        bottom: spacing.lg,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
        minHeight: MIN_TOUCH_TARGET,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    todayButtonText: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        backgroundColor: '#0a1929',
    },
    cfButtonText: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.bold,
    },
    cardWrapper: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
});
