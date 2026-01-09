import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useWorkouts } from '../hooks/useWorkouts';
import ScreenLayout from '../components/ScreenLayout';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
    const navigation = useNavigation();
    const { themeColors } = useTheme();
    const { workouts, loading } = useWorkouts();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

    // Generate calendar days for the current month
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month padding
        const prevMonth = new Date(year, month, 0);
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonth.getDate() - i),
                isCurrentMonth: false
            });
        }

        // Current month
        for (let i = 1; i <= totalDays; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding to fill 6 rows
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [currentMonth]);

    // Group workouts by date
    const workoutsByDate = useMemo(() => {
        const map: { [key: string]: typeof workouts } = {};
        workouts.forEach(w => {
            if (!map[w.scheduled_date]) {
                map[w.scheduled_date] = [];
            }
            map[w.scheduled_date].push(w);
        });
        return map;
    }, [workouts]);

    // Stats for current month
    const monthStats = useMemo(() => {
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();

        const daysWithWorkouts = Object.keys(workoutsByDate).filter(date => {
            const d = new Date(date);
            return d.getMonth() === month && d.getFullYear() === year;
        }).length;

        const completedWorkouts = workouts.filter(w => {
            const d = new Date(w.scheduled_date);
            return d.getMonth() === month && d.getFullYear() === year && w.is_completed;
        }).length;

        return { daysWithWorkouts, completedWorkouts };
    }, [workoutsByDate, workouts, currentMonth]);

    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const navigateMonth = async (direction: number) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const navigateYear = async (direction: number) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMonth = new Date(currentMonth);
        newMonth.setFullYear(newMonth.getFullYear() + direction);
        setCurrentMonth(newMonth);
    };

    const handleDayPress = async (date: Date) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to Home tab with the selected date (add timestamp to force re-trigger)
        (navigation as any).navigate('Main', {
            screen: 'Home',
            params: { selectedDate: formatDateKey(date), timestamp: Date.now() }
        });
    };

    const toggleViewMode = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewMode(viewMode === 'month' ? 'year' : 'month');
    };

    if (loading) {
        return (
            <ScreenLayout>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={themeColors.textPrimary} />
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* View Toggle */}
                <View style={styles.toggleContainer}>
                    <Pressable
                        style={[
                            styles.toggleBtn,
                            viewMode === 'month' && styles.toggleBtnActive,
                            { borderColor: themeColors.glassBorder },
                        ]}
                        onPress={() => { setViewMode('month'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                        <Feather name="calendar" size={16} color={viewMode === 'month' ? '#c9a227' : themeColors.textSecondary} />
                        <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
                            Month
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.toggleBtn,
                            viewMode === 'year' && styles.toggleBtnActive,
                            { borderColor: themeColors.glassBorder },
                        ]}
                        onPress={() => { setViewMode('year'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                        <Feather name="grid" size={16} color={viewMode === 'year' ? '#c9a227' : themeColors.textSecondary} />
                        <Text style={[styles.toggleText, viewMode === 'year' && styles.toggleTextActive]}>
                            Year
                        </Text>
                    </Pressable>
                </View>

                {viewMode === 'month' ? (
                    <>
                        {/* Month View Card */}
                        <View style={[styles.calendarCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                            {/* Header Navigation */}
                            <View style={styles.calendarHeader}>
                                <Pressable style={styles.navBtn} onPress={() => navigateMonth(-1)}>
                                    <Feather name="chevron-left" size={24} color={themeColors.textPrimary} />
                                </Pressable>
                                <Text style={[styles.monthTitle, { color: themeColors.textPrimary }]}>
                                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </Text>
                                <Pressable style={styles.navBtn} onPress={() => navigateMonth(1)}>
                                    <Feather name="chevron-right" size={24} color={themeColors.textPrimary} />
                                </Pressable>
                            </View>

                            {/* Weekday Headers */}
                            <View style={styles.weekdayRow}>
                                {DAY_NAMES.map(day => (
                                    <View key={day} style={styles.weekdayCell}>
                                        <Text style={[styles.weekdayText, { color: themeColors.textSecondary }]}>{day}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Calendar Grid */}
                            <View style={styles.calendarGrid}>
                                {calendarDays.map((day, index) => {
                                    const dateKey = formatDateKey(day.date);
                                    const dayWorkouts = workoutsByDate[dateKey] || [];
                                    const hasWorkouts = dayWorkouts.length > 0;
                                    const isTodayDate = isToday(day.date);

                                    return (
                                        <Pressable
                                            key={index}
                                            style={[
                                                styles.dayCell,
                                                isTodayDate && styles.todayCell,
                                            ]}
                                            onPress={() => handleDayPress(day.date)}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayText,
                                                    { color: day.isCurrentMonth ? themeColors.textPrimary : themeColors.textMuted },
                                                    isTodayDate && styles.todayText,
                                                ]}
                                            >
                                                {day.date.getDate()}
                                            </Text>
                                            {hasWorkouts && (
                                                <View style={styles.dotsRow}>
                                                    {dayWorkouts.slice(0, 3).map((w, i) => (
                                                        <View
                                                            key={i}
                                                            style={[
                                                                styles.workoutDot,
                                                                { backgroundColor: w.color || '#c9a227' },
                                                            ]}
                                                        />
                                                    ))}
                                                </View>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Stats Legend */}
                        <View style={[styles.legend, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                            <Text style={[styles.legendTitle, { color: themeColors.textPrimary }]}>This Month</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: '#c9a227' }]}>{monthStats.daysWithWorkouts}</Text>
                                    <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Workout Days</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: '#10b981' }]}>{monthStats.completedWorkouts}</Text>
                                    <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Completed</Text>
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    /* Year View */
                    <View style={[styles.calendarCard, styles.yearCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        {/* Year Header */}
                        <View style={styles.calendarHeader}>
                            <Pressable style={styles.navBtn} onPress={() => navigateYear(-1)}>
                                <Feather name="chevron-left" size={24} color={themeColors.textPrimary} />
                            </Pressable>
                            <Text style={[styles.monthTitle, { color: themeColors.textPrimary }]}>
                                {currentMonth.getFullYear()}
                            </Text>
                            <Pressable style={styles.navBtn} onPress={() => navigateYear(1)}>
                                <Feather name="chevron-right" size={24} color={themeColors.textPrimary} />
                            </Pressable>
                        </View>

                        {/* Year Grid - 12 mini months */}
                        <View style={styles.yearGrid}>
                            {MONTH_NAMES.map((monthName, monthIndex) => {
                                const monthWorkouts = workouts.filter(w => {
                                    const d = new Date(w.scheduled_date);
                                    return d.getMonth() === monthIndex && d.getFullYear() === currentMonth.getFullYear();
                                });
                                const workoutDays = new Set(monthWorkouts.map(w => new Date(w.scheduled_date).getDate()));

                                return (
                                    <Pressable
                                        key={monthIndex}
                                        style={[styles.miniMonth, { borderColor: themeColors.glassBorder }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
                                            setViewMode('month');
                                        }}
                                    >
                                        <Text style={[styles.miniMonthTitle, { color: themeColors.textPrimary }]}>
                                            {monthName.slice(0, 3)}
                                        </Text>
                                        <View style={styles.miniGrid}>
                                            {Array.from({ length: new Date(currentMonth.getFullYear(), monthIndex + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                                                <View
                                                    key={day}
                                                    style={[
                                                        styles.miniDay,
                                                        workoutDays.has(day) && styles.miniDayActive,
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                        <Text style={[styles.miniMonthCount, { color: themeColors.textSecondary }]}>
                                            {monthWorkouts.length} workouts
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    toggleBtnActive: {
        backgroundColor: 'rgba(201, 162, 39, 0.15)',
    },
    toggleText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    toggleTextActive: {
        color: '#c9a227',
        fontWeight: '600',
    },
    calendarCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    navBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '500',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },
    todayCell: {
        backgroundColor: 'rgba(201, 162, 39, 0.2)',
        borderRadius: 8,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    todayText: {
        color: '#c9a227',
        fontWeight: '700',
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
    },
    workoutDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    legend: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    yearGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        flex: 1,
    },
    yearCard: {
        flex: 1,
        marginBottom: 0,
    },
    miniMonth: {
        width: '30%',
        flexGrow: 1,
        borderRadius: 8,
        borderWidth: 1,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniMonthTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    miniGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center',
        marginBottom: 4,
    },
    miniDay: {
        width: 4,
        height: 4,
        borderRadius: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    miniDayActive: {
        backgroundColor: '#c9a227',
    },
    miniMonthCount: {
        fontSize: 9,
    },
});
