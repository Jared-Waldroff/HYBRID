import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    Switch,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useSquadEvents, TrainingWorkout, CreateTrainingWorkoutInput } from '../hooks/useSquadEvents';
import { useExercises } from '../hooks/useExercises';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type ManagePlanRouteProp = RouteProp<RootStackParamList, 'ManageEventPlan'>;

// Event type categories for adaptive forms
type EventCategory = 'running' | 'strength' | 'hyrox' | 'crossfit' | 'endurance' | 'custom';

const getEventCategory = (eventType: string): EventCategory => {
    if (['marathon', 'half_marathon', '5k', '10k', 'trail_running'].includes(eventType)) return 'running';
    if (['powerlifting'].includes(eventType)) return 'strength';
    if (['hyrox'].includes(eventType)) return 'hyrox';
    if (['crossfit'].includes(eventType)) return 'crossfit';
    if (['triathlon', 'cycling', 'swimming'].includes(eventType)) return 'endurance';
    return 'custom';
};

// Workout type options per event category
const WORKOUT_OPTIONS: Record<EventCategory, { id: string; name: string; icon: string }[]> = {
    running: [
        { id: 'easy_run', name: 'Easy Run', icon: 'activity' },
        { id: 'long_run', name: 'Long Run', icon: 'navigation' },
        { id: 'tempo', name: 'Tempo Run', icon: 'zap' },
        { id: 'intervals', name: 'Intervals', icon: 'repeat' },
        { id: 'recovery', name: 'Recovery', icon: 'heart' },
        { id: 'race_pace', name: 'Race Pace', icon: 'flag' },
    ],
    strength: [
        { id: 'squat', name: 'Squat Day', icon: 'trending-up' },
        { id: 'bench', name: 'Bench Day', icon: 'minus' },
        { id: 'deadlift', name: 'Deadlift Day', icon: 'arrow-up' },
        { id: 'accessory', name: 'Accessory', icon: 'layers' },
        { id: 'deload', name: 'Deload', icon: 'sunset' },
    ],
    hyrox: [
        { id: 'running', name: 'Running Segment', icon: 'navigation' },
        { id: 'skierg', name: 'SkiErg', icon: 'activity' },
        { id: 'sled_push', name: 'Sled Push', icon: 'arrow-right' },
        { id: 'sled_pull', name: 'Sled Pull', icon: 'arrow-left' },
        { id: 'burpee_broad', name: 'Burpee Broad Jump', icon: 'chevrons-up' },
        { id: 'rowing', name: 'Rowing', icon: 'align-justify' },
        { id: 'farmers_carry', name: 'Farmers Carry', icon: 'move' },
        { id: 'lunges', name: 'Sandbag Lunges', icon: 'trending-down' },
        { id: 'wall_balls', name: 'Wall Balls', icon: 'target' },
        { id: 'full_sim', name: 'Race Simulation', icon: 'award' },
    ],
    crossfit: [
        { id: 'amrap', name: 'AMRAP', icon: 'repeat' },
        { id: 'emom', name: 'EMOM', icon: 'clock' },
        { id: 'for_time', name: 'For Time', icon: 'zap' },
        { id: 'strength', name: 'Strength', icon: 'trending-up' },
        { id: 'skill', name: 'Skill Work', icon: 'target' },
        { id: 'metcon', name: 'MetCon', icon: 'activity' },
        { id: 'benchmark', name: 'Benchmark', icon: 'award' },
    ],
    endurance: [
        { id: 'swim', name: 'Swim', icon: 'droplet' },
        { id: 'bike', name: 'Bike', icon: 'disc' },
        { id: 'run', name: 'Run', icon: 'navigation' },
        { id: 'brick', name: 'Brick Workout', icon: 'layers' },
        { id: 'zone2', name: 'Zone 2', icon: 'heart' },
        { id: 'threshold', name: 'Threshold', icon: 'zap' },
    ],
    custom: [
        { id: 'distance', name: 'Distance', icon: 'navigation' },
        { id: 'time', name: 'Time-based', icon: 'clock' },
        { id: 'weight', name: 'Weight', icon: 'trending-up' },
        { id: 'reps', name: 'Reps', icon: 'repeat' },
        { id: 'zone', name: 'HR Zone', icon: 'heart' },
        { id: 'custom', name: 'Custom', icon: 'edit-2' },
    ],
};

export default function ManageEventPlanScreen() {
    const navigation = useNavigation();
    const route = useRoute<ManagePlanRouteProp>();
    const { eventId, eventName, eventDate, eventType } = route.params;
    const { themeColors, colors: userColors } = useTheme();
    const { getTrainingPlan, addTrainingWorkout, deleteTrainingWorkout } = useSquadEvents();
    const { exercises, createExercise, fetchExercises } = useExercises();

    const eventCategory = getEventCategory(eventType);
    const workoutOptions = WORKOUT_OPTIONS[eventCategory];

    const [workouts, setWorkouts] = useState<TrainingWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formWorkoutType, setFormWorkoutType] = useState(workoutOptions[0]?.id || 'custom');
    const [formValue, setFormValue] = useState('');
    const [formUnit, setFormUnit] = useState('km');
    const [formDate, setFormDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    // Additional fields for strength/CrossFit
    const [formSets, setFormSets] = useState('');
    const [formReps, setFormReps] = useState('');
    const [formRPE, setFormRPE] = useState('');
    const [formZone, setFormZone] = useState('zone2');

    // Exercise selection state
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
    const [showExercisePicker, setShowExercisePicker] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [showCreateExercise, setShowCreateExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [newExerciseMuscle, setNewExerciseMuscle] = useState('');

    // Filter exercises by search
    const filteredExercises = React.useMemo(() => {
        if (!exerciseSearch.trim()) return exercises || [];
        const query = exerciseSearch.toLowerCase();
        return (exercises || []).filter(ex =>
            ex.name.toLowerCase().includes(query) ||
            ex.muscle_group?.toLowerCase().includes(query)
        );
    }, [exercises, exerciseSearch]);

    // Get selected exercise objects
    const selectedExercises = (exercises || []).filter(ex => selectedExerciseIds.includes(ex.id));

    const toggleExercise = (exerciseId: string) => {
        setSelectedExerciseIds(prev =>
            prev.includes(exerciseId)
                ? prev.filter(id => id !== exerciseId)
                : [...prev, exerciseId]
        );
    };

    const handleCreateNewExercise = async () => {
        if (!newExerciseName.trim() || !newExerciseMuscle.trim()) {
            Alert.alert('Error', 'Please enter exercise name and muscle group');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await createExercise({
                name: newExerciseName.trim(),
                muscle_group: newExerciseMuscle.trim(),
            });

            if (error) throw new Error(error);

            if (data) {
                setSelectedExerciseIds(prev => [...prev, data.id]);
                await fetchExercises();
                setNewExerciseName('');
                setNewExerciseMuscle('');
                setShowCreateExercise(false);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to create exercise');
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        loadPlan();
    }, []);

    const loadPlan = async () => {
        setLoading(true);
        const plan = await getTrainingPlan(eventId);
        // Sort by scheduled date (which effectively means sorted by days_before_event desc)
        setWorkouts(plan);
        setLoading(false);
    };

    const handleDelete = (workoutId: string) => {
        Alert.alert(
            'Delete Workout',
            'Are you sure you want to remove this workout from the plan?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteTrainingWorkout(workoutId);
                        if (error) Alert.alert('Error', error);
                        else loadPlan();
                    }
                }
            ]
        );
    };

    const handleAdd = async () => {
        if (!formName.trim()) {
            Alert.alert('Error', 'Please enter a workout name');
            return;
        }

        // Validate date is before event
        const eventDateObj = new Date(eventDate);
        if (formDate >= eventDateObj) {
            Alert.alert('Error', 'Workout date must be before the event date');
            return;
        }

        setSubmitting(true);

        // Calculate days before event from selected date
        const timeDiff = eventDateObj.getTime() - formDate.getTime();
        const daysBefore = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Map event-specific workout types to generic workout_type
        const getWorkoutType = (): 'distance' | 'time' | 'weight' | 'reps' | 'zone' | 'custom' => {
            if (['easy_run', 'long_run', 'tempo', 'intervals', 'race_pace', 'running', 'swim', 'bike', 'run', 'brick'].includes(formWorkoutType)) return 'distance';
            if (['squat', 'bench', 'deadlift', 'accessory', 'strength'].includes(formWorkoutType)) return 'weight';
            if (['amrap', 'emom', 'for_time', 'metcon', 'benchmark'].includes(formWorkoutType)) return 'time';
            if (['zone2', 'threshold', 'recovery'].includes(formWorkoutType)) return 'zone';
            return 'custom';
        };

        const input: CreateTrainingWorkoutInput = {
            name: formName.trim() || workoutOptions.find(o => o.id === formWorkoutType)?.name || 'Workout',
            description: formDesc.trim() || undefined,
            workout_type: getWorkoutType(),
            target_value: formValue ? parseFloat(formValue) : undefined,
            target_unit: eventCategory === 'running' || eventCategory === 'endurance' ? formUnit :
                eventCategory === 'strength' ? 'kg' : undefined,
            days_before_event: daysBefore,
            color: userColors.accent_color,
            is_required: true,
            order_index: workouts.length,
        };

        const { error } = await addTrainingWorkout(eventId, input);

        if (error) {
            Alert.alert('Error', error);
            setSubmitting(false);
        } else {
            setSubmitting(false);
            setShowAddModal(false);
            loadPlan();
            resetForm();
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormDesc('');
        setFormWorkoutType(workoutOptions[0]?.id || 'custom');
        setFormValue('');
        setFormDate(new Date());
        setFormSets('');
        setFormReps('');
        setFormRPE('');
        setFormZone('zone2');
        // Reset exercise selection
        setSelectedExerciseIds([]);
        setExerciseSearch('');
        setShowCreateExercise(false);
        setNewExerciseName('');
        setNewExerciseMuscle('');
    };

    const renderWorkoutCard = (workout: TrainingWorkout) => (
        <View key={workout.id} style={[styles.card, { backgroundColor: themeColors.bgSecondary }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                    <Feather name={workout.workout_type === 'distance' ? 'map-pin' : 'clock'} size={16} color={userColors.accent_color} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{workout.name}</Text>
                    <Text style={[styles.cardDate, { color: themeColors.textSecondary }]}>
                        {workout.days_before_event} days before event ({workout.scheduled_date})
                    </Text>
                </View>
                <Pressable onPress={() => handleDelete(workout.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={18} color="#ef4444" />
                </Pressable>
            </View>
            {workout.description && (
                <Text style={[styles.cardDesc, { color: themeColors.textSecondary }]}>{workout.description}</Text>
            )}
        </View>
    );

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
                        {eventName}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
                        Date: {new Date(eventDate).toLocaleDateString()}
                    </Text>
                </View>

                {workouts.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                            No workouts in this plan yet.
                        </Text>
                    </View>
                ) : (
                    workouts.map(renderWorkoutCard)
                )}

                <Pressable
                    style={[styles.addBtn, { backgroundColor: userColors.accent_color }]}
                    onPress={() => setShowAddModal(true)}
                >
                    <Feather name="plus" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add Workout</Text>
                </Pressable>
            </ScrollView>

            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.bgPrimary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Add Workout</Text>
                            <Pressable onPress={() => setShowAddModal(false)}>
                                <Feather name="x" size={24} color={themeColors.textPrimary} />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Name</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                    value={formName}
                                    onChangeText={setFormName}
                                    placeholder="e.g. Long Run"
                                    placeholderTextColor={themeColors.textMuted}
                                />
                            </View>

                            {/* Workout Type - Adaptive based on event category */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                    Workout Type
                                </Text>
                                <View style={styles.workoutTypeGrid}>
                                    {workoutOptions.map(opt => (
                                        <Pressable
                                            key={opt.id}
                                            style={[
                                                styles.workoutTypeItem,
                                                { borderColor: themeColors.divider },
                                                formWorkoutType === opt.id && {
                                                    backgroundColor: userColors.accent_color,
                                                    borderColor: userColors.accent_color
                                                }
                                            ]}
                                            onPress={() => setFormWorkoutType(opt.id)}
                                        >
                                            <Feather
                                                name={opt.icon as any}
                                                size={16}
                                                color={formWorkoutType === opt.id ? '#fff' : themeColors.textSecondary}
                                            />
                                            <Text style={[
                                                styles.workoutTypeText,
                                                { color: formWorkoutType === opt.id ? '#fff' : themeColors.textSecondary }
                                            ]} numberOfLines={1}>
                                                {opt.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            {/* Target Value - shows different labels based on category */}
                            {(eventCategory === 'running' || eventCategory === 'endurance') && (
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                            Distance (km)
                                        </Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formValue}
                                            onChangeText={setFormValue}
                                            keyboardType="numeric"
                                            placeholder="e.g. 10"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                </View>
                            )}

                            {eventCategory === 'strength' && (
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Sets</Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formSets}
                                            onChangeText={setFormSets}
                                            keyboardType="numeric"
                                            placeholder="5"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Reps</Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formReps}
                                            onChangeText={setFormReps}
                                            placeholder="5"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>RPE</Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formRPE}
                                            onChangeText={setFormRPE}
                                            keyboardType="numeric"
                                            placeholder="7-8"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                </View>
                            )}

                            {(eventCategory === 'crossfit' || eventCategory === 'hyrox') && (
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                            Duration (min)
                                        </Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formValue}
                                            onChangeText={setFormValue}
                                            keyboardType="numeric"
                                            placeholder="e.g. 20"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                </View>
                            )}

                            {eventCategory === 'custom' && (
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                            Target Value
                                        </Text>
                                        <TextInput
                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                            value={formValue}
                                            onChangeText={setFormValue}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={themeColors.textMuted}
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Workout Date</Text>
                                <Pressable
                                    style={[styles.input, styles.datePickerBtn, { borderColor: themeColors.inputBorder || themeColors.divider }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Feather name="calendar" size={18} color={userColors.accent_color} />
                                    <Text style={[styles.dateText, { color: themeColors.textPrimary }]}>
                                        {formDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={formDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        minimumDate={new Date()}
                                        maximumDate={new Date(eventDate)}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setFormDate(selectedDate);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {/* Exercise Selector */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                    Exercises (Optional)
                                </Text>
                                <Pressable
                                    style={[styles.input, styles.exercisePickerBtn, { borderColor: themeColors.inputBorder || themeColors.divider }]}
                                    onPress={() => setShowExercisePicker(true)}
                                >
                                    <Feather name="plus-circle" size={18} color={userColors.accent_color} />
                                    <Text style={{ color: selectedExerciseIds.length > 0 ? themeColors.textPrimary : themeColors.textMuted }}>
                                        {selectedExerciseIds.length > 0
                                            ? `${selectedExerciseIds.length} exercise${selectedExerciseIds.length > 1 ? 's' : ''} selected`
                                            : 'Add exercises from library'}
                                    </Text>
                                </Pressable>
                                {selectedExercises.length > 0 && (
                                    <View style={styles.selectedExercisesList}>
                                        {selectedExercises.map((ex, index) => (
                                            <View key={ex.id} style={[styles.selectedExerciseChip, { backgroundColor: userColors.accent_color + '20' }]}>
                                                <Text style={[styles.selectedExerciseText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                    {ex.name}
                                                </Text>
                                                <Pressable onPress={() => toggleExercise(ex.id)} hitSlop={8}>
                                                    <Feather name="x" size={14} color={themeColors.textSecondary} />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Description (Optional)</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider, height: 80 }]}
                                    value={formDesc}
                                    onChangeText={setFormDesc}
                                    multiline
                                    placeholder="Details..."
                                    placeholderTextColor={themeColors.textMuted}
                                />
                            </View>

                            <Pressable
                                style={[styles.submitBtn, { backgroundColor: userColors.accent_color }]}
                                onPress={handleAdd}
                                disabled={submitting}
                            >
                                <Text style={styles.submitBtnText}>{submitting ? 'Adding...' : 'Add Workout'}</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Exercise Picker Modal */}
            <Modal visible={showExercisePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.exercisePickerModal, { backgroundColor: themeColors.bgSecondary }]}>
                        <View style={styles.exercisePickerHeader}>
                            <Text style={[styles.exercisePickerTitle, { color: themeColors.textPrimary }]}>Select Exercises</Text>
                            <Pressable onPress={() => setShowExercisePicker(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={[styles.exerciseSearchBox, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder || themeColors.divider }]}>
                            <Feather name="search" size={18} color={themeColors.textSecondary} />
                            <TextInput
                                style={[styles.exerciseSearchInput, { color: themeColors.textPrimary }]}
                                placeholder="Search exercises..."
                                placeholderTextColor={themeColors.textMuted}
                                value={exerciseSearch}
                                onChangeText={setExerciseSearch}
                                autoCapitalize="none"
                            />
                        </View>

                        <ScrollView style={styles.exerciseList}>
                            {/* Create New Exercise */}
                            {showCreateExercise ? (
                                <View style={[styles.createExerciseForm, { backgroundColor: themeColors.inputBg, borderColor: themeColors.divider }]}>
                                    <TextInput
                                        style={[styles.createExerciseInput, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.divider, color: themeColors.textPrimary }]}
                                        placeholder="Exercise name"
                                        placeholderTextColor={themeColors.textMuted}
                                        value={newExerciseName}
                                        onChangeText={setNewExerciseName}
                                        autoCapitalize="words"
                                    />
                                    <TextInput
                                        style={[styles.createExerciseInput, { backgroundColor: themeColors.bgPrimary, borderColor: themeColors.divider, color: themeColors.textPrimary }]}
                                        placeholder="Muscle group (e.g., Chest, Back, Legs)"
                                        placeholderTextColor={themeColors.textMuted}
                                        value={newExerciseMuscle}
                                        onChangeText={setNewExerciseMuscle}
                                        autoCapitalize="words"
                                    />
                                    <View style={styles.createExerciseButtons}>
                                        <Pressable
                                            style={[styles.createExerciseCancelBtn, { borderColor: themeColors.divider }]}
                                            onPress={() => { setShowCreateExercise(false); setNewExerciseName(''); setNewExerciseMuscle(''); }}
                                        >
                                            <Text style={{ color: themeColors.textSecondary }}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.createExerciseSaveBtn}
                                            onPress={handleCreateNewExercise}
                                            disabled={submitting}
                                        >
                                            <Feather name="plus" size={16} color="#fff" />
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>{submitting ? 'Creating...' : 'Create'}</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.createExerciseBtn, { borderColor: themeColors.divider }]}
                                    onPress={() => { setShowCreateExercise(true); setNewExerciseName(exerciseSearch); }}
                                >
                                    <Feather name="plus-circle" size={20} color={userColors.accent_color} />
                                    <Text style={{ color: userColors.accent_color }}>
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
                                        { borderBottomColor: themeColors.divider },
                                        selectedExerciseIds.includes(ex.id) && { backgroundColor: userColors.accent_color + '10' },
                                    ]}
                                    onPress={() => toggleExercise(ex.id)}
                                >
                                    <View>
                                        <Text style={[styles.exerciseRowName, { color: themeColors.textPrimary }]}>{ex.name}</Text>
                                        <Text style={[styles.exerciseRowMuscle, { color: themeColors.textSecondary }]}>{ex.muscle_group}</Text>
                                    </View>
                                    <View style={[
                                        styles.exerciseCheckbox,
                                        { borderColor: themeColors.textMuted },
                                        selectedExerciseIds.includes(ex.id) && { backgroundColor: userColors.accent_color, borderColor: userColors.accent_color },
                                    ]}>
                                        {selectedExerciseIds.includes(ex.id) && (
                                            <Feather name="check" size={14} color="#fff" />
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Pressable
                            style={[styles.exerciseDoneBtn, { backgroundColor: userColors.accent_color }]}
                            onPress={() => setShowExercisePicker(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Done ({selectedExerciseIds.length} selected)</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    header: {
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
    },
    headerSubtitle: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    card: {
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    typeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    cardDate: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    cardDesc: {
        marginTop: spacing.sm,
        fontSize: typography.sizes.sm,
        lineHeight: 20,
    },
    deleteBtn: {
        padding: spacing.sm,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: typography.weights.semibold,
    },
    empty: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontStyle: 'italic',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        maxHeight: '90%',
        padding: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    form: {
        gap: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    input: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.sm,
        fontSize: typography.sizes.base,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    typeRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    typeOption: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: radii.full,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    typeText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dateText: {
        fontSize: typography.sizes.base,
    },
    submitBtn: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: typography.weights.bold,
    },
    // Adaptive workout type grid
    workoutTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    workoutTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        minWidth: '30%',
    },
    workoutTypeText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
        flexShrink: 1,
    },
    // Exercise picker styles
    exercisePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    selectedExercisesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    selectedExerciseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
    },
    selectedExerciseText: {
        fontSize: typography.sizes.sm,
        maxWidth: 120,
    },
    // Exercise picker modal styles
    exercisePickerModal: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
        maxHeight: '85%',
    },
    exercisePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    exercisePickerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    exerciseSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        height: 44,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    exerciseSearchInput: {
        flex: 1,
        fontSize: typography.sizes.base,
    },
    exerciseList: {
        maxHeight: 350,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    exerciseRowName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    exerciseRowMuscle: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    exerciseCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createExerciseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: spacing.md,
    },
    createExerciseForm: {
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    createExerciseInput: {
        height: 44,
        borderRadius: radii.md,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        fontSize: typography.sizes.base,
        marginBottom: spacing.sm,
    },
    createExerciseButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    createExerciseCancelBtn: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    createExerciseSaveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: radii.md,
        backgroundColor: '#c9a227',
    },
    exerciseDoneBtn: {
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
    },
});
