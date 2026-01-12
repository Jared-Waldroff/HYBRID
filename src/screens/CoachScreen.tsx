import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    Alert,
    Keyboard,
    Animated,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWorkouts } from '../hooks/useWorkouts';
import { useExercises } from '../hooks/useExercises';
import { useSquadEvents } from '../hooks/useSquadEvents';
import ScreenLayout from '../components/ScreenLayout';
import { HYBRID_COACH_SYSTEM_PROMPT } from '../lib/geminiClient';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface WorkoutExercise {
    name: string;
    sets: number;
    reps: string;
    weight?: string;          // "135 lbs" or "RPE 8"
    tempo?: string;           // "3-1-2-0" (eccentric-pause-concentric-pause)
    rest_seconds?: number;
    notes?: string;           // Form cues, breathing, etc.
    cardio_zone?: string;     // "Zone 2", "Zone 4-5"
    duration?: string;        // "45 min", "4 min intervals"
}

interface WorkoutPlan {
    plan_name: string;
    summary: string;
    weeks: number;
    workouts: {
        name: string;
        day_of_week: string;
        color: string;
        estimated_duration_minutes?: number;
        exercises: WorkoutExercise[];
    }[];
}

interface PendingAction {
    type: 'create' | 'delete' | 'update';
    plan?: WorkoutPlan;
    workoutIds?: string[];
    workoutNames?: string[];
    updateData?: { workout_id: string; updates: any };
}

export default function CoachScreen() {
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const { workouts, createWorkout, deleteWorkout, updateWorkout, fetchWorkouts } = useWorkouts();
    const { exercises, createExercise, fetchExercises } = useExercises();
    const { events } = useSquadEvents();

    // Filter events created by this user
    const myCreatedEvents = events.filter(e => e.creator_id === user?.id);

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
    const [isAddingWorkouts, setIsAddingWorkouts] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    // Listen for keyboard events and use LayoutAnimation for native-speed sync
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                // Configure animation to match iOS keyboard animation
                LayoutAnimation.configureNext({
                    duration: e.duration || 250,
                    update: {
                        type: LayoutAnimation.Types.keyboard,
                    },
                });
                setKeyboardHeight(e.endCoordinates.height - 70);
                // Scroll to bottom so user sees most recent message
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                LayoutAnimation.configureNext({
                    duration: e.duration || 250,
                    update: {
                        type: LayoutAnimation.Types.keyboard,
                    },
                });
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    // Get initial greeting on mount
    useEffect(() => {
        if (messages.length === 0) {
            getInitialGreeting();
        }
    }, []);

    const getInitialGreeting = async () => {
        const greeting: Message = {
            role: 'assistant',
            content: `Hey! I'm your AI Coach. 💪\n\n⚠️ **Disclaimer**: I provide general fitness information, not medical advice. Consult a healthcare provider before starting any program, especially with injuries or medical conditions.\n\nTo build your personalized program, tell me:\n\n1. **What's your main goal?** (Strength, muscle, endurance, fat loss?)\n2. **How many days per week can you train?**\n3. **How long per session?** (45 min, 60 min, 90 min?)\n4. **Any injuries or limitations?**\n\nLet's build something great!`
        };
        setMessages([greeting]);
    };

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const userMessage: Message = { role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await callGeminiAPI([...messages, userMessage]);

            // Check for action commands (delete/update workouts, create exercises)
            const actionMatches = response.matchAll(/```action\n([\s\S]*?)\n```/g);
            for (const actionMatch of actionMatches) {
                try {
                    const actionData = JSON.parse(actionMatch[1]);

                    if (actionData.action === 'delete' && actionData.workout_ids) {
                        // Show confirmation dialog for deletion
                        const workoutNames = actionData.workout_ids
                            .map((id: string) => workouts.find(w => w.id === id)?.name || 'Unknown')
                            .join(', ');

                        Alert.alert(
                            '⚠️ Confirm Deletion',
                            `Are you sure you want to delete these workouts?\n\n${workoutNames}\n\nThis cannot be undone.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        for (const workoutId of actionData.workout_ids) {
                                            await deleteWorkout(workoutId);
                                        }
                                        await fetchWorkouts();
                                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                                        // Add confirmation message
                                        setMessages(prev => [...prev, {
                                            role: 'assistant',
                                            content: '✅ Workouts deleted successfully.'
                                        }]);
                                    }
                                }
                            ]
                        );
                    } else if (actionData.action === 'update' && actionData.workout_id) {
                        // Show confirmation dialog for update
                        const workoutName = workouts.find(w => w.id === actionData.workout_id)?.name || 'Unknown';

                        Alert.alert(
                            'Confirm Changes',
                            `Update "${workoutName}"?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Update',
                                    onPress: async () => {
                                        await updateWorkout(actionData.workout_id, actionData.updates);
                                        await fetchWorkouts();
                                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                                        setMessages(prev => [...prev, {
                                            role: 'assistant',
                                            content: '✅ Workout updated successfully.'
                                        }]);
                                    }
                                }
                            ]
                        );
                    } else if (actionData.action === 'create_exercise' && actionData.exercises) {
                        // Create new custom exercises (no confirmation needed for adding)
                        for (const exercise of actionData.exercises) {
                            await createExercise({
                                name: exercise.name,
                                muscle_group: exercise.muscle_group || 'Other',
                                description: exercise.description || ''
                            });
                        }
                        await fetchExercises();
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                } catch (e) {
                    console.log('Could not parse or execute action:', e);
                }
            }

            // Check for workout plan in response (for creating new workouts)
            const planMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (planMatch) {
                try {
                    const plan = JSON.parse(planMatch[1]);
                    if (plan.workouts && Array.isArray(plan.workouts)) {
                        setWorkoutPlan(plan);
                    }
                } catch (e) {
                    console.log('Could not parse workout plan JSON');
                }
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.replace(/```action\n[\s\S]*?\n```/g, '').replace(/```json\n[\s\S]*?\n```/g, '').trim()
            };
            setMessages(prev => [...prev, assistantMessage]);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Error calling Gemini:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again in a moment."
            };
            setMessages(prev => [...prev, errorMessage]);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const callGeminiAPI = async (conversationMessages: Message[]): Promise<string> => {
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }

        // Build user context to append to main system prompt
        // Separate personal workouts from event-synced workouts
        const personalWorkouts = workouts.filter(w => !w.source_event_name);
        const eventSyncedWorkouts = workouts.filter(w => w.source_event_name);

        const userContext = `

---

## CURRENT USER CONTEXT

**Today's Date:** ${new Date().toISOString().split('T')[0]}

**Available Exercises in User's Library:**
${exercises.length > 0 ? exercises.slice(0, 50).map(e => `- ${e.name} (${e.muscle_group})`).join('\n') : 'No exercises yet - you can create new ones.'}

**User's Personal Workouts (not linked to events):**
${personalWorkouts.length > 0 ? personalWorkouts.slice(0, 15).map(w =>
            `- ID: ${w.id} | "${w.name}" on ${w.scheduled_date}`
        ).join('\n') : 'No personal workouts scheduled yet.'}

**Event-Synced Workouts (Can edit - breaks sync for that workout):**
${eventSyncedWorkouts.length > 0 ? eventSyncedWorkouts.slice(0, 15).map(w =>
            `- ID: ${w.id} | "${w.name}" on ${w.scheduled_date} [EVENT: ${w.source_event_name}]`
        ).join('\n') : 'No event workouts synced to schedule.'}
${eventSyncedWorkouts.length > 0 ? `
ℹ️ User CAN edit these workouts - it only affects their personal copy.
Give a brief note: "This is synced from [event]. Editing it will make your copy independent. Proceed?"
Then make the edit - don't block them.
` : ''}

**Events User Created (Can Build Master Training Plans):**
${myCreatedEvents.length > 0 ? myCreatedEvents.map(e =>
            `- Event ID: ${e.id} | "${e.name}" (${e.event_type}) on ${e.event_date}`
        ).join('\n') : 'User has not created any events.'}
${myCreatedEvents.length > 0 ? `
✅ You CAN help build training plans for these events - changes sync to ALL participants.
` : ''}

**Events User Is Participating In (Cannot modify master plan, CAN edit their copies):**
${events.filter(e => e.creator_id !== user?.id && e.is_participating).slice(0, 10).map(e =>
            `- "${e.name}" by ${e.creator?.display_name || 'Unknown'}`
        ).join('\n') || 'None.'}
${events.some(e => e.creator_id !== user?.id && e.is_participating) ? `
For these events: User cannot change the master training plan, but CAN edit any synced workout on their Home page.
If they want to change the master plan: "Only the creator can modify the master plan, but I can help you customize your personal copy!"
` : ''}

**Creating New Custom Exercises:**
If the user needs an exercise that doesn't exist in their library, create it with:
\`\`\`action
{"action": "create_exercise", "exercises": [{"name": "Exercise Name", "muscle_group": "Chest/Back/Legs/Shoulders/Arms/Core/Cardio/Full Body/Other", "description": "Brief description"}]}
\`\`\`
`;

        const systemPrompt = HYBRID_COACH_SYSTEM_PROMPT + userContext;

        const contents = conversationMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'API error');
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I could not generate a response.';
    };

    const findExerciseId = (exerciseName: string): string | null => {
        let exercise = exercises.find(e =>
            e.name.toLowerCase() === exerciseName.toLowerCase()
        );
        if (!exercise) {
            exercise = exercises.find(e =>
                e.name.toLowerCase().includes(exerciseName.toLowerCase()) ||
                exerciseName.toLowerCase().includes(e.name.toLowerCase())
            );
        }
        return exercise?.id || null;
    };

    const getNextDayDate = (dayName: string): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const targetDay = days.indexOf(dayName);
        if (targetDay === -1) return today.toISOString().split('T')[0];

        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);
        return targetDate.toISOString().split('T')[0];
    };

    const handleAddToCalendar = async () => {
        if (!workoutPlan || isAddingWorkouts) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsAddingWorkouts(true);

        try {
            const today = new Date();
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weeksToSchedule = workoutPlan.weeks || 4;

            for (let week = 0; week < weeksToSchedule; week++) {
                for (const workout of workoutPlan.workouts) {
                    const targetDayIndex = daysOfWeek.indexOf(workout.day_of_week);
                    if (targetDayIndex === -1) continue;

                    const workoutDate = new Date(today);
                    const currentDayIndex = workoutDate.getDay();
                    let daysUntilTarget = targetDayIndex - currentDayIndex;
                    if (daysUntilTarget <= 0) daysUntilTarget += 7;

                    workoutDate.setDate(workoutDate.getDate() + daysUntilTarget + (week * 7));
                    const scheduledDate = workoutDate.toISOString().split('T')[0];

                    const exerciseIds = workout.exercises
                        .map(ex => findExerciseId(ex.name))
                        .filter((id): id is string => id !== null);

                    const customSets: { [key: string]: { weight: number; reps: number }[] } = {};
                    workout.exercises.forEach(ex => {
                        const exerciseId = findExerciseId(ex.name);
                        if (exerciseId) {
                            const numSets = ex.sets || 3;
                            customSets[exerciseId] = Array(numSets).fill({
                                weight: 0,
                                reps: parseInt(ex.reps) || 10
                            });
                        }
                    });

                    await createWorkout({
                        name: workout.name,
                        scheduled_date: scheduledDate,
                        color: workout.color || '#1e3a5f'
                    }, exerciseIds, customSets);
                }
            }

            setAddSuccess(true);
            setWorkoutPlan(null);
            await fetchWorkouts();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Add success message
            const successMessage: Message = {
                role: 'assistant',
                content: `✅ Done! I've added ${workoutPlan.weeks || 4} weeks of workouts to your calendar. Check your Home screen to see them!\n\nWould you like me to help with anything else?`
            };
            setMessages(prev => [...prev, successMessage]);

            setTimeout(() => setAddSuccess(false), 3000);
        } catch (err) {
            console.error('Error adding workouts:', err);
            Alert.alert('Error', 'Failed to add workouts. Please try again.');
        } finally {
            setIsAddingWorkouts(false);
        }
    };

    const handleNewChat = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessages([]);
        setWorkoutPlan(null);
        setAddSuccess(false);
        setTimeout(() => getInitialGreeting(), 100);
    };

    return (
        <ScreenLayout hideHeader>
            <View
                style={[styles.keyboardView, { paddingBottom: keyboardHeight }]}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: themeColors.glassBorder }]}>
                    <View style={styles.headerLeft}>
                        <Feather name="cpu" size={20} color="#c9a227" />
                        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>AI Coach</Text>
                    </View>
                    {messages.length > 1 && (
                        <Pressable style={styles.newChatBtn} onPress={handleNewChat}>
                            <Feather name="refresh-cw" size={18} color={themeColors.textSecondary} />
                        </Pressable>
                    )}
                </View>



                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((message, index) => (
                        <View
                            key={index}
                            style={[
                                styles.messageRow,
                                message.role === 'user' ? styles.userRow : styles.assistantRow,
                            ]}
                        >
                            {message.role === 'assistant' && (
                                <View style={[styles.avatar, { backgroundColor: themeColors.glassBg }]}>
                                    <Feather name="cpu" size={16} color="#c9a227" />
                                </View>
                            )}
                            <View
                                style={[
                                    styles.messageBubble,
                                    message.role === 'user'
                                        ? [styles.userBubble, { backgroundColor: '#1e3a5f' }]
                                        : [styles.assistantBubble, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }],
                                ]}
                            >
                                <Text style={[styles.messageText, { color: themeColors.textPrimary }]}>
                                    {message.content}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {isLoading && (
                        <View style={[styles.messageRow, styles.assistantRow]}>
                            <View style={[styles.avatar, { backgroundColor: themeColors.glassBg }]}>
                                <Feather name="cpu" size={16} color="#c9a227" />
                            </View>
                            <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: themeColors.glassBg }]}>
                                <View style={styles.typingIndicator}>
                                    <View style={[styles.dot, styles.dot1]} />
                                    <View style={[styles.dot, styles.dot2]} />
                                    <View style={[styles.dot, styles.dot3]} />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Workout Plan Preview */}
                    {workoutPlan && !addSuccess && (
                        <View style={[styles.planCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                            <Text style={[styles.planTitle, { color: themeColors.textPrimary }]}>
                                {workoutPlan.plan_name || 'Your Workout Plan'}
                            </Text>
                            <Text style={[styles.planSummary, { color: themeColors.textSecondary }]}>
                                {workoutPlan.summary}
                            </Text>

                            <View style={styles.planWorkouts}>
                                {workoutPlan.workouts.slice(0, 4).map((workout, index) => (
                                    <View
                                        key={index}
                                        style={[styles.planWorkoutItem, { borderLeftColor: workout.color || '#1e3a5f' }]}
                                    >
                                        <View style={styles.planWorkoutHeader}>
                                            <Text style={[styles.planWorkoutName, { color: themeColors.textPrimary }]}>
                                                {workout.name}
                                            </Text>
                                            <Text style={[styles.planWorkoutDay, { color: themeColors.textSecondary }]}>
                                                {workout.day_of_week}
                                            </Text>
                                        </View>
                                        <View style={styles.planExercises}>
                                            {workout.exercises.slice(0, 3).map((ex, i) => (
                                                <View key={i} style={[styles.exerciseTag, { backgroundColor: themeColors.inputBg }]}>
                                                    <Text style={[styles.exerciseTagText, { color: themeColors.textSecondary }]}>
                                                        {ex.name}
                                                    </Text>
                                                </View>
                                            ))}
                                            {workout.exercises.length > 3 && (
                                                <View style={[styles.exerciseTag, { backgroundColor: themeColors.inputBg }]}>
                                                    <Text style={[styles.exerciseTagText, { color: themeColors.textMuted }]}>
                                                        +{workout.exercises.length - 3}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <Pressable
                                style={[styles.addBtn, isAddingWorkouts && styles.addBtnDisabled]}
                                onPress={handleAddToCalendar}
                                disabled={isAddingWorkouts}
                            >
                                {isAddingWorkouts ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Feather name="calendar" size={18} color="#fff" />
                                        <Text style={styles.addBtnText}>
                                            Add {workoutPlan.weeks || 4} Weeks to Calendar
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}

                    <View style={{ height: 16 }} />
                </ScrollView>

                {/* Input Area */}
                <View style={[styles.inputContainer, { borderTopColor: themeColors.glassBorder }]}>
                    <View style={[styles.inputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                        <TextInput
                            style={[styles.input, { color: themeColors.textPrimary }]}
                            placeholder="Ask me about your training..."
                            placeholderTextColor={themeColors.textMuted}
                            value={inputValue}
                            onChangeText={setInputValue}
                            editable={!isLoading}
                            multiline
                            maxLength={1000}
                        />
                        <Pressable
                            style={[styles.sendBtn, (!inputValue.trim() || isLoading) && styles.sendBtnDisabled]}
                            onPress={() => sendMessage(inputValue)}
                            disabled={!inputValue.trim() || isLoading}
                        >
                            <Feather name="send" size={20} color={inputValue.trim() && !isLoading ? '#fff' : themeColors.textMuted} />
                        </Pressable>
                    </View>
                </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    newChatBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    assistantRow: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#c9a227',
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.6 },
    dot3: { opacity: 0.8 },
    planCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginTop: 12,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    planSummary: {
        fontSize: 14,
        marginBottom: 16,
    },
    planWorkouts: {
        gap: 12,
        marginBottom: 16,
    },
    planWorkoutItem: {
        borderLeftWidth: 3,
        paddingLeft: 12,
    },
    planWorkoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    planWorkoutName: {
        fontSize: 15,
        fontWeight: '600',
    },
    planWorkoutDay: {
        fontSize: 12,
    },
    planExercises: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    exerciseTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    exerciseTagText: {
        fontSize: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1e3a5f',
        paddingVertical: 14,
        borderRadius: 12,
    },
    addBtnDisabled: {
        opacity: 0.6,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    inputContainer: {
        padding: 12,
        borderTopWidth: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingTop: 8,
        paddingBottom: 8,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendBtnDisabled: {
        backgroundColor: 'transparent',
    },
});
