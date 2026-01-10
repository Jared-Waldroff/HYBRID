import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Modal,
    Alert,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useWorkouts } from '../hooks/useWorkouts';
import { useExercises } from '../hooks/useExercises';
import ScreenLayout from '../components/ScreenLayout';

const WORKOUT_COLORS = [
    { name: 'Navy', value: '#1e3a5f' },
    { name: 'Copper', value: '#c9a227' },
    { name: 'Teal', value: '#115e59' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Purple', value: '#6366f1' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Violet', value: '#8b5cf6' },
];

export default function CreateWorkoutScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { themeColors } = useTheme();
    const { createWorkout, workouts, getWorkoutById } = useWorkouts();
    const { exercises, createExercise, fetchExercises } = useExercises();

    const initialDate = (route.params as any)?.date || new Date().toISOString().split('T')[0];

    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date(initialDate + 'T12:00:00'));
    const [color, setColor] = useState(WORKOUT_COLORS[0].value);
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [copiedSets, setCopiedSets] = useState<any>(null);
    const [copiedWorkoutId, setCopiedWorkoutId] = useState<string | null>(null);

    // New exercise creation state
    const [showCreateExercise, setShowCreateExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [newExerciseMuscle, setNewExerciseMuscle] = useState('');
    const [newExerciseDescription, setNewExerciseDescription] = useState('');

    // Group exercises by muscle group for the picker
    const groupedExercises = useMemo(() => {
        if (!exercises) return {};
        const groups: { [key: string]: any[] } = {};
        exercises.forEach(ex => {
            const group = ex.muscle_group || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(ex);
        });
        return groups;
    }, [exercises]);

    // Filter exercises by search
    const filteredExercises = useMemo(() => {
        if (!exerciseSearch.trim()) return exercises || [];
        const query = exerciseSearch.toLowerCase();
        return (exercises || []).filter(ex =>
            ex.name.toLowerCase().includes(query) ||
            ex.muscle_group?.toLowerCase().includes(query)
        );
    }, [exercises, exerciseSearch]);

    // Sorted workouts for "copy previous"
    const sortedWorkouts = useMemo(() => {
        if (!workouts) return [];
        return [...workouts].sort((a, b) =>
            new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
        ).slice(0, 10);
    }, [workouts]);

    const handleBack = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
    };

    const handleColorSelect = async (colorValue: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setColor(colorValue);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const toggleExercise = async (exerciseId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedExerciseIds(prev =>
            prev.includes(exerciseId)
                ? prev.filter(id => id !== exerciseId)
                : [...prev, exerciseId]
        );
    };

    const handleCreateNewExercise = async () => {
        if (!newExerciseName.trim()) {
            Alert.alert('Error', 'Please enter an exercise name');
            return;
        }
        if (!newExerciseMuscle.trim()) {
            Alert.alert('Error', 'Please enter a muscle group');
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);

        try {
            const { data, error } = await createExercise({
                name: newExerciseName.trim(),
                muscle_group: newExerciseMuscle.trim(),
                description: newExerciseDescription.trim() || undefined,
            });

            if (error) throw new Error(error);

            if (data) {
                // Auto-select the new exercise
                setSelectedExerciseIds(prev => [...prev, data.id]);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Refresh exercises list
                await fetchExercises();

                // Reset form and close modal
                setNewExerciseName('');
                setNewExerciseMuscle('');
                setNewExerciseDescription('');
                setShowCreateExercise(false);
            }
        } catch (err) {
            console.error('Error creating exercise:', err);
            Alert.alert('Error', 'Failed to create exercise');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyWorkout = async (workout: any) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const { data, error } = await getWorkoutById(workout.id);
            if (error) throw new Error(error);

            if (data) {
                setName(data.name);
                setColor(data.color || WORKOUT_COLORS[0].value);

                if (data.workout_exercises) {
                    const exerciseIds = data.workout_exercises
                        .map((we: any) => we.exercise?.id)
                        .filter(Boolean);
                    setSelectedExerciseIds(exerciseIds);

                    // Store sets for copying
                    const setsMap: any = {};
                    data.workout_exercises.forEach((we: any) => {
                        const exerciseId = we.exercise?.id;
                        if (exerciseId && we.sets && we.sets.length > 0) {
                            setsMap[exerciseId] = we.sets;
                        }
                    });
                    setCopiedSets(setsMap);
                }

                // Show checkmark on copied workout
                setCopiedWorkoutId(workout.id);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Clear checkmark after 2 seconds
                setTimeout(() => setCopiedWorkoutId(null), 2000);
            }
        } catch (err) {
            console.error('Error copying workout:', err);
            Alert.alert('Error', 'Failed to copy workout');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a workout name');
            return;
        }

        if (selectedExerciseIds.length === 0) {
            Alert.alert('Error', 'Please select at least one exercise');
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);

        try {
            const scheduledDate = date.toISOString().split('T')[0];

            const { error } = await createWorkout(
                { name: name.trim(), scheduled_date: scheduledDate, color },
                selectedExerciseIds,
                copiedSets || {}
            );

            if (error) throw new Error(error);

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to create workout');
        } finally {
            setLoading(false);
        }
    };

    const selectedExercises = (exercises || []).filter(ex => selectedExerciseIds.includes(ex.id));

    return (
        <ScreenLayout hideHeader>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Workout Name */}
                <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Workout Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.textPrimary }]}
                        placeholder="e.g., Push Day, Leg Day"
                        placeholderTextColor={themeColors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />

                    {/* Date Picker */}
                    <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Date</Text>
                    <Pressable
                        style={[styles.dateBtn, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                        onPress={() => { setShowDatePicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                        <Feather name="calendar" size={18} color={themeColors.textSecondary} />
                        <Text style={[styles.dateText, { color: themeColors.textPrimary }]}>
                            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                    </Pressable>

                    {/* Color Picker */}
                    <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Color</Text>
                    <View style={styles.colorRow}>
                        {WORKOUT_COLORS.map(c => (
                            <Pressable
                                key={c.value}
                                style={[
                                    styles.colorBtn,
                                    { backgroundColor: c.value },
                                    color === c.value && styles.colorBtnSelected,
                                ]}
                                onPress={() => handleColorSelect(c.value)}
                            >
                                {color === c.value && (
                                    <Feather name="check" size={16} color="#fff" />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Copy Previous Workout */}
                {sortedWorkouts.length > 0 && (
                    <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Copy Previous</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.copyScroll}>
                            {sortedWorkouts.map(workout => (
                                <Pressable
                                    key={workout.id}
                                    style={[styles.copyCard, { backgroundColor: themeColors.inputBg, borderLeftColor: workout.color || themeColors.textMuted }]}
                                    onPress={() => handleCopyWorkout(workout)}
                                >
                                    {copiedWorkoutId === workout.id && (
                                        <View style={styles.copiedOverlay}>
                                            <View style={styles.copiedBadge}>
                                                <Feather name="check" size={16} color="#fff" />
                                                <Text style={styles.copiedText}>Copied</Text>
                                            </View>
                                        </View>
                                    )}
                                    <Text style={[styles.copyName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                        {workout.name}
                                    </Text>
                                    <Text style={[styles.copyDate, { color: themeColors.textMuted }]}>
                                        {new Date(workout.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Selected Exercises */}
                <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                    <View style={styles.exerciseHeader}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                            Exercises ({selectedExerciseIds.length})
                        </Text>
                        <Pressable
                            style={[styles.addExerciseBtn]}
                            onPress={() => { setShowExercisePicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                            <Feather name="plus" size={18} color="#fff" />
                            <Text style={styles.addExerciseBtnText}>Add</Text>
                        </Pressable>
                    </View>

                    {selectedExercises.length === 0 ? (
                        <Text style={[styles.noExercises, { color: themeColors.textMuted }]}>
                            Tap "Add" to select exercises
                        </Text>
                    ) : (
                        selectedExercises.map((ex, index) => (
                            <View key={ex.id} style={[styles.selectedExercise, { borderBottomColor: themeColors.glassBorder }]}>
                                <View style={styles.exerciseInfo}>
                                    <Text style={[styles.exerciseNumber, { color: themeColors.textMuted }]}>{index + 1}</Text>
                                    <View>
                                        <Text style={[styles.exerciseName, { color: themeColors.textPrimary }]}>{ex.name}</Text>
                                        <Text style={[styles.exerciseMuscle, { color: themeColors.textSecondary }]}>{ex.muscle_group}</Text>
                                    </View>
                                </View>
                                <Pressable onPress={() => toggleExercise(ex.id)} hitSlop={8}>
                                    <Feather name="x" size={20} color={themeColors.textMuted} />
                                </Pressable>
                            </View>
                        ))
                    )}
                </View>

                {/* Create Button */}
                <Pressable
                    style={[styles.createBtn, loading && styles.createBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Feather name="check" size={20} color="#fff" />
                            <Text style={styles.createBtnText}>Create Workout</Text>
                        </>
                    )}
                </Pressable>

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* Date Picker Modal */}
            <Modal visible={showDatePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Select Date</Text>
                            <Pressable onPress={() => setShowDatePicker(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.dateList} showsVerticalScrollIndicator={false}>
                            {Array.from({ length: 30 }, (_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() + i);
                                const isSelected = date.toDateString() === d.toDateString();
                                return (
                                    <Pressable
                                        key={i}
                                        style={[
                                            styles.dateRow,
                                            { borderBottomColor: themeColors.glassBorder },
                                            isSelected && { backgroundColor: 'rgba(201, 162, 39, 0.15)' },
                                        ]}
                                        onPress={() => {
                                            setDate(d);
                                            setShowDatePicker(false);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <View>
                                            <Text style={[styles.dateRowDay, { color: themeColors.textPrimary }]}>
                                                {d.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </Text>
                                            <Text style={[styles.dateRowFull, { color: themeColors.textSecondary }]}>
                                                {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        {isSelected && <Feather name="check" size={20} color="#c9a227" />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Exercise Picker Modal */}
            <Modal visible={showExercisePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Select Exercises</Text>
                            <Pressable onPress={() => setShowExercisePicker(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={[styles.searchBox, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                            <Feather name="search" size={18} color={themeColors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: themeColors.textPrimary }]}
                                placeholder="Search exercises..."
                                placeholderTextColor={themeColors.textMuted}
                                value={exerciseSearch}
                                onChangeText={setExerciseSearch}
                                autoCapitalize="none"
                            />
                        </View>

                        <ScrollView style={styles.exerciseList}>
                            {/* Create New Exercise Button/Form */}
                            {showCreateExercise ? (
                                <View style={[styles.createExerciseForm, { backgroundColor: themeColors.inputBg, borderColor: themeColors.glassBorder }]}>
                                    <Text style={[styles.createExerciseTitle, { color: themeColors.textPrimary }]}>New Exercise</Text>
                                    <TextInput
                                        style={[styles.createExerciseInput, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.inputBorder, color: themeColors.textPrimary }]}
                                        placeholder="Exercise name"
                                        placeholderTextColor={themeColors.textMuted}
                                        value={newExerciseName}
                                        onChangeText={setNewExerciseName}
                                        autoCapitalize="words"
                                    />
                                    <TextInput
                                        style={[styles.createExerciseInput, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.inputBorder, color: themeColors.textPrimary }]}
                                        placeholder="Muscle group (e.g., Chest, Back, Legs)"
                                        placeholderTextColor={themeColors.textMuted}
                                        value={newExerciseMuscle}
                                        onChangeText={setNewExerciseMuscle}
                                        autoCapitalize="words"
                                    />
                                    <TextInput
                                        style={[styles.createExerciseInput, styles.createExerciseTextArea, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.inputBorder, color: themeColors.textPrimary }]}
                                        placeholder="Description (optional) - How to perform this exercise"
                                        placeholderTextColor={themeColors.textMuted}
                                        value={newExerciseDescription}
                                        onChangeText={setNewExerciseDescription}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                    <View style={styles.createExerciseButtons}>
                                        <Pressable
                                            style={[styles.createExerciseCancelBtn, { borderColor: themeColors.inputBorder }]}
                                            onPress={() => { setShowCreateExercise(false); setNewExerciseName(''); setNewExerciseMuscle(''); setNewExerciseDescription(''); }}
                                        >
                                            <Text style={[styles.createExerciseCancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.createExerciseSaveBtn}
                                            onPress={handleCreateNewExercise}
                                            disabled={loading}
                                        >
                                            <Feather name="plus" size={16} color="#fff" />
                                            <Text style={styles.createExerciseSaveText}>{loading ? 'Creating...' : 'Create & Add'}</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.createExerciseBtn, { borderColor: themeColors.glassBorder }]}
                                    onPress={() => { setShowCreateExercise(true); setNewExerciseName(exerciseSearch); }}
                                >
                                    <Feather name="plus-circle" size={20} color="#c9a227" />
                                    <Text style={[styles.createExerciseBtnText, { color: '#c9a227' }]}>
                                        {exerciseSearch.trim() ? `Create "${exerciseSearch}"` : 'Create New Exercise'}
                                    </Text>
                                </Pressable>
                            )}

                            {/* Exercise List */}
                            {filteredExercises.map(ex => (
                                <Pressable
                                    key={ex.id}
                                    style={[
                                        styles.exerciseRow,
                                        { borderBottomColor: themeColors.glassBorder },
                                        selectedExerciseIds.includes(ex.id) && { backgroundColor: 'rgba(201, 162, 39, 0.1)' },
                                    ]}
                                    onPress={() => toggleExercise(ex.id)}
                                >
                                    <View style={styles.exerciseRowInfo}>
                                        <Text style={[styles.exerciseRowName, { color: themeColors.textPrimary }]}>{ex.name}</Text>
                                        <Text style={[styles.exerciseRowMuscle, { color: themeColors.textSecondary }]}>{ex.muscle_group}</Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: themeColors.textMuted },
                                        selectedExerciseIds.includes(ex.id) && styles.checkboxChecked,
                                    ]}>
                                        {selectedExerciseIds.includes(ex.id) && (
                                            <Feather name="check" size={14} color="#fff" />
                                        )}
                                    </View>
                                </Pressable>
                            ))}

                            {filteredExercises.length === 0 && !showCreateExercise && (
                                <View style={styles.noResultsContainer}>
                                    <Feather name="search" size={40} color={themeColors.textMuted} />
                                    <Text style={[styles.noResultsText, { color: themeColors.textMuted }]}>
                                        No exercises found
                                    </Text>
                                    <Text style={[styles.noResultsSubtext, { color: themeColors.textTertiary }]}>
                                        Tap "Create New Exercise" above to add one
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <Pressable
                            style={styles.doneBtn}
                            onPress={() => setShowExercisePicker(false)}
                        >
                            <Text style={styles.doneBtnText}>Done ({selectedExerciseIds.length} selected)</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ScreenLayout provides footer */}
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
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 10,
    },
    dateText: {
        fontSize: 16,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    colorBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorBtnSelected: {
        borderWidth: 3,
        borderColor: '#fff',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    copyScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    copyCard: {
        width: 120,
        padding: 10,
        borderRadius: 10,
        borderLeftWidth: 3,
        marginRight: 10,
    },
    copyName: {
        fontSize: 13,
        fontWeight: '600',
    },
    copyDate: {
        fontSize: 11,
        marginTop: 4,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addExerciseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    addExerciseBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    noExercises: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 24,
    },
    selectedExercise: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    exerciseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    exerciseNumber: {
        fontSize: 14,
        fontWeight: '600',
        width: 24,
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: '500',
    },
    exerciseMuscle: {
        fontSize: 12,
        marginTop: 2,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10b981',
        height: 56,
        borderRadius: 16,
    },
    createBtnDisabled: {
        opacity: 0.6,
    },
    createBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    exerciseList: {
        maxHeight: 400,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    exerciseRowInfo: {},
    exerciseRowName: {
        fontSize: 15,
        fontWeight: '500',
    },
    exerciseRowMuscle: {
        fontSize: 12,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#c9a227',
        borderColor: '#c9a227',
    },
    doneBtn: {
        backgroundColor: '#1e3a5f',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dateList: {
        maxHeight: 400,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    dateRowDay: {
        fontSize: 16,
        fontWeight: '600',
    },
    dateRowFull: {
        fontSize: 13,
        marginTop: 2,
    },
    copiedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    copiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    copiedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    createExerciseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    createExerciseBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    createExerciseForm: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    createExerciseTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    createExerciseInput: {
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    createExerciseTextArea: {
        height: 80,
        paddingTop: 12,
    },
    createExerciseButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    createExerciseCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createExerciseCancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
    createExerciseSaveBtn: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#c9a227',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    createExerciseSaveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    noResultsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    noResultsText: {
        fontSize: 16,
        fontWeight: '500',
    },
    noResultsSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
});
