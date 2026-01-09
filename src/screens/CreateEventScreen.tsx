import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Switch,
    Modal,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useSquadEvents, EVENT_TYPES, CreateTrainingWorkoutInput } from '../hooks/useSquadEvents';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateEventScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { themeColors, colors: userColors } = useTheme();
    const { templates, createEvent, createEventFromTemplate } = useSquadEvents();

    // Form state
    const [step, setStep] = useState<'type' | 'details' | 'plan'>('type');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 3 months out
    const [isPrivate, setIsPrivate] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customPlan, setCustomPlan] = useState<CreateTrainingWorkoutInput[]>([]);

    const [loading, setLoading] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Available templates for selected type
    const availableTemplates = templates.filter(t => t.event_type === selectedType);

    const handleTypeSelect = (typeId: string) => {
        setSelectedType(typeId);
        setSelectedTemplate(null);

        // Check if there are templates for this type
        const typeTemplates = templates.filter(t => t.event_type === typeId);
        if (typeTemplates.length > 0) {
            setShowTemplateModal(true);
        } else {
            setStep('details');
        }
    };

    const handleTemplateSelect = (templateId: string | null) => {
        setSelectedTemplate(templateId);
        setShowTemplateModal(false);
        setStep('details');
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setEventDate(selectedDate);
        }
    };

    const handleCreate = async () => {
        if (!eventName.trim()) {
            Alert.alert('Error', 'Please enter an event name');
            return;
        }

        if (!selectedType) {
            Alert.alert('Error', 'Please select an event type');
            return;
        }

        setLoading(true);

        try {
            const dateString = eventDate.toISOString().split('T')[0];

            let result;
            if (selectedTemplate) {
                result = await createEventFromTemplate(
                    selectedTemplate,
                    eventName.trim(),
                    dateString,
                    isPrivate
                );
            } else {
                result = await createEvent(
                    {
                        name: eventName.trim(),
                        event_type: selectedType,
                        event_date: dateString,
                        is_private: isPrivate,
                    },
                    customPlan.length > 0 ? customPlan : undefined
                );
            }

            if (result.error) {
                Alert.alert('Error', result.error);
            } else {
                Alert.alert('Success', 'Event created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getDaysUntil = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const renderTypeSelection = () => (
        <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>
                What type of event?
            </Text>
            <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
                Choose the event type to get started
            </Text>

            <View style={styles.typeGrid}>
                {EVENT_TYPES.map(type => (
                    <Pressable
                        key={type.id}
                        style={[
                            styles.typeCard,
                            { backgroundColor: themeColors.bgSecondary },
                            selectedType === type.id && { borderColor: userColors.accent_color, borderWidth: 2 }
                        ]}
                        onPress={() => handleTypeSelect(type.id)}
                    >
                        <View style={[styles.typeIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                            <Feather name={type.icon as any} size={24} color={userColors.accent_color} />
                        </View>
                        <Text style={[styles.typeName, { color: themeColors.textPrimary }]}>
                            {type.name}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );

    const renderDetailsForm = () => (
        <View style={styles.stepContent}>
            {/* Back button */}
            <Pressable
                style={styles.backToType}
                onPress={() => setStep('type')}
            >
                <Feather name="arrow-left" size={16} color={themeColors.textSecondary} />
                <Text style={[styles.backText, { color: themeColors.textSecondary }]}>
                    Change event type
                </Text>
            </Pressable>

            {/* Selected type badge */}
            <View style={[styles.selectedTypeBadge, { backgroundColor: `${userColors.accent_color}20` }]}>
                <Feather
                    name={EVENT_TYPES.find(t => t.id === selectedType)?.icon as any || 'star'}
                    size={16}
                    color={userColors.accent_color}
                />
                <Text style={[styles.selectedTypeText, { color: userColors.accent_color }]}>
                    {EVENT_TYPES.find(t => t.id === selectedType)?.name}
                </Text>
                {selectedTemplate && (
                    <>
                        <Text style={[styles.templateDivider, { color: userColors.accent_color }]}>•</Text>
                        <Text style={[styles.selectedTypeText, { color: userColors.accent_color }]}>
                            {templates.find(t => t.id === selectedTemplate)?.name}
                        </Text>
                    </>
                )}
            </View>

            {/* Event Name */}
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                    Event Name
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: themeColors.inputBg,
                            borderColor: themeColors.inputBorder,
                            color: themeColors.textPrimary,
                        }
                    ]}
                    value={eventName}
                    onChangeText={setEventName}
                    placeholder="e.g., Seattle Marathon 2026"
                    placeholderTextColor={themeColors.textMuted}
                />
            </View>

            {/* Event Date */}
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                    Event Date
                </Text>
                <Pressable
                    style={[
                        styles.dateButton,
                        {
                            backgroundColor: themeColors.inputBg,
                            borderColor: themeColors.inputBorder,
                        }
                    ]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Feather name="calendar" size={20} color={userColors.accent_color} />
                    <View style={styles.dateInfo}>
                        <Text style={[styles.dateText, { color: themeColors.textPrimary }]}>
                            {formatDate(eventDate)}
                        </Text>
                        <Text style={[styles.daysUntil, { color: themeColors.textSecondary }]}>
                            {getDaysUntil()} days from now
                        </Text>
                    </View>
                </Pressable>
            </View>

            {/* Privacy Toggle */}
            <View style={[styles.privacyRow, { backgroundColor: themeColors.bgSecondary }]}>
                <View style={styles.privacyInfo}>
                    <Feather
                        name={isPrivate ? 'lock' : 'globe'}
                        size={20}
                        color={themeColors.textSecondary}
                    />
                    <View style={styles.privacyText}>
                        <Text style={[styles.privacyTitle, { color: themeColors.textPrimary }]}>
                            {isPrivate ? 'Private Event' : 'Public Event'}
                        </Text>
                        <Text style={[styles.privacyDesc, { color: themeColors.textSecondary }]}>
                            {isPrivate
                                ? 'Only squad members can see this event'
                                : 'Anyone can see and join this event'
                            }
                        </Text>
                    </View>
                </View>
                <Switch
                    value={isPrivate}
                    onValueChange={setIsPrivate}
                    trackColor={{ false: themeColors.bgTertiary, true: `${userColors.accent_color}50` }}
                    thumbColor={isPrivate ? userColors.accent_color : themeColors.textMuted}
                />
            </View>

            {/* Training Plan Info */}
            {selectedTemplate && (
                <View style={[styles.planInfo, { backgroundColor: themeColors.bgSecondary }]}>
                    <Feather name="check-circle" size={20} color="#10b981" />
                    <View style={styles.planInfoText}>
                        <Text style={[styles.planInfoTitle, { color: themeColors.textPrimary }]}>
                            Training Plan Included
                        </Text>
                        <Text style={[styles.planInfoDesc, { color: themeColors.textSecondary }]}>
                            Using "{templates.find(t => t.id === selectedTemplate)?.name}" template.
                            Workouts will be automatically scheduled for all participants.
                        </Text>
                    </View>
                </View>
            )}

            {!selectedTemplate && (
                <View style={[styles.planInfo, { backgroundColor: themeColors.bgSecondary }]}>
                    <Feather name="info" size={20} color={userColors.accent_color} />
                    <View style={styles.planInfoText}>
                        <Text style={[styles.planInfoTitle, { color: themeColors.textPrimary }]}>
                            Custom Event
                        </Text>
                        <Text style={[styles.planInfoDesc, { color: themeColors.textSecondary }]}>
                            You can add training workouts after creating the event.
                        </Text>
                    </View>
                </View>
            )}

            {/* Create Button */}
            <Pressable
                style={[
                    styles.createButton,
                    { backgroundColor: userColors.accent_color },
                    loading && { opacity: 0.7 }
                ]}
                onPress={handleCreate}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={themeColors.accentText} />
                ) : (
                    <>
                        <Feather name="plus" size={20} color={themeColors.accentText} />
                        <Text style={[styles.createButtonText, { color: themeColors.accentText }]}>
                            Create Event
                        </Text>
                    </>
                )}
            </Pressable>
        </View>
    );

    return (
        <ScreenLayout title="Create Event" showBack>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {step === 'type' && renderTypeSelection()}
                {step === 'details' && renderDetailsForm()}
            </ScrollView>

            {/* Date Picker */}
            {showDatePicker && (
                <Modal transparent animationType="fade">
                    <Pressable
                        style={styles.datePickerOverlay}
                        onPress={() => setShowDatePicker(false)}
                    >
                        <View style={[styles.datePickerContainer, { backgroundColor: themeColors.bgSecondary }]}>
                            <DateTimePicker
                                value={eventDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                                textColor={themeColors.textPrimary}
                            />
                            {Platform.OS === 'ios' && (
                                <Pressable
                                    style={[styles.datePickerDone, { backgroundColor: userColors.accent_color }]}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={[styles.datePickerDoneText, { color: themeColors.accentText }]}>
                                        Done
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Pressable>
                </Modal>
            )}

            {/* Template Selection Modal */}
            <Modal
                visible={showTemplateModal}
                transparent
                animationType="slide"
            >
                <View style={styles.templateModalOverlay}>
                    <View style={[styles.templateModal, { backgroundColor: themeColors.bgPrimary }]}>
                        <View style={styles.templateModalHeader}>
                            <Text style={[styles.templateModalTitle, { color: themeColors.textPrimary }]}>
                                Choose a Template
                            </Text>
                            <Pressable onPress={() => setShowTemplateModal(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.templateList}>
                            {/* Custom option */}
                            <Pressable
                                style={[styles.templateCard, { backgroundColor: themeColors.bgSecondary }]}
                                onPress={() => handleTemplateSelect(null)}
                            >
                                <View style={[styles.templateIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                                    <Feather name="edit-3" size={24} color={userColors.accent_color} />
                                </View>
                                <View style={styles.templateInfo}>
                                    <Text style={[styles.templateName, { color: themeColors.textPrimary }]}>
                                        Create Custom Plan
                                    </Text>
                                    <Text style={[styles.templateDesc, { color: themeColors.textSecondary }]}>
                                        Build your own training schedule from scratch
                                    </Text>
                                </View>
                                <Feather name="chevron-right" size={20} color={themeColors.textMuted} />
                            </Pressable>

                            {/* Templates */}
                            {availableTemplates.map(template => (
                                <Pressable
                                    key={template.id}
                                    style={[styles.templateCard, { backgroundColor: themeColors.bgSecondary }]}
                                    onPress={() => handleTemplateSelect(template.id)}
                                >
                                    <View style={[styles.templateIcon, { backgroundColor: `${userColors.accent_color}20` }]}>
                                        <Feather name="file-text" size={24} color={userColors.accent_color} />
                                    </View>
                                    <View style={styles.templateInfo}>
                                        <Text style={[styles.templateName, { color: themeColors.textPrimary }]}>
                                            {template.name}
                                        </Text>
                                        <Text style={[styles.templateDesc, { color: themeColors.textSecondary }]} numberOfLines={2}>
                                            {template.description}
                                        </Text>
                                        <View style={styles.templateMeta}>
                                            <View style={[styles.templateBadge, { backgroundColor: themeColors.bgTertiary }]}>
                                                <Text style={[styles.templateBadgeText, { color: themeColors.textSecondary }]}>
                                                    {template.duration_weeks} weeks
                                                </Text>
                                            </View>
                                            <View style={[styles.templateBadge, { backgroundColor: themeColors.bgTertiary }]}>
                                                <Text style={[styles.templateBadgeText, { color: themeColors.textSecondary }]}>
                                                    {template.difficulty}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={themeColors.textMuted} />
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.xs,
    },
    stepSubtitle: {
        fontSize: typography.sizes.base,
        marginBottom: spacing.lg,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    typeCard: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: radii.md,
        padding: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    typeName: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        textAlign: 'center',
    },
    backToType: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    backText: {
        fontSize: typography.sizes.sm,
    },
    selectedTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radii.full,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    selectedTypeText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    templateDivider: {
        fontSize: typography.sizes.sm,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        fontSize: typography.sizes.base,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.md,
    },
    dateInfo: {
        flex: 1,
    },
    dateText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    daysUntil: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.md,
    },
    privacyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    privacyText: {
        flex: 1,
    },
    privacyTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    privacyDesc: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    planInfo: {
        flexDirection: 'row',
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    planInfoText: {
        flex: 1,
    },
    planInfoTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    planInfoDesc: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
        lineHeight: 20,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.xs,
    },
    createButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        padding: spacing.md,
    },
    datePickerDone: {
        padding: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    datePickerDoneText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    templateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    templateModal: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        maxHeight: '80%',
    },
    templateModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    templateModalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    templateList: {
        padding: spacing.md,
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    templateIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    templateDesc: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
        lineHeight: 18,
    },
    templateMeta: {
        flexDirection: 'row',
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    templateBadge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.xs,
        borderRadius: radii.sm,
    },
    templateBadgeText: {
        fontSize: typography.sizes.xs,
        textTransform: 'capitalize',
    },
});
