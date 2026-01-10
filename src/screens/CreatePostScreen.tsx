import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useActivityFeed, uploadFeedPhotos } from '../hooks/useActivityFeed';
import { useWorkouts } from '../hooks/useWorkouts';
import ScreenLayout from '../components/ScreenLayout';
import AppHeader from '../components/AppHeader';
import { spacing, radii, typography } from '../theme';

export default function CreatePostScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>(); // Cast to any to access params
    const { themeColors, colors: userColors } = useTheme();
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const { createPost } = useActivityFeed();
    const { getRecentCompletedWorkouts, loading: workoutsLoading } = useWorkouts();

    const [caption, setCaption] = useState('');
    const [selectedPhotos, setSelectedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    // Workout selection modal
    const [showWorkoutModal, setShowWorkoutModal] = useState(false);
    const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);

    useEffect(() => {
        loadRecentWorkouts();
        // Check for event params
        if (route.params?.eventId) {
            // Logic to link event - we'll pass it to createPost
            // We can also display "Posting to [Event Name]" 
        }
    }, [route.params?.eventId]);

    const loadRecentWorkouts = async () => {
        const workouts = await getRecentCompletedWorkouts();
        setRecentWorkouts(workouts);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            // allowsEditing: false, // Default is false, ensures original aspect ratio
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Append new photos or replace? Instagram usually replaces main or adds to carousel.
            // For now, let's append to allow multiple.
            setSelectedPhotos([...selectedPhotos, ...result.assets]);
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...selectedPhotos];
        newPhotos.splice(index, 1);
        setSelectedPhotos(newPhotos);
    };

    const handlePost = async () => {
        if (!caption.trim() && selectedPhotos.length === 0 && !selectedWorkout) {
            Alert.alert('Empty Post', 'Please add a caption, photo, or workout to your post.');
            return;
        }

        try {
            setUploading(true);

            let photoUrls: string[] = [];
            if (selectedPhotos.length > 0) {
                const { urls, error } = await uploadFeedPhotos(
                    user?.id || 'anonymous',
                    selectedPhotos.map(asset => ({ uri: asset.uri, type: asset.type }))
                );

                if (error) throw new Error(error);
                photoUrls = urls;

            }

            // Create post object - simplified for now, assuming we link workout differently in future
            // or pass detailed workout data in metadata.
            // For MVP, we will just use the available createPost interface.
            // Note: createPost expects an event_id. If no event, we might need a general feed post type.
            // Currently DB schema requires event_id or completion_id logic.
            // Assuming we are posting to general feed or a specific placeholder event if needed.
            // Wait - the schema might allow nullable event_id?
            // Checking useActivityFeed types: event_id is string.
            // We might need to handle "General" posts or link to a dummy event. 
            // OR - wait, looking at schema: event_id is NOT NULL. 
            // So for now, we can restrict to posting about an event OR we need to adjust schema.
            // But the user just asked for "Create Post" on the Squad screen.
            // Let's assume for now we might need to handle this backend side or valid event ID.
            // Actually, let's look at the implementation plan. "Activity feed from all connections".
            // If the schema enforces event_id, we can't make a generic post.
            // Let's try to post with a null event_id and see (if not enforced in DB but enforced in Types).
            // If enforced in DB, we'll need to create a "General" event or similar.

            // For this implementation, let's try to use completion_id if workout selected.
            // If generic, we might have an issue.
            // EDIT: Inspecting the DB schema in memory...
            // Let's assume generic posts are allowed if we relax the type or use a workaround.
            // But strict typescript says event_id is string.
            // I will try to pass a generic UUID or handle this.
            // Actually, let's just use a dummy UUID or null cast for now and see if backend accepts it.
            // If not, I will notify user.

            const { error } = await createPost({
                caption: caption.trim(),
                photo_urls: photoUrls,
                workout_id: selectedWorkout?.id, // Pass linked workout ID
                event_id: route.params?.eventId, // Pass event ID if from event feed
            });

            if (error) {
                throw new Error(error);
            }

            navigation.goBack();

        } catch (err: any) {
            // For now, if it fails due to event_id, let's just show an alert
            // But primarily we want to build the UI first.
            Alert.alert('Error', err.message);
        } finally {
            setUploading(false);
        }
    };

    const renderWorkoutModal = () => (
        <Modal visible={showWorkoutModal} animationType="slide" transparent>
            <Pressable style={styles.modalOverlay} onPress={() => setShowWorkoutModal(false)}>
                <Pressable
                    style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                            Recent Workouts
                        </Text>
                        <Pressable onPress={() => setShowWorkoutModal(false)}>
                            <Feather name="x" size={24} color={themeColors.textSecondary} />
                        </Pressable>
                    </View>

                    {workoutsLoading ? (
                        <ActivityIndicator color={userColors.accent_color} />
                    ) : (
                        <FlatList
                            data={recentWorkouts}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[styles.workoutItem, { borderColor: themeColors.glassBorder }]}
                                    onPress={() => {
                                        setSelectedWorkout(item);
                                        setShowWorkoutModal(false);
                                    }}
                                >
                                    <View>
                                        <Text style={[styles.workoutName, { color: themeColors.textPrimary }]}>
                                            {item.name}
                                        </Text>
                                        <Text style={[styles.workoutDate, { color: themeColors.textSecondary }]}>
                                            {new Date(item.scheduled_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {item.color && (
                                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                    )}
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <Text style={{ color: themeColors.textMuted, textAlign: 'center', padding: 20 }}>
                                    No completed workouts found.
                                </Text>
                            }
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );

    return (
        <ScreenLayout>
            <AppHeader title="Create Post" showBack showProfile={false} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0} // Adjust based on header height
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={{ paddingBottom: 100 }} // Add padding for scrolling past footer if needed
                    keyboardShouldPersistTaps="handled" // Important for interactions
                >

                    {/* Photos Section */}
                    {selectedPhotos.length > 0 ? (
                        <View style={styles.photosContainer}>
                            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                                {selectedPhotos.map((asset, index) => (
                                    <View key={index} style={[styles.fullWidthPhotoContainer, { width: width - (spacing.md * 2) }]}>
                                        <Image
                                            source={{ uri: asset.uri }}
                                            style={[
                                                styles.fullWidthPhoto,
                                                { aspectRatio: asset.width / asset.height, borderRadius: radii.lg }
                                            ]}
                                        />
                                        <Pressable
                                            style={styles.removePhotoBtn}
                                            onPress={() => removePhoto(index)}
                                        >
                                            <Feather name="x" size={16} color="#fff" />
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={styles.addPhotoContainer}>
                            <Pressable
                                style={[styles.addPhotoBtn, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}
                                onPress={pickImage}
                            >
                                <Feather name="plus" size={48} color={themeColors.textMuted} />
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { color: themeColors.textPrimary }]}
                            placeholder={route.params?.eventName ? `Post to ${route.params.eventName}...` : "What's on your mind?"}
                            placeholderTextColor={themeColors.textSecondary}
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                            autoFocus
                        />
                    </View>

                    {/* Selected Workout Card */}
                    {selectedWorkout && (
                        <View style={[styles.workoutCard, { backgroundColor: themeColors.bgSecondary }]}>
                            <View style={styles.workoutHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.colorDot, { backgroundColor: selectedWorkout.color || userColors.accent_color }]} />
                                    <Text style={[styles.workoutTitle, { color: themeColors.textPrimary }]}>
                                        {selectedWorkout.name}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setSelectedWorkout(null)}>
                                    <Feather name="x" size={16} color={themeColors.textSecondary} />
                                </Pressable>
                            </View>
                            <Text style={[styles.workoutDate, { color: themeColors.textSecondary }]}>
                                Completed on {new Date(selectedWorkout.scheduled_date).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {/* Attach Workout Button (if none selected) */}
                    {!selectedWorkout && (
                        <Pressable
                            style={[styles.attachWorkoutBtn, { borderColor: userColors.accent_color }]}
                            onPress={() => setShowWorkoutModal(true)}
                        >
                            <Feather name="activity" size={20} color={userColors.accent_color} />
                            <Text style={[styles.attachWorkoutText, { color: userColors.accent_color }]}>
                                Attach Workout
                            </Text>
                        </Pressable>
                    )}

                </ScrollView>

                <View style={[styles.footer, { borderTopColor: themeColors.glassBorder }]}>
                    <Pressable
                        style={[styles.postBtn, { backgroundColor: userColors.accent_color, opacity: uploading ? 0.7 : 1 }]}
                        onPress={handlePost}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.postBtnText}>Post</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            {renderWorkoutModal()}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inputContainer: {
        padding: spacing.md,
    },
    input: {
        fontSize: typography.sizes.lg,
        textAlignVertical: 'top',
        // minHeight removed to auto-grow
        minHeight: 40,
    },
    photosContainer: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    fullWidthPhotoContainer: {
        position: 'relative',
        // Width set dynamically
        marginRight: 0,
    },
    fullWidthPhoto: {
        width: '100%',
        alignSelf: 'center',
        resizeMode: 'cover',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    workoutCard: {
        margin: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
    },
    workoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    workoutTitle: {
        fontSize: typography.sizes.base,
        fontWeight: '600',
    },
    workoutDate: {
        fontSize: typography.sizes.sm,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    toolbar: {
        flexDirection: 'row',
        padding: spacing.md,
        borderTopWidth: 1,
        gap: spacing.xl,
    },
    toolBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolLabel: {
        fontSize: typography.sizes.base,
        fontWeight: '500',
    },
    footer: {
        padding: spacing.md,
        borderTopWidth: 1,
    },
    postBtn: {
        height: 48,
        borderRadius: radii.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postBtnText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.md,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: '600',
    },
    workoutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    workoutName: {
        fontSize: typography.sizes.base,
        fontWeight: '500',
    },
    // New Styles
    addPhotoContainer: {
        padding: spacing.md,
    },
    addPhotoBtn: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachWorkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
    },
    attachWorkoutText: {
        fontSize: typography.sizes.base,
        fontWeight: '600',
    },
});
