import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Modal,
    TextInput,
    Switch,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useSquadEvents, TrainingWorkout, CreateTrainingWorkoutInput } from '../hooks/useSquadEvents';
import { useExercises } from '../hooks/useExercises';
import ScreenLayout from '../components/ScreenLayout';
import { useAlert } from '../components/CustomAlert';
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

// Activity type for multi-activity workouts
type Activity = {
    id: string;
    type: 'workout_type' | 'exercise';
    // For workout types:
    workoutType?: string;
    workoutTypeName?: string;
    distance?: string;
    distanceUnit?: string;
    duration?: string;
    weight?: string;
    weightUnit?: string;
    zone?: string;
    // For exercises:
    exerciseId?: string;
    exerciseName?: string;
    sets?: string;
    reps?: string;
};

export default function ManageEventPlanScreen() {

    const navigation = useNavigation();
    const route = useRoute<ManagePlanRouteProp>();
    const { eventId, eventName, eventDate, eventType } = route.params;
    const { theme, themeColors, colors: userColors } = useTheme();
    const { getTrainingPlan, addTrainingWorkout, deleteTrainingWorkout } = useSquadEvents();
    const { exercises, createExercise, fetchExercises } = useExercises();
    const { showAlert } = useAlert();

    const eventCategory = getEventCategory(eventType);
    const workoutOptions = WORKOUT_OPTIONS[eventCategory];

    const [workouts, setWorkouts] = useState<TrainingWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New Form State - activities based
    const [formName, setFormName] = useState('');
    const [formDate, setFormDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);



    // Add Activity Modal State
    const [showAddActivityModal, setShowAddActivityModal] = useState(false);
    const [activityTab, setActivityTab] = useState<'types' | 'exercises'>('types');

    // For adding workout type activity
    const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>('');
    const [actDistance, setActDistance] = useState('');
    const [actDistanceUnit, setActDistanceUnit] = useState('km');
    const [actDuration, setActDuration] = useState('');
    const [actWeight, setActWeight] = useState('');
    const [actWeightUnit, setActWeightUnit] = useState('kg');
    const [actZone, setActZone] = useState('');

    // For adding exercise activity
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [selectedExerciseForActivity, setSelectedExerciseForActivity] = useState<any>(null);
    const [actSets, setActSets] = useState('');
    const [actReps, setActReps] = useState('');
    const [actExerciseWeight, setActExerciseWeight] = useState('');

    // Create new exercise state
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

    // Add a workout type activity
    const addWorkoutTypeActivity = () => {

        if (!selectedWorkoutType) {
            showAlert({ title: 'Error', message: 'Please select a workout type' });
            return;
        }
        const option = workoutOptions.find(o => o.id === selectedWorkoutType);
        const newActivity: Activity = {
            id: Date.now().toString(),
            type: 'workout_type',
            workoutType: selectedWorkoutType,
            workoutTypeName: option?.name || selectedWorkoutType,
            distance: actDistance || undefined,
            distanceUnit: actDistance ? actDistanceUnit : undefined,
            duration: actDuration || undefined,
            weight: actWeight || undefined,
            weightUnit: actWeight ? actWeightUnit : undefined,
            zone: actZone || undefined,
        };
        setActivities(prev => [...prev, newActivity]);
        resetActivityForm();
        setShowAddActivityModal(false);
    };

    // Add an exercise activity
    const addExerciseActivity = () => {

        if (!selectedExerciseForActivity) {
            showAlert({ title: 'Error', message: 'Please select an exercise' });
            return;
        }
        const newActivity: Activity = {
            id: Date.now().toString(),
            type: 'exercise',
            exerciseId: selectedExerciseForActivity.id,
            exerciseName: selectedExerciseForActivity.name,
            sets: actSets || undefined,
            reps: actReps || undefined,
            weight: actExerciseWeight || undefined,
            weightUnit: actExerciseWeight ? actWeightUnit : undefined,
        };
        setActivities(prev => [...prev, newActivity]);
        resetActivityForm();
        setShowAddActivityModal(false);
    };

    // Remove an activity
    const removeActivity = (activityId: string) => {
        setActivities(prev => prev.filter(a => a.id !== activityId));
    };

    // Reset activity form
    const resetActivityForm = () => {
        setSelectedWorkoutType('');
        setActDistance('');
        setActDistanceUnit('km');
        setActDuration('');
        setActWeight('');
        setActWeightUnit('kg');
        setActZone('');
        setSelectedExerciseForActivity(null);
        setActSets('');
        setActReps('');
        setActExerciseWeight('');
        setExerciseSearch('');
    };

    const handleCreateNewExercise = async () => {
        if (!newExerciseName.trim() || !newExerciseMuscle.trim()) {
            showAlert({ title: 'Error', message: 'Please enter exercise name and muscle group' });
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
                setSelectedExerciseForActivity(data);
                await fetchExercises();
                setNewExerciseName('');
                setNewExerciseMuscle('');
                setShowCreateExercise(false);
            }
        } catch (err) {
            showAlert({ title: 'Error', message: 'Failed to create exercise' });
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
        showAlert({
            title: 'Delete Workout',
            message: 'Are you sure you want to remove this workout from the plan?',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await deleteTrainingWorkout(workoutId);
                        if (error) showAlert({ title: 'Error', message: error });
                        else loadPlan();
                    }
                }
            ]
        });
    };

    const handleAdd = async () => {
        console.log('[Debug] handleAdd called', { formName, activitiesCount: activities.length });
        if (!formName.trim()) {
            showAlert({ title: 'Error', message: 'Please enter a workout name' });
            return;
        }

        if (activities.length === 0) {
            showAlert({ title: 'Error', message: 'Please add at least one activity' });
            return;
        }

        // Validate date is before event
        const eventDateObj = new Date(eventDate);
        if (formDate >= eventDateObj) {
            showAlert({ title: 'Error', message: 'Workout date must be before the event date' });
            return;
        }

        setSubmitting(true);

        // Calculate days before event from selected date
        const timeDiff = eventDateObj.getTime() - formDate.getTime();
        const daysBefore = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Build description from activities
        const activityDescriptions = activities.map(act => {
            if (act.type === 'workout_type') {
                const parts = [act.workoutTypeName];
                if (act.distance) parts.push(`${act.distance}${act.distanceUnit || 'km'}`);
                if (act.duration) parts.push(`${act.duration}min`);
                if (act.weight) parts.push(`${act.weight}${act.weightUnit || 'kg'}`);
                if (act.zone) parts.push(act.zone);
                return parts.join(' - ');
            } else {
                const parts = [act.exerciseName];
                if (act.sets && act.reps) parts.push(`${act.sets}x${act.reps}`);
                if (act.weight) parts.push(`${act.weight}${act.weightUnit || 'kg'}`);
                return parts.join(' - ');
            }
        });

        const input: CreateTrainingWorkoutInput = {
            name: formName.trim(),
            description: activityDescriptions.join(' | '),
            workout_type: 'custom',
            target_notes: JSON.stringify({ activities }),
            days_before_event: daysBefore,
            color: userColors.accent_color,
            is_required: true,
            order_index: workouts.length,
        };

        const { error } = await addTrainingWorkout(eventId, input);
        console.log('[Debug] addTrainingWorkout result', { error });

        if (error) {
            showAlert({ title: 'Error', message: error });
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
        setFormDate(new Date());
        setActivities([]);
        resetActivityForm();
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    {showAddActivityModal ? (
                        <View style={[styles.exercisePickerModal, { backgroundColor: themeColors.bgSecondary }]}>
                            <View style={styles.exercisePickerHeader}>
                                <Text style={[styles.exercisePickerTitle, { color: themeColors.textPrimary }]}>Add Activity</Text>
                                <Pressable onPress={() => { setShowAddActivityModal(false); resetActivityForm(); }}>
                                    <Feather name="x" size={24} color={themeColors.textSecondary} />
                                </Pressable>
                            </View>

                            {/* Tabs */}
                            <View style={styles.tabRow}>
                                <Pressable
                                    style={[styles.tab, activityTab === 'types' && { borderBottomColor: userColors.accent_color, borderBottomWidth: 2 }]}
                                    onPress={() => setActivityTab('types')}
                                >
                                    <Text style={[styles.tabText, { color: activityTab === 'types' ? userColors.accent_color : themeColors.textSecondary }]}>
                                        Workout Types
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.tab, activityTab === 'exercises' && { borderBottomColor: userColors.accent_color, borderBottomWidth: 2 }]}
                                    onPress={() => setActivityTab('exercises')}
                                >
                                    <Text style={[styles.tabText, { color: activityTab === 'exercises' ? userColors.accent_color : themeColors.textSecondary }]}>
                                        Exercises
                                    </Text>
                                </Pressable>
                            </View>

                            <ScrollView style={styles.exerciseList} keyboardShouldPersistTaps="handled">
                                {activityTab === 'types' ? (
                                    <>
                                        {/* Workout Type Selection */}
                                        <Text style={[styles.label, { color: themeColors.textSecondary, marginBottom: spacing.sm }]}>
                                            Select Type
                                        </Text>
                                        <View style={styles.workoutTypeGrid}>
                                            {workoutOptions.map(opt => (
                                                <Pressable
                                                    key={opt.id}
                                                    style={[
                                                        styles.workoutTypeItem,
                                                        { borderColor: themeColors.divider },
                                                        selectedWorkoutType === opt.id && {
                                                            backgroundColor: userColors.accent_color,
                                                            borderColor: userColors.accent_color
                                                        }
                                                    ]}
                                                    onPress={() => setSelectedWorkoutType(opt.id)}
                                                >
                                                    <Feather
                                                        name={opt.icon as any}
                                                        size={16}
                                                        color={selectedWorkoutType === opt.id ? '#fff' : themeColors.textSecondary}
                                                    />
                                                    <Text style={[
                                                        styles.workoutTypeText,
                                                        { color: selectedWorkoutType === opt.id ? '#fff' : themeColors.textSecondary }
                                                    ]} numberOfLines={1}>
                                                        {opt.name}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>

                                        {/* Parameters */}
                                        {selectedWorkoutType && (
                                            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                                                <View style={styles.row}>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Distance</Text>
                                                        <View style={styles.row}>
                                                            <TextInput
                                                                style={[styles.input, { flex: 1, color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                                value={actDistance}
                                                                onChangeText={setActDistance}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor={themeColors.textMuted}
                                                            />
                                                            <Pressable
                                                                style={[styles.unitBtn, { borderColor: themeColors.divider, backgroundColor: themeColors.inputBg }]}
                                                                onPress={() => setActDistanceUnit(actDistanceUnit === 'km' ? 'mi' : 'km')}
                                                            >
                                                                <Text style={{ color: themeColors.textPrimary }}>{actDistanceUnit}</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Duration (min)</Text>
                                                        <TextInput
                                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                            value={actDuration}
                                                            onChangeText={setActDuration}
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                            placeholderTextColor={themeColors.textMuted}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={styles.row}>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Weight</Text>
                                                        <View style={styles.row}>
                                                            <TextInput
                                                                style={[styles.input, { flex: 1, color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                                value={actWeight}
                                                                onChangeText={setActWeight}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor={themeColors.textMuted}
                                                            />
                                                            <Pressable
                                                                style={[styles.unitBtn, { borderColor: themeColors.divider, backgroundColor: themeColors.inputBg }]}
                                                                onPress={() => setActWeightUnit(actWeightUnit === 'kg' ? 'lbs' : 'kg')}
                                                            >
                                                                <Text style={{ color: themeColors.textPrimary }}>{actWeightUnit}</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Zone</Text>
                                                        <TextInput
                                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                            value={actZone}
                                                            onChangeText={setActZone}
                                                            placeholder="e.g. Zone 2"
                                                            placeholderTextColor={themeColors.textMuted}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Search Exercises */}
                                        <View style={[styles.exerciseSearchBox, { backgroundColor: themeColors.inputBg, borderColor: themeColors.divider }]}>
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
                                                    placeholder="Muscle group"
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
                                                    selectedExerciseForActivity?.id === ex.id && { backgroundColor: userColors.accent_color + '10' },
                                                ]}
                                                onPress={() => setSelectedExerciseForActivity(ex)}
                                            >
                                                <View>
                                                    <Text style={[styles.exerciseRowName, { color: themeColors.textPrimary }]}>{ex.name}</Text>
                                                    <Text style={[styles.exerciseRowMuscle, { color: themeColors.textSecondary }]}>{ex.muscle_group}</Text>
                                                </View>
                                                <View style={[
                                                    styles.exerciseCheckbox,
                                                    { borderColor: themeColors.textMuted },
                                                    selectedExerciseForActivity?.id === ex.id && { backgroundColor: userColors.accent_color, borderColor: userColors.accent_color },
                                                ]}>
                                                    {selectedExerciseForActivity?.id === ex.id && (
                                                        <Feather name="check" size={14} color="#fff" />
                                                    )}
                                                </View>
                                            </Pressable>
                                        ))}

                                        {/* Exercise Parameters */}
                                        {selectedExerciseForActivity && (
                                            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                                    {selectedExerciseForActivity.name} - Parameters
                                                </Text>
                                                <View style={styles.row}>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Sets</Text>
                                                        <TextInput
                                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                            value={actSets}
                                                            onChangeText={setActSets}
                                                            keyboardType="numeric"
                                                            placeholder="3"
                                                            placeholderTextColor={themeColors.textMuted}
                                                        />
                                                    </View>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Reps</Text>
                                                        <TextInput
                                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                            value={actReps}
                                                            onChangeText={setActReps}
                                                            keyboardType="numeric"
                                                            placeholder="10"
                                                            placeholderTextColor={themeColors.textMuted}
                                                        />
                                                    </View>
                                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Weight</Text>
                                                        <TextInput
                                                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.divider }]}
                                                            value={actExerciseWeight}
                                                            onChangeText={setActExerciseWeight}
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                            placeholderTextColor={themeColors.textMuted}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </>
                                )}
                            </ScrollView>

                            {/* Add Button */}
                            <Pressable
                                style={[styles.exerciseDoneBtn, { backgroundColor: userColors.accent_color }]}
                                onPress={activityTab === 'types' ? addWorkoutTypeActivity : addExerciseActivity}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
                                    {activityTab === 'types' ? 'Add Workout Type' : 'Add Exercise'}
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={[styles.modalContent, { backgroundColor: themeColors.bgPrimary }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Add Workout</Text>
                                <Pressable onPress={() => setShowAddModal(false)}>
                                    <Feather name="x" size={24} color={themeColors.textPrimary} />
                                </Pressable>
                            </View>

                            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                                {/* Workout Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Workout Name</Text>
                                    <TextInput
                                        style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                        value={formName}
                                        onChangeText={setFormName}
                                        placeholder="e.g. Morning Session"
                                        placeholderTextColor={themeColors.textMuted}
                                    />
                                </View>

                                {/* Workout Date */}
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
                                            themeVariant={theme}
                                            textColor={themeColors.textPrimary}
                                            onChange={(event, selectedDate) => {
                                                setShowDatePicker(Platform.OS === 'ios');
                                                if (selectedDate) {
                                                    setFormDate(selectedDate);
                                                }
                                            }}
                                        />
                                    )}
                                </View>

                                {/* Activities Section */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                        Activities ({activities.length})
                                    </Text>

                                    {/* Activities List */}
                                    {activities.map((act, index) => (
                                        <View
                                            key={act.id}
                                            style={[styles.activityCard, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.divider }]}
                                        >
                                            <View style={styles.activityInfo}>
                                                <View style={[styles.activityIcon, { backgroundColor: userColors.accent_color + '20' }]}>
                                                    <Feather
                                                        name={act.type === 'workout_type' ? 'activity' : 'target'}
                                                        size={14}
                                                        color={userColors.accent_color}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.activityName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                        {act.type === 'workout_type' ? act.workoutTypeName : act.exerciseName}
                                                    </Text>
                                                    <Text style={[styles.activityDetails, { color: themeColors.textSecondary }]} numberOfLines={1}>
                                                        {act.type === 'workout_type' ? (
                                                            [
                                                                act.distance && `${act.distance}${act.distanceUnit || 'km'}`,
                                                                act.duration && `${act.duration}min`,
                                                                act.weight && `${act.weight}${act.weightUnit || 'kg'}`,
                                                                act.zone
                                                            ].filter(Boolean).join(' • ') || 'No targets set'
                                                        ) : (
                                                            [
                                                                act.sets && act.reps && `${act.sets}x${act.reps}`,
                                                                act.weight && `${act.weight}${act.weightUnit || 'kg'}`
                                                            ].filter(Boolean).join(' • ') || 'No details'
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Pressable onPress={() => removeActivity(act.id)} hitSlop={8}>
                                                <Feather name="x-circle" size={20} color={themeColors.textMuted} />
                                            </Pressable>
                                        </View>
                                    ))}

                                    {/* Add Activity Button */}
                                    <Pressable
                                        style={[styles.addActivityBtn, { borderColor: userColors.accent_color }]}
                                        onPress={() => {

                                            setShowAddActivityModal(true);
                                        }}
                                    >
                                        <Feather name="plus" size={18} color={userColors.accent_color} />
                                        <Text style={{ color: userColors.accent_color, fontWeight: '600' }}>Add Activity</Text>
                                    </Pressable>
                                </View>

                                {/* Create Workout Button */}
                                <Pressable
                                    style={[
                                        styles.submitBtn,
                                        { backgroundColor: userColors.accent_color, opacity: (submitting || activities.length === 0) ? 0.5 : 1 }
                                    ]}
                                    onPress={handleAdd}
                                    disabled={submitting || activities.length === 0}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                                    ) : null}
                                    <Text style={styles.submitBtnText}>
                                        {submitting ? 'Creating...' : 'Create Workout'}
                                    </Text>
                                </Pressable>
                            </ScrollView>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </Modal>


        </ScreenLayout >
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
        padding: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.lg,
        flexDirection: 'row',
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
    // Activity card styles
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    activityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    activityIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.semibold,
    },
    activityDetails: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    addActivityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    // Tab styles
    tabRow: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    tabText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    // Unit toggle button
    unitBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        marginLeft: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

