import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useSquadEvents, TrainingWorkout } from '../hooks/useSquadEvents';
import { useEventWorkouts, FEELING_OPTIONS } from '../hooks/useEventWorkouts';
import { useActivityFeed, uploadFeedPhotos } from '../hooks/useActivityFeed';
import { useAuth } from '../context/AuthContext';
import ScreenLayout from '../components/ScreenLayout';
import { spacing, radii, typography } from '../theme';
import { RootStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CompleteEventWorkoutRouteProp = RouteProp<RootStackParamList, 'CompleteEventWorkout'>;

export default function CompleteEventWorkoutScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<CompleteEventWorkoutRouteProp>();
    const { user } = useAuth();
    const { themeColors, colors: userColors } = useTheme();
    const { getTrainingPlan } = useSquadEvents();
    const { completeWorkout, getWorkoutCompletion } = useEventWorkouts();
    const { createPost } = useActivityFeed();

    const [workout, setWorkout] = useState<TrainingWorkout | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [actualValue, setActualValue] = useState('');
    const [actualUnit, setActualUnit] = useState('');
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [durationMinutes, setDurationMinutes] = useState('');
    const [notes, setNotes] = useState('');
    const [feeling, setFeeling] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [photos, setPhotos] = useState<{ uri: string }[]>([]);
    const [postToFeed, setPostToFeed] = useState(true);

    useEffect(() => {
        const loadWorkout = async () => {
            const plan = await getTrainingPlan(route.params.eventId);
            const found = plan.find(w => w.id === route.params.trainingWorkoutId);

            if (found) {
                setWorkout(found);
                setActualUnit(found.target_unit || '');

                // Check if already completed
                const existing = await getWorkoutCompletion(found.id);
                if (existing) {
                    setActualValue(existing.actual_value?.toString() || '');
                    setSelectedZone(existing.actual_zone || null);
                    setNotes(existing.notes || '');
                    setFeeling(existing.feeling || null);
                    if (existing.duration_seconds) {
                        setDurationMinutes(Math.round(existing.duration_seconds / 60).toString());
                    }
                }
            }

            setLoading(false);
        };

        loadWorkout();
    }, [route.params, getTrainingPlan, getWorkoutCompletion]);

    const handlePickPhotos = async () => {
        if (photos.length >= 5) {
            Alert.alert('Limit Reached', 'You can add up to 5 photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 5 - photos.length,
        });

        if (!result.canceled) {
            setPhotos(prev => [...prev, ...result.assets.slice(0, 5 - prev.length)]);
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (!workout || !user) return;

        setSaving(true);

        try {
            // Save completion
            const completionResult = await completeWorkout({
                training_workout_id: workout.id,
                actual_value: actualValue ? parseFloat(actualValue) : undefined,
                actual_unit: actualUnit || undefined,
                actual_zone: selectedZone as any || undefined,
                duration_seconds: durationMinutes ? parseInt(durationMinutes) * 60 : undefined,
                notes: notes || undefined,
                feeling: feeling as any || undefined,
            });

            if (completionResult.error) {
                Alert.alert('Error', completionResult.error);
                setSaving(false);
                return;
            }

            // Post to feed if enabled
            if (postToFeed && completionResult.completion) {
                let photoUrls: string[] = [];

                // Upload photos if any
                if (photos.length > 0) {
                    const uploadResult = await uploadFeedPhotos(user.id, photos);
                    if (uploadResult.error) {
                        console.warn('Photo upload failed:', uploadResult.error);
                    } else {
                        photoUrls = uploadResult.urls;
                    }
                }

                await createPost({
                    event_id: route.params.eventId,
                    completion_id: completionResult.completion.id,
                    caption: caption || undefined,
                    photo_urls: photoUrls,
                });
            }

            Alert.alert('Workout Complete! 🔥', 'Great job staying on track with your training!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ScreenLayout hideHeader>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={userColors.accent_color} />
                </View>
            </ScreenLayout>
        );
    }

    if (!workout) {
        return (
            <ScreenLayout hideHeader>
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color={themeColors.textMuted} />
                    <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
                        Workout not found
                    </Text>
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout hideHeader>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Workout Info */}
                <View style={[styles.workoutCard, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={[styles.workoutColor, { backgroundColor: workout.color }]} />
                    <View style={styles.workoutContent}>
                        <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>
                            {workout.name}
                        </Text>
                        {workout.description && (
                            <Text style={[styles.workoutDesc, { color: themeColors.textSecondary }]}>
                                {workout.description}
                            </Text>
                        )}
                        {(workout.target_value || workout.target_notes) && (
                            <View style={styles.targetRow}>
                                <Feather name="target" size={14} color={userColors.accent_color} />
                                <Text style={[styles.targetText, { color: userColors.accent_color }]}>
                                    Target: {workout.target_value && workout.target_unit
                                        ? `${workout.target_value} ${workout.target_unit}`
                                        : workout.target_notes
                                    }
                                    {workout.target_zone && ` • ${workout.target_zone.replace('zone', 'Zone ')}`}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Actual Results */}
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                    Your Results
                </Text>

                {/* Value Input */}
                {workout.workout_type !== 'custom' && (
                    <View style={styles.row}>
                        <View style={styles.valueInput}>
                            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                Actual Value
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
                                value={actualValue}
                                onChangeText={setActualValue}
                                placeholder={`e.g., ${workout.target_value || '10'}`}
                                placeholderTextColor={themeColors.textMuted}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={styles.unitInput}>
                            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                Unit
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
                                value={actualUnit}
                                onChangeText={setActualUnit}
                                placeholder={workout.target_unit || 'km'}
                                placeholderTextColor={themeColors.textMuted}
                            />
                        </View>
                    </View>
                )}

                {/* Zone Selection */}
                {(workout.workout_type === 'zone' || workout.target_zone) && (
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                            Heart Rate Zone
                        </Text>
                        <View style={styles.zoneOptions}>
                            {[1, 2, 3, 4, 5].map(zone => (
                                <Pressable
                                    key={zone}
                                    style={[
                                        styles.zoneButton,
                                        {
                                            backgroundColor: selectedZone === `zone${zone}`
                                                ? userColors.accent_color
                                                : themeColors.bgTertiary
                                        }
                                    ]}
                                    onPress={() => setSelectedZone(`zone${zone}`)}
                                >
                                    <Text style={[
                                        styles.zoneText,
                                        { color: selectedZone === `zone${zone}` ? themeColors.accentText : themeColors.textSecondary }
                                    ]}>
                                        Z{zone}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* Duration */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                        Duration (minutes)
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
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        placeholder="e.g., 45"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="number-pad"
                    />
                </View>

                {/* How did it feel? */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                        How did it feel?
                    </Text>
                    <View style={styles.feelingOptions}>
                        {FEELING_OPTIONS.map(option => (
                            <Pressable
                                key={option.id}
                                style={[
                                    styles.feelingButton,
                                    {
                                        backgroundColor: feeling === option.id
                                            ? `${option.color}30`
                                            : themeColors.bgTertiary,
                                        borderColor: feeling === option.id ? option.color : 'transparent',
                                    }
                                ]}
                                onPress={() => setFeeling(option.id)}
                            >
                                <Text style={styles.feelingEmoji}>{option.emoji}</Text>
                                <Text style={[
                                    styles.feelingLabel,
                                    { color: feeling === option.id ? option.color : themeColors.textSecondary }
                                ]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                        Notes (optional)
                    </Text>
                    <TextInput
                        style={[
                            styles.textArea,
                            {
                                backgroundColor: themeColors.inputBg,
                                borderColor: themeColors.inputBorder,
                                color: themeColors.textPrimary,
                            }
                        ]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any notes about this workout..."
                        placeholderTextColor={themeColors.textMuted}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Share to Feed Section */}
                <View style={[styles.feedSection, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.feedHeader}>
                        <View style={styles.feedToggle}>
                            <Text style={[styles.feedTitle, { color: themeColors.textPrimary }]}>
                                Share to Activity Feed
                            </Text>
                            <Text style={[styles.feedSubtitle, { color: themeColors.textSecondary }]}>
                                Let your squad know you crushed it!
                            </Text>
                        </View>
                        <Pressable
                            style={[
                                styles.toggleButton,
                                { backgroundColor: postToFeed ? userColors.accent_color : themeColors.bgTertiary }
                            ]}
                            onPress={() => setPostToFeed(!postToFeed)}
                        >
                            <View style={[
                                styles.toggleKnob,
                                {
                                    backgroundColor: '#ffffff',
                                    transform: [{ translateX: postToFeed ? 20 : 0 }]
                                }
                            ]} />
                        </Pressable>
                    </View>

                    {postToFeed && (
                        <>
                            {/* Caption */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                    Caption (optional)
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: themeColors.bgTertiary,
                                            borderColor: themeColors.divider,
                                            color: themeColors.textPrimary,
                                        }
                                    ]}
                                    value={caption}
                                    onChangeText={setCaption}
                                    placeholder="Write something for your squad..."
                                    placeholderTextColor={themeColors.textMuted}
                                />
                            </View>

                            {/* Photos */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                                    Photos (up to 5)
                                </Text>
                                <View style={styles.photosGrid}>
                                    {photos.map((photo, index) => (
                                        <View key={index} style={styles.photoContainer}>
                                            <Image source={{ uri: photo.uri }} style={styles.photo} />
                                            <Pressable
                                                style={styles.removePhotoButton}
                                                onPress={() => handleRemovePhoto(index)}
                                            >
                                                <Feather name="x" size={14} color="#ffffff" />
                                            </Pressable>
                                        </View>
                                    ))}
                                    {photos.length < 5 && (
                                        <Pressable
                                            style={[styles.addPhotoButton, { backgroundColor: themeColors.bgTertiary }]}
                                            onPress={handlePickPhotos}
                                        >
                                            <Feather name="plus" size={24} color={themeColors.textMuted} />
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Complete Button */}
                <Pressable
                    style={[
                        styles.completeButton,
                        { backgroundColor: userColors.accent_color },
                        saving && { opacity: 0.7 }
                    ]}
                    onPress={handleComplete}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={themeColors.accentText} />
                    ) : (
                        <>
                            <Feather name="check" size={20} color={themeColors.accentText} />
                            <Text style={[styles.completeButtonText, { color: themeColors.accentText }]}>
                                Complete Workout
                            </Text>
                        </>
                    )}
                </Pressable>
            </ScrollView>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    errorText: {
        fontSize: typography.sizes.base,
    },
    workoutCard: {
        flexDirection: 'row',
        borderRadius: radii.md,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    workoutColor: {
        width: 4,
    },
    workoutContent: {
        flex: 1,
        padding: spacing.md,
    },
    workoutName: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    workoutDesc: {
        fontSize: typography.sizes.sm,
        marginTop: spacing.xs,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: 4,
    },
    targetText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    sectionTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    valueInput: {
        flex: 2,
    },
    unitInput: {
        flex: 1,
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
    textArea: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        fontSize: typography.sizes.base,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    zoneOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    zoneButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    zoneText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    feelingOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    feelingButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
        borderWidth: 2,
    },
    feelingEmoji: {
        fontSize: 20,
    },
    feelingLabel: {
        fontSize: typography.sizes.xs,
        marginTop: 2,
    },
    feedSection: {
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    feedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    feedToggle: {
        flex: 1,
    },
    feedTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    feedSubtitle: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
    toggleButton: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 3,
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    photoContainer: {
        position: 'relative',
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: radii.md,
    },
    removePhotoButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoButton: {
        width: 80,
        height: 80,
        borderRadius: radii.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.xs,
    },
    completeButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
});
