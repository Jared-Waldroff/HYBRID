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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSquadEvents, TrainingWorkout, CreateTrainingWorkoutInput } from '../hooks/useSquadEvents';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type ManagePlanRouteProp = RouteProp<RootStackParamList, 'ManageEventPlan'>;

export default function ManageEventPlanScreen() {
    const navigation = useNavigation();
    const route = useRoute<ManagePlanRouteProp>();
    const { eventId, eventName, eventDate } = route.params;
    const { themeColors, colors: userColors } = useTheme();
    const { getTrainingPlan, addTrainingWorkout, deleteTrainingWorkout } = useSquadEvents();

    const [workouts, setWorkouts] = useState<TrainingWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState<'distance' | 'time' | 'custom'>('distance');
    const [formValue, setFormValue] = useState('');
    const [formUnit, setFormUnit] = useState('km');
    const [formDays, setFormDays] = useState('1');

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

        setSubmitting(true);
        const days = parseInt(formDays) || 1;

        const input: CreateTrainingWorkoutInput = {
            name: formName.trim(),
            description: formDesc.trim() || undefined,
            workout_type: formType,
            target_value: formValue ? parseFloat(formValue) : undefined,
            target_unit: formType === 'distance' ? formUnit : undefined,
            days_before_event: days,
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
        setFormType('distance');
        setFormValue('');
        setFormDays('1');
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

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Type</Text>
                                    <View style={styles.typeRow}>
                                        {['distance', 'time', 'custom'].map(t => (
                                            <Pressable
                                                key={t}
                                                style={[
                                                    styles.typeOption,
                                                    formType === t && { backgroundColor: userColors.accent_color }
                                                ]}
                                                onPress={() => setFormType(t as any)}
                                            >
                                                <Text style={[
                                                    styles.typeText,
                                                    { color: formType === t ? '#fff' : themeColors.textSecondary }
                                                ]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                        Target {formType === 'distance' ? '(km/mi)' : formType === 'time' ? '(min)' : ''}
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
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>Days Before Event</Text>
                                    <TextInput
                                        style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.inputBorder || themeColors.divider }]}
                                        value={formDays}
                                        onChangeText={setFormDays}
                                        keyboardType="numeric"
                                        placeholder="1"
                                        placeholderTextColor={themeColors.textMuted}
                                    />
                                </View>
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
});
