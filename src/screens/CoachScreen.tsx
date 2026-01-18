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
import { useTrainingTemplates } from '../hooks/useTrainingTemplates';
import { useAthleteProfile } from '../hooks/useAthleteProfile';
import { useUserStats } from '../hooks/useUserStats';
import LiabilityWaiverModal from '../components/LiabilityWaiverModal';
import ScreenLayout from '../components/ScreenLayout';
import { buildDynamicPromptAsync, detectTrainingIntent } from '../lib/coachKnowledge';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    workoutPlan?: WorkoutPlan;
    pendingAction?: PendingAction;
    actionCompleted?: boolean;
    actionSuccess?: boolean;
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
    type: 'delete' | 'update' | 'log_workout' | 'add_exercise' | 'remove_exercise';
    workoutIds?: string[];
    workoutNames?: string[];
    updateData?: { workout_id: string; updates: any };
    data?: any;
    summary?: string;
}

// Animated Typing Indicator Component
const TypingIndicator = () => {
    const { themeColors } = useTheme();
    // Create animated values for 3 dots
    const opacity1 = useRef(new Animated.Value(0.3)).current;
    const opacity2 = useRef(new Animated.Value(0.3)).current;
    const opacity3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                        delay: delay,
                    }),
                    Animated.timing(anim, {
                        toValue: 0.3,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animate(opacity1, 0);
        animate(opacity2, 250);
        animate(opacity3, 500);
    }, []);

    return (
        <View style={styles.typingIndicator}>
            <Animated.View style={[styles.dot, { opacity: opacity1, backgroundColor: themeColors.textPrimary }]} />
            <Animated.View style={[styles.dot, { opacity: opacity2, backgroundColor: themeColors.textPrimary }]} />
            <Animated.View style={[styles.dot, { opacity: opacity3, backgroundColor: themeColors.textPrimary }]} />
        </View>
    );
};

export default function CoachScreen() {
    const { themeColors, colors: userColors } = useTheme();
    const { user } = useAuth();
    const {
        workouts,
        createWorkout,
        deleteWorkout,
        updateWorkout,
        fetchWorkouts,
        addExercisesToWorkout,
        removeExerciseFromWorkout
    } = useWorkouts();
    const { exercises, createExercise, fetchExercises } = useExercises();
    const { events } = useSquadEvents();
    const { templates, formatTemplatesForAI } = useTrainingTemplates();
    const { profile, updateProfile } = useAthleteProfile();
    const { stats, fetchStats } = useUserStats();
    const [showLiabilityModal, setShowLiabilityModal] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Filter events created by this user
    const myCreatedEvents = events.filter(e => e.creator_id === user?.id);

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [processingActionId, setProcessingActionId] = useState<string | null>(null);

    // Helper to generate IDs
    const genId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // RevenueCat Integration
    const { isPro, isLoading: isPurchasesLoading } = useRevenueCat();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();



    const getInitialGreeting = async () => {
        const greeting: Message = {
            id: genId(),
            role: 'assistant',
            content: `Welcome to the HYBRID AI Coach! 🚀\n\nI can help you in two ways:\n\n1. Build a New Program\nDesign a training block tailored to your exact goal using proven methodologies.\nExamples:\n- "Build me an 8-week Hyrox prep program."\n- "I want to get better at CrossFit gymnastics."\n- "Create a 3-day powerlifting split."\n- "Prepare me for a sub-4 hour marathon."\n\n2. Manage Your Training\nHandle your day-to-day logging and schedule adjustments.\nExamples:\n- "I just ran 5k in 24 mins, please log it."\n- "Add 3 sets of bench press to today's workout."\n- "Push all my workouts back by one day."\n- "I hurt my shoulder, can we swap overhead press for something else?"\n\nWhat would you like to work on today?`
        };
        setMessages([greeting]);
    };

    const scrollViewRef = useRef<ScrollView>(null);

    const handleConfirmAction = async (msgId: string, action: PendingAction) => {
        setProcessingActionId(msgId);

        try {
            if (action.type === 'delete' && action.workoutIds) {
                for (const workoutId of action.workoutIds) {
                    await deleteWorkout(workoutId);
                }
            } else if (action.type === 'update' && action.updateData) {
                await updateWorkout(action.updateData.workout_id, action.updateData.updates);
            } else if (action.type === 'log_workout' && action.data) {
                const actionData = action.data;
                const exerciseIds = [];
                const customSets: any = {};

                if (actionData.exercises) {
                    for (const ex of actionData.exercises) {
                        let exId = findExerciseId(ex.name);
                        if (!exId) {
                            const { data: newEx } = await createExercise({ name: ex.name, muscle_group: 'Other' });
                            if (newEx) exId = newEx.id;
                        }
                        if (exId) {
                            exerciseIds.push(exId);
                            customSets[exId] = Array(ex.sets || 3).fill({
                                weight: parseFloat(ex.weight?.toString() || '0') || 0,
                                reps: parseFloat(ex.reps?.toString() || '0') || 0,
                                is_completed: true
                            });
                        }
                    }
                }
                await createWorkout({
                    name: actionData.name || 'Ad-Hoc Workout',
                    scheduled_date: actionData.date || new Date().toISOString().split('T')[0],
                    color: '#3b82f6'
                }, exerciseIds, customSets);
            } else if (action.type === 'add_exercise' && action.data) {
                const actionData = action.data;
                const exerciseIds = [];
                const customSets: any = {};
                if (actionData.exercises) {
                    for (const ex of actionData.exercises) {
                        let exId = findExerciseId(ex.name);
                        if (!exId) {
                            const { data: newEx } = await createExercise({ name: ex.name, muscle_group: 'Other' });
                            if (newEx) exId = newEx.id;
                        }
                        if (exId) {
                            exerciseIds.push(exId);
                            customSets[exId] = Array(ex.sets || 3).fill({
                                weight: parseFloat(ex.weight?.toString() || '0') || 0,
                                reps: parseFloat(ex.reps?.toString() || '0') || 0,
                                is_completed: false
                            });
                        }
                    }
                }
                await addExercisesToWorkout(actionData.workout_id, exerciseIds, customSets);
            } else if (action.type === 'remove_exercise' && action.data) {
                const exId = findExerciseId(action.data.exercise_name);
                if (exId) {
                    await removeExerciseFromWorkout(action.data.workout_id, exId);
                }
            }

            await fetchWorkouts();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Mark action as completed in history
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionCompleted: true, actionSuccess: true } : m));

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to execute action.');
        } finally {
            setProcessingActionId(null);
        }
    };


    // Check for liability waiver agreement
    useEffect(() => {
        if (!isPurchasesLoading && isPro && profile) {
            // If user hasn't agreed to terms yet, show modal
            if (!profile.agreed_to_terms_at) {
                setShowLiabilityModal(true);
            }
        }
    }, [isPurchasesLoading, isPro, profile]);

    const handleAgreeToTerms = async () => {
        setIsUpdatingProfile(true);
        const { error } = await updateProfile({ agreed_to_terms_at: new Date().toISOString() });
        setIsUpdatingProfile(false);

        if (!error) {
            setShowLiabilityModal(false);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Alert.alert('Error', 'Could not save your agreement. Please try again.');
        }
    };

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
                }, 300);
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
            fetchStats();
            getInitialGreeting();
        }
    }, []);

    // Block interaction while loading or if not pro
    if (isPurchasesLoading) {
        return (
            <ScreenLayout hideHeader>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#c9a227" />
                </View>
            </ScreenLayout>
        );
    }

    // Show inline paywall if not Pro - user cannot bypass this
    if (!isPro) {
        return (
            <ScreenLayout hideHeader>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Feather name="lock" size={64} color={userColors.accent_color} style={{ marginBottom: 20 }} />
                    <Text style={{ color: themeColors.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
                        AI Coach is a Pro Feature
                    </Text>
                    <Text style={{ color: themeColors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                        Subscribe to HYBRID Pro to unlock unlimited AI coaching and personalized workout plans.
                    </Text>
                    <Pressable
                        style={{
                            backgroundColor: userColors.accent_color,
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            borderRadius: 28,
                        }}
                        onPress={() => navigation.navigate('Paywall', { fromCoach: true })}
                    >
                        <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>Upgrade to Pro</Text>
                    </Pressable>
                </View>
            </ScreenLayout>
        );
    }



    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const userMessage: Message = { id: genId(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            console.log('--- Sending User Message ---', userMessage.content);
            const response = await callGeminiAPI([...messages, userMessage]);
            console.log('--- Raw AI Response ---', response);

            // Universal Code Block Matcher
            const validMatches: string[] = [];
            let processedResponse = response;

            // 1. Extract and remove valid closed blocks
            const closedBlockRegex = /```(?:json|action)?\s*([\s\S]*?)\s*```/g;
            let match;
            while ((match = closedBlockRegex.exec(response)) !== null) {
                validMatches.push(match[1]);
                processedResponse = processedResponse.replace(match[0], '');
            }

            // 2. Check for and remove unclosed/truncated blocks at the end
            const unclosedBlockRegex = /```(?:json|action)?\s*([\s\S]*)$/;
            const unclosedMatch = processedResponse.match(unclosedBlockRegex);

            if (unclosedMatch) {
                console.log('--- Detected Truncated/Unclosed Block ---');
                processedResponse = processedResponse.replace(unclosedBlockRegex, '');

                // If we found NO valid closed blocks but DID find an unclosed one, it's a failure.
                if (validMatches.length === 0) {
                    processedResponse += '\n\n(⚠️ Error: The generated plan was too long and got cut off. Please ask for a shorter duration, e.g., "4 weeks".)';
                }
            }

            console.log(`--- Found ${validMatches.length} Valid Code Blocks ---`);

            let detectedPlan: WorkoutPlan | undefined;
            let detectedAction: PendingAction | undefined;

            for (const jsonContent of validMatches) {
                try {
                    const data = JSON.parse(jsonContent.trim());

                    if (data.action) {
                        if (data.action === 'update_memory' && data.memory) {
                            console.log('Updating AI Memory:', data.memory);
                            const current = profile?.ai_preferences || '';
                            const newMemory = current ? current + '\n- ' + data.memory : '- ' + data.memory;
                            await updateProfile({ ai_preferences: newMemory });
                            continue;
                        }

                        if (data.action === 'delete') {
                            const names = data.workout_ids?.map((id: string) => workouts.find(w => w.id === id)?.name || 'Unknown');
                            detectedAction = { type: 'delete', workoutIds: data.workout_ids, workoutNames: names };
                        } else if (data.action === 'update') {
                            const name = workouts.find(w => w.id === data.workout_id)?.name || 'Unknown';
                            detectedAction = { type: 'update', updateData: { workout_id: data.workout_id, updates: data.updates }, workoutNames: [name] };
                        } else if (data.action === 'log_workout') {
                            detectedAction = { type: 'log_workout', data: data };
                        } else if (data.action === 'add_exercise') {
                            const targetWorkout = workouts.find(w => w.id === data.workout_id);
                            const label = targetWorkout ? `${targetWorkout.name} (${targetWorkout.scheduled_date})` : 'Unknown Workout';
                            detectedAction = { type: 'add_exercise', data: data, workoutNames: [label] };
                        } else if (data.action === 'remove_exercise') {
                            detectedAction = { type: 'remove_exercise', data: data };
                        } else if (data.action === 'create_exercise' && data.exercises) {
                            for (const exercise of data.exercises) {
                                await createExercise({
                                    name: exercise.name,
                                    muscle_group: exercise.muscle_group || 'Other',
                                    description: exercise.description || ''
                                });
                            }
                            await fetchExercises();
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else if (data.action === 'PROPOSE_PLAN' && data.plan) {
                            detectedPlan = data.plan;
                        }
                    } else if (data.workouts && Array.isArray(data.workouts)) {
                        detectedPlan = data;
                    }
                } catch (e) {
                    console.log('Error parsing code block JSON:', e);
                }
            }

            const cleanContent = processedResponse.trim();

            if (cleanContent || detectedPlan || detectedAction) {
                const assistantMessage: Message = {
                    id: genId(),
                    role: 'assistant',
                    content: cleanContent,
                    workoutPlan: detectedPlan,
                    pendingAction: detectedAction
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error('Error calling Gemini:', error);
            const errorMessage: Message = {
                id: genId(),
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

**Today's Date:** ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${new Date().toISOString().split('T')[0]})

**User's Long-Term Memory (Preferences & Facts):**
${profile?.ai_preferences || "No specific preferences learned yet."}

**User's Strength Profile (Estimated 1RM):**
${stats ? `
- Bench Press: ${stats.bench_press} lbs
- Squat: ${stats.squat} lbs
- Deadlift: ${stats.deadlift} lbs
- Overhead Press: ${stats.overhead_press} lbs
- Total Workouts Logged: ${stats.total_workouts}
` : 'Stats not yet calculated.'}

**Instructions for Weight Recommendations:**
1. **CHECK HISTORY FIRST:** Look for the "User's Strength Profile" above. If a relevant max exists, use it to calculate working weights (e.g. 70-80% of 1RM for hypertrophy).
2. **IF NO HISTORY:** Do NOT guess random weights. 
   - Check "Memory" for Experience Level (Beginner vs Advanced).
   - **ASK THE USER:** "I don't have a max for Squat logged. What's the heaviest you've lifted recently?" or "What weights do you usually use?"
   - Only suggest a weight if you explicitly label it as a "starting point" (e.g. "Try 95lbs to start").
   - **JSON OUTPUT RULE:** You MUST Include a \`weight\` field for every exercise.
     - For weighted lifts, it MUST be a number > 0 (e.g. 45, 65, 95). NEVER LEAVE IT 0 or NULL for barbell/dumbbell work.
     - For Bodyweight exercises, explicitly use 0.

**Instructions for Memory:**
1. You have access to the "Memory" above. Use it to personalize advice (e.g. if User has knee injury, avoid heavy plyometrics).
2. If the user mentions a NEW preference, goal, or fact (e.g. "I hate running", "I have only 30 mins a day", "My gym has no cables"), SAVE IT using the \`update_memory\` action.
   Response format:
   \`\`\`action
   {"action": "update_memory", "memory": "User hates running."}
   \`\`\`
   (You can perform this action AND reply to the user in the same message).

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

${templates.length > 0 ? `
**Reference Training Templates:**
${formatTemplatesForAI(5)}

Use these templates as structural inspiration when building programs. Adapt based on user's specific needs, available time, and equipment.

IMPORTANT: When generating custom Workout Plans (PROPOSE_PLAN):
1. **LIMIT THE OUTPUT TO 4 WEEKS MAX (Phase 1).**
2. If the user asks for more (e.g. 12 weeks), EXPLICITLY STATE: "I've designed the first 4 weeks (Phase 1) to get you started. We can generate Phase 2 next." and ONLY provide the first 4 weeks in the JSON.
3. This is CRITICAL to ensure the plan fits in the response.
` : ''}
`;

        // Build conversation text for intent detection
        const conversationText = conversationMessages.map(m => m.content).join(' ');

        // Get dynamic prompt based on conversation intent (with LLM fallback)
        const { prompt: dynamicBasePrompt, detectedIntents, usedLLM } = await buildDynamicPromptAsync(
            conversationText,
            GEMINI_API_KEY || ''
        );

        if (usedLLM) {
            console.log('Used LLM for intent detection, found:', detectedIntents);
        } else {
            console.log('Keyword detection found:', detectedIntents);
        }

        const systemPrompt = dynamicBasePrompt + '\n\n---\n\n' + userContext;

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
                        maxOutputTokens: 8192,
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

        let dateToUse = today;

        if (targetDay !== -1) {
            const currentDay = today.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil < 0) daysUntil += 7; // Allow 0 (today)

            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntil);
            dateToUse = targetDate;
        }

        const year = dateToUse.getFullYear();
        const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
        const day = String(dateToUse.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleAddToCalendar = async (plan: WorkoutPlan, msgId: string) => {
        if (processingActionId === msgId) return;

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProcessingActionId(msgId);

        try {
            const today = new Date();
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weeksToSchedule = plan.weeks || 4;

            for (let week = 0; week < weeksToSchedule; week++) {
                for (const workout of plan.workouts) {
                    const targetDayIndex = daysOfWeek.indexOf(workout.day_of_week);
                    if (targetDayIndex === -1) continue;

                    const workoutDate = new Date(today);
                    const currentDayIndex = workoutDate.getDay();
                    let daysUntilTarget = targetDayIndex - currentDayIndex;
                    if (daysUntilTarget < 0) daysUntilTarget += 7;

                    workoutDate.setDate(workoutDate.getDate() + daysUntilTarget + (week * 7));

                    const year = workoutDate.getFullYear();
                    const month = String(workoutDate.getMonth() + 1).padStart(2, '0');
                    const day = String(workoutDate.getDate()).padStart(2, '0');
                    const scheduledDate = `${year}-${month}-${day}`;

                    const exerciseIds = workout.exercises
                        .map(ex => findExerciseId(ex.name))
                        .filter((id): id is string => id !== null);

                    const customSets: { [key: string]: { weight: number; reps: number }[] } = {};
                    workout.exercises.forEach(ex => {
                        const exerciseId = findExerciseId(ex.name);
                        if (exerciseId) {
                            const numSets = (ex as any).sets || 3;
                            customSets[exerciseId] = Array(numSets).fill({
                                weight: 0,
                                reps: parseInt((ex as any).reps) || 10
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

            await fetchWorkouts();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Mark action as completed in history
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionCompleted: true, actionSuccess: true } : m));

        } catch (err) {
            console.error('Error adding workouts:', err);
            Alert.alert('Error', 'Failed to add workouts. Please try again.');
        } finally {
            setProcessingActionId(null);
        }
    };

    const handleNewChat = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessages([]);
        setTimeout(() => getInitialGreeting(), 100);
    };

    return (
        <ScreenLayout hideHeader>
            <LiabilityWaiverModal
                visible={showLiabilityModal}
                onAgree={handleAgreeToTerms}
                isUpdating={isUpdatingProfile}
            />
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
                    onContentSizeChange={() => {
                        if (messages.length > 1) {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                        }
                    }}
                >
                    {messages.map((message, index) => (
                        <View key={message.id || index} style={{ marginBottom: 16 }}>
                            <View
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

                            {/* Render Workout Plan if attached */}
                            {message.workoutPlan && (
                                <View style={[styles.planCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                                    <Text style={[styles.planTitle, { color: themeColors.textPrimary }]}>
                                        {message.workoutPlan.plan_name || 'Your Workout Plan'}
                                    </Text>
                                    <Text style={[styles.planSummary, { color: themeColors.textSecondary }]}>
                                        {message.workoutPlan.summary}
                                    </Text>

                                    <View style={styles.planWorkouts}>
                                        {message.workoutPlan.workouts.slice(0, 4).map((workout, index) => (
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
                                                    {workout.exercises.map((ex, i) => (
                                                        <View key={i} style={[styles.exerciseTag, { backgroundColor: themeColors.inputBg }]}>
                                                            <Text style={[styles.exerciseTagText, { color: themeColors.textSecondary }]}>
                                                                {ex.name}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    <Pressable
                                        style={[
                                            styles.addBtn,
                                            (processingActionId === message.id || message.actionCompleted) && styles.addBtnDisabled
                                        ]}
                                        onPress={() => message.workoutPlan && handleAddToCalendar(message.workoutPlan, message.id)}
                                        disabled={processingActionId === message.id || message.actionCompleted}
                                    >
                                        {processingActionId === message.id ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : message.actionSuccess ? (
                                            <>
                                                <Feather name="check" size={18} color="#fff" />
                                                <Text style={styles.addBtnText}>Added to Calendar</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Feather name="calendar" size={18} color="#fff" />
                                                <Text style={styles.addBtnText}>
                                                    {message.workoutPlan.weeks === 1 && message.workoutPlan.workouts.length === 1
                                                        ? `Add ${message.workoutPlan.workouts[0].name} to Calendar`
                                                        : `Add ${message.workoutPlan.weeks || 4} Week${(message.workoutPlan.weeks || 4) > 1 ? 's' : ''} to Calendar`}
                                                </Text>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                            )}

                            {/* Render Pending Action if attached */}
                            {message.pendingAction && (
                                <View style={[styles.pendingActionContainer, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.glassBorder }]}>
                                    <View style={styles.pendingActionHeader}>
                                        <Feather name="alert-circle" size={20} color={userColors.accent_color} />
                                        <Text style={[styles.pendingActionTitle, { color: themeColors.textPrimary }]}>
                                            {message.pendingAction.type === 'delete' ? 'Delete Workouts?' :
                                                message.pendingAction.type === 'update' ? 'Update Workout?' :
                                                    message.pendingAction.type === 'log_workout' ? 'Log Workout?' :
                                                        message.pendingAction.type === 'add_exercise' ? 'Add Exercises?' :
                                                            message.pendingAction.type === 'remove_exercise' ? 'Remove Exercise?' : 'Confirm Action'}
                                        </Text>
                                    </View>

                                    <Text style={[styles.pendingActionDescription, { color: themeColors.textSecondary }]}>
                                        {message.pendingAction.type === 'delete' ? `Are you sure you want to delete:\n${message.pendingAction.workoutNames?.join('\n')}` :
                                            message.pendingAction.type === 'update' ? `Update "${message.pendingAction.workoutNames?.[0]}"?` :
                                                message.pendingAction.type === 'log_workout' ? `Log this workout?\n${message.pendingAction.data?.name || 'Workout'}` :
                                                    message.pendingAction.type === 'add_exercise' ? `Add to ${message.pendingAction.workoutNames?.[0]}:\n${message.pendingAction.data?.exercises?.map((e: any) => `• ${e.name}`).join('\n')}` :
                                                        message.pendingAction.type === 'remove_exercise' ? `Remove "${message.pendingAction.data?.exercise_name}"?` :
                                                            'Please confirm this change.'}
                                    </Text>

                                    {message.actionCompleted ? (
                                        <View style={[styles.actionBtn, { backgroundColor: 'transparent', alignSelf: 'flex-start', paddingLeft: 0 }]}>
                                            <Feather name="check" size={16} color="green" />
                                            <Text style={[styles.actionBtnText, { color: 'green', marginLeft: 6 }]}>Completed</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.pendingActionButtons}>
                                            <Pressable
                                                style={[styles.actionBtn, { backgroundColor: themeColors.bgTertiary }]}
                                                onPress={() => {
                                                    // Cancel just marks it as completed (or removed?)
                                                    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, actionCompleted: true, content: m.content + '\n(Action Cancelled)' } : m));
                                                }}
                                            >
                                                <Text style={[styles.actionBtnText, { color: themeColors.textPrimary }]}>Cancel</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.actionBtn, { backgroundColor: userColors.accent_color }]}
                                                onPress={() => message.pendingAction && handleConfirmAction(message.id, message.pendingAction)}
                                            >
                                                {processingActionId === message.id ? (
                                                    <ActivityIndicator color="#000" size="small" />
                                                ) : (
                                                    <Text style={[styles.actionBtnText, { color: '#000' }]}>Confirm</Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}

                    {isLoading && (
                        <View style={[styles.messageRow, styles.assistantRow]}>
                            <View style={[styles.avatar, { backgroundColor: themeColors.glassBg }]}>
                                <Feather name="cpu" size={16} color="#c9a227" />
                            </View>
                            <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: themeColors.glassBg }]}>
                                <TypingIndicator />
                            </View>
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
    pendingActionContainer: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    pendingActionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    pendingActionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    pendingActionDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    pendingActionButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'flex-end',
    },
    actionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    actionBtnText: {
        fontWeight: '600',
        fontSize: 14,
    },
});
