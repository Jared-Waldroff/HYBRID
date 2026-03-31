import React, { useEffect } from 'react';
import { View, Pressable, Text, Animated, Dimensions } from 'react-native';
import { NavigationContainer, DarkTheme, getFocusedRouteNameFromRoute, NavigatorScreenParams, LinkingOptions, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MIN_TOUCH_TARGET } from '../theme';
import AppHeader from '../components/AppHeader';
import StatusBarGlow from '../components/StatusBarGlow';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { savePendingInvite, extractInviteCode } from '../lib/pendingInvite';
import { addNotificationListeners } from '../services/notificationService';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import CoachScreen from '../screens/CoachScreen';
import SquadScreen from '../screens/SquadScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import CrossFitWorkoutScreen from '../screens/CrossFitWorkoutScreen';
import AthleteProfileScreen from '../screens/AthleteProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SquadEventsScreen from '../screens/SquadEventsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ActivityFeedScreen from '../screens/ActivityFeedScreen';
import CompleteEventWorkoutScreen from '../screens/CompleteEventWorkoutScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ManageEventPlanScreen from '../screens/ManageEventPlanScreen';
import PaywallScreen from '../screens/PaywallScreen';

import AdminScreen from '../screens/AdminScreen';
import CommentsScreen from '../screens/CommentsScreen';
import BadgesScreen from '../screens/BadgesScreen';

// Type definitions for navigation
export type RootStackParamList = {
    Auth: undefined;
    Main: NavigatorScreenParams<MainTabParamList>; // Updated for nested linking
    Login: undefined;
    Onboarding: undefined;
    CreateWorkout: { date?: string };
    ActiveWorkout: { id: string };
    ExerciseDetail: { exerciseId: string; exerciseName: string };
    CrossFitWorkout: { id: string };
    AthleteProfile: { id: string };
    Notifications: undefined;
    NotificationSettings: undefined;
    Settings: undefined;
    // Squad Events
    SquadEvents: undefined;
    EventDetail: { id: string };
    ActivityFeed: { eventId?: string };
    CreatePost: { eventId?: string; eventName?: string };
    ManageEventPlan: { eventId: string; eventName: string; eventDate: string; eventType: string };
    CompleteEventWorkout: { trainingWorkoutId: string; eventId: string };
    Paywall: { fromCoach?: boolean } | undefined;
    Comments: { postId: string };
    Admin: undefined;
    Badges: { user: any };
};

export type MainTabParamList = {
    Home: NavigatorScreenParams<HomeStackParamList> | undefined;
    Calendar: undefined;
    Exercises: NavigatorScreenParams<ExercisesStackParamList> | undefined;
    Coach: undefined;
    Squad: NavigatorScreenParams<SquadStackParamList>;
    SettingsTab: undefined;
    BadgesTab: { id?: string } | undefined;
    NotificationsTab: undefined;
};

export type HomeStackParamList = {
    HomeMain: { selectedDate?: string; timestamp?: number } | undefined;
    ActiveWorkout: { id: string };
    CrossFitWorkout: { id: string };
    ExerciseDetail: { exerciseId: string; exerciseName: string };
    CreateWorkout: { date?: string };
    AthleteProfile: { id: string };
    ActivityFeed: { eventId?: string };
    CreatePost: { eventId?: string; eventName?: string };
    Comments: { postId: string };
    CompleteEventWorkout: { trainingWorkoutId: string; eventId: string };
    Badges: { user: any }; // Added to fix type error
};

export type ExercisesStackParamList = {
    ExercisesMain: undefined;
    ExerciseDetail: { exerciseId: string; exerciseName: string };
};

export type SquadStackParamList = {
    SquadMain: { initialTab?: 'feed' | 'events' | 'members'; inviteCode?: string };
    CreateEvent: undefined;
    CreatePost: { eventId?: string; eventName?: string };
    EventDetail: { id: string };
    ManageEventPlan: { eventId: string; eventName: string; eventDate: string; eventType: string };
    SquadEvents: undefined;
    ActivityFeed: { eventId?: string };
    CompleteEventWorkout: { trainingWorkoutId: string; eventId: string };
    Comments: { postId: string };
    AthleteProfile: { id?: string };
    Badges: { user: any };
};

export type SettingsStackParamList = {
    SettingsMain: undefined;
    CreatePost: { eventId?: string; eventName?: string };
    Badges: { user: any };
    Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

// Tab icons mapping
const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
    NotificationsTab: 'bell',
    Home: 'home',
    Calendar: 'calendar',
    Exercises: 'activity',
    Coach: 'user',
    Squad: 'users',
    SettingsTab: 'settings',
    BadgesTab: 'award',
};

function MainTabs() {
    const { themeColors, colors: userColors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    // Custom tab bar that hides Notifications and Settings tabs
    const CustomTabBar = ({ state, descriptors, navigation, position }: any) => {
        // Only render tabs 1-5 (skip NotificationsTab at 0 and SettingsTab at 6)
        const visibleRoutes = state.routes.slice(1, 6);

        // Calculate which visible tab is focused (adjust for hidden tabs)
        // state.index 0 = Notifications (hidden), 1-5 = visible tabs, 6 = Settings (hidden)
        const getVisibleFocusedIndex = () => {
            if (state.index <= 0) return 0; // On Notifications, highlight Home
            if (state.index >= 6) return 4; // On Settings, highlight Squad
            return state.index - 1; // Adjust for hidden Notifications tab
        };
        const visibleFocusedIndex = getVisibleFocusedIndex();

        return (
            <View style={{
                backgroundColor: themeColors.bgSecondary,
                borderTopWidth: 1,
                borderTopColor: `${userColors.accent_color}30`,
                height: 70,
                paddingBottom: 10,
            }}>
                {/* Tab buttons */}
                <View style={{ flexDirection: 'row', flex: 1 }}>
                    {visibleRoutes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        // Adjust index since we're showing tabs 1-5 (add 1 to match actual state.index)
                        const actualIndex = index + 1;
                        // Highlight if focused
                        const isFocused = state.index === actualIndex;
                        const color = isFocused ? userColors.accent_color : themeColors.textMuted;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <Pressable
                                key={route.key}
                                onPress={onPress}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Feather name={TAB_ICONS[route.name as keyof MainTabParamList]} size={22} color={color} />
                                <Text style={{ fontSize: 13, fontWeight: '500', marginTop: 0, color }}>{options.tabBarLabel}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Animated underline indicator */}
                <Animated.View style={{
                    position: 'absolute',
                    bottom: 0,
                    height: 3,
                    width: '20%',
                    backgroundColor: userColors.accent_color,
                    transform: [{
                        translateX: position.interpolate({
                            // position goes from 0-7 (8 tabs total)
                            // Notifications (0), Home(1)-Squad(5) visible, Settings(6), Badges(7) hidden right
                            inputRange: [0, 1, 2, 3, 4, 5, 6, 7],
                            outputRange: [
                                -screenWidth * 0.2,  // Notifications -> off screen left
                                0,  // Home
                                screenWidth * 0.2,  // Calendar
                                screenWidth * 0.4,  // Exercises
                                screenWidth * 0.6,  // Coach
                                screenWidth * 0.8,  // Squad
                                screenWidth,         // Settings -> off screen right
                                screenWidth * 1.2,   // Badges -> further right
                            ],
                            extrapolate: 'clamp',
                        }),
                    }],
                }} />
            </View>
        );
    };

    return (
        <Tab.Navigator
            id="MainTabs"
            tabBarPosition="bottom"
            tabBar={CustomTabBar}
            initialRouteName="Home"
            screenOptions={{
                swipeEnabled: true,
                animationEnabled: true,
                lazy: true,
            }}
        >
            {/* Hidden Notifications tab - accessible by swiping left from Home */}
            <Tab.Screen
                name="NotificationsTab"
                component={NotificationsScreen}
                options={{ tabBarLabel: 'Notifications' }}
            />
            <Tab.Screen
                name="Home"
                component={HomeStack}
                options={({ route }: any) => {
                    const routeName = getFocusedRouteNameFromRoute(route);
                    const isMainScreen = !routeName || routeName === 'HomeMain';
                    return {
                        tabBarLabel: 'Home',
                        swipeEnabled: isMainScreen,
                    };
                }}
                listeners={({ navigation, route }) => ({
                    tabPress: (e: any) => {
                        const state = navigation.getState();
                        const homeRoute = state.routes.find(r => r.name === 'Home');
                        if (homeRoute && homeRoute.state && homeRoute.state.index > 0) {
                            e.preventDefault();
                            navigation.navigate('Home', { screen: 'HomeMain' });
                        }
                    },
                })}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{ tabBarLabel: 'Calendar' }}
            />
            <Tab.Screen
                name="Exercises"
                component={ExercisesStack}
                options={({ route }: any) => {
                    const routeName = getFocusedRouteNameFromRoute(route);
                    const isMainScreen = !routeName || routeName === 'ExercisesMain';
                    return {
                        tabBarLabel: 'Exercises',
                        swipeEnabled: isMainScreen,
                    };
                }}
                listeners={({ navigation, route }) => ({
                    tabPress: (e: any) => {
                        const state = navigation.getState();
                        const exercisesRoute = state.routes.find(r => r.name === 'Exercises');
                        if (exercisesRoute && exercisesRoute.state && exercisesRoute.state.index > 0) {
                            e.preventDefault();
                            navigation.navigate('Exercises', { screen: 'ExercisesMain' });
                        }
                    },
                })}
            />
            <Tab.Screen
                name="Coach"
                component={CoachScreen}
                options={{ tabBarLabel: 'Coach' }}
            />
            <Tab.Screen
                name="Squad"
                component={SquadStack}
                options={({ route }: any) => {
                    const routeName = getFocusedRouteNameFromRoute(route);
                    // Only enable swipe on the main screen (undefined or 'SquadMain')
                    const isMainScreen = !routeName || routeName === 'SquadMain';
                    return {
                        tabBarLabel: 'Squad',
                        swipeEnabled: isMainScreen,
                    };
                }}
                listeners={({ navigation, route }) => ({
                    tabPress: (e: any) => {
                        // If we are already on the Squad tab
                        const state = navigation.getState();
                        // Find the Squad route
                        const squadRoute = state.routes.find(r => r.name === 'Squad');
                        if (squadRoute && squadRoute.state && squadRoute.state.index > 0) {
                            // There is a stack history, pop to top and go to events tab
                            e.preventDefault();
                            navigation.navigate('Squad', {
                                screen: 'SquadMain',
                                params: { initialTab: 'events' }
                            });
                        }
                    },
                })}
            />
            {/* Hidden Settings tab - accessible by swiping right from Squad */}
            <Tab.Screen
                name="SettingsTab"
                component={SettingsStack}
                options={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route);
                    const isMainScreen = !routeName || routeName === 'SettingsMain';
                    return {
                        tabBarLabel: 'Settings',
                        swipeEnabled: isMainScreen, // Allow swipe left to Squad from main Settings screen
                    };
                }}
            />
            {/* Hidden Badges/Achievements tab - accessible by swiping right from Settings */}
            <Tab.Screen
                name="BadgesTab"
                component={BadgesScreen}
                options={{ tabBarLabel: 'Achievements', swipeEnabled: true }}
            />
        </Tab.Navigator>
    );
}

const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();

function HomeStack() {
    const { themeColors } = useTheme();

    return (
        <HomeStackNav.Navigator
            id="HomeStack"
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: themeColors.bgPrimary },
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                fullScreenGestureEnabled: true,
            }}
            initialRouteName="HomeMain"
        >
            <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
            <HomeStackNav.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
            <HomeStackNav.Screen name="CrossFitWorkout" component={CrossFitWorkoutScreen} />
            <HomeStackNav.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
            <HomeStackNav.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
            <HomeStackNav.Screen name="AthleteProfile" component={AthleteProfileScreen} />
            <HomeStackNav.Screen name="CreatePost" component={CreatePostScreen} />

            <HomeStackNav.Screen name="ActivityFeed" component={ActivityFeedScreen} />
            <HomeStackNav.Screen name="Comments" component={CommentsScreen} />
            <HomeStackNav.Screen name="Badges" component={BadgesScreen} />
            <HomeStackNav.Screen name="CompleteEventWorkout" component={CompleteEventWorkoutScreen} />
        </HomeStackNav.Navigator>
    );
}

const ExercisesStackNav = createNativeStackNavigator<ExercisesStackParamList>();

function ExercisesStack() {
    const { themeColors } = useTheme();

    return (
        <ExercisesStackNav.Navigator
            id="ExercisesStack"
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: themeColors.bgPrimary },
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                fullScreenGestureEnabled: true,
            }}
            initialRouteName="ExercisesMain"
        >
            <ExercisesStackNav.Screen name="ExercisesMain" component={ExercisesScreen} />
            <ExercisesStackNav.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        </ExercisesStackNav.Navigator>
    );
}

const SquadStackNav = createNativeStackNavigator<SquadStackParamList>();

function SquadStack() {
    const { themeColors } = useTheme();

    return (
        <SquadStackNav.Navigator
            id="SquadStack"
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: themeColors.bgPrimary },
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                fullScreenGestureEnabled: true,
            }}
            initialRouteName="SquadMain"
        >
            <SquadStackNav.Screen name="SquadMain" component={SquadScreen} />
            <SquadStackNav.Screen name="CreateEvent" component={CreateEventScreen} />
            <SquadStackNav.Screen name="CreatePost" component={CreatePostScreen} />
            <SquadStackNav.Screen name="EventDetail" component={EventDetailScreen} />
            <SquadStackNav.Screen name="ManageEventPlan" component={ManageEventPlanScreen} />
            <SquadStackNav.Screen name="SquadEvents" component={SquadEventsScreen} />
            <SquadStackNav.Screen name="AthleteProfile" component={AthleteProfileScreen} />
            <SquadStackNav.Screen name="ActivityFeed" component={ActivityFeedScreen} />

            <SquadStackNav.Screen name="CompleteEventWorkout" component={CompleteEventWorkoutScreen} />
            <SquadStackNav.Screen name="Comments" component={CommentsScreen} />
            <SquadStackNav.Screen name="Badges" component={BadgesScreen} />
        </SquadStackNav.Navigator>
    );
}

const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();

function SettingsStack() {
    const { themeColors } = useTheme();

    return (
        <SettingsStackNav.Navigator
            id="SettingsStack"
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: themeColors.bgPrimary },
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                fullScreenGestureEnabled: true,
            }}
            initialRouteName="SettingsMain"
        >
            <SettingsStackNav.Screen name="SettingsMain" component={SettingsScreen} />
            <SettingsStackNav.Screen name="CreatePost" component={CreatePostScreen} />
            <SettingsStackNav.Screen name="Badges" component={BadgesScreen} />
            <SettingsStackNav.Screen name="Admin" component={AdminScreen} />
        </SettingsStackNav.Navigator>
    );
}

function AuthStack() {
    return (
        <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
    );
}

function AppStack() {
    return (
        <Stack.Navigator
            id="AppStack"
            screenOptions={{
                headerShown: false,
                animation: 'none', // Disable slide animation - ScreenLayout provides fixed header/footer
                contentStyle: {
                    backgroundColor: '#0a141f',
                },
            }}
        >
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
            <Stack.Screen name="CrossFitWorkout" component={CrossFitWorkoutScreen} />
            <Stack.Screen name="AthleteProfile" component={AthleteProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {/* Squad Events moved to SquadStack */}
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                }}
            />
            {/* Admin moved to SettingsStack */}
        </Stack.Navigator>
    );
}

// Wrapper that provides fixed header at navigation level
function AppStackWithHeader() {
    const { themeColors, theme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: themeColors.bgPrimary }}>
            {/* Status bar styling */}
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            {/* Status bar glow effect */}
            <StatusBarGlow />

            {/* Fixed Header */}
            <View style={{ paddingTop: insets.top }}>
                <AppHeader />
            </View>

            {/* Navigator Content */}
            <View style={{ flex: 1 }}>
                <AppStack />
            </View>
        </View>
    );
}

export default function Navigation() {
    const { user, loading } = useAuth();
    const navigationRef = useNavigationContainerRef<RootStackParamList>();

    // Handle notification taps — navigate to the relevant screen
    useEffect(() => {
        const cleanup = addNotificationListeners(
            () => {}, // foreground notification — no action needed
            (response) => {
                const data = response.notification.request.content.data;
                if (!navigationRef.current) return;
                const nav = navigationRef.current as any;

                if (data?.type === 'squad_request' || data?.type === 'squad_accept') {
                    nav.navigate('Main', {
                        screen: 'Squad',
                        params: { screen: 'SquadMain', params: { initialTab: 'members' } },
                    });
                } else if (data?.type === 'comment' && data?.postId) {
                    nav.navigate('Comments', { postId: data.postId });
                } else if (data?.type === 'lfg' || data?.type === 'squad_post') {
                    nav.navigate('Main', { screen: 'Squad' });
                } else if ((data?.type === 'event_invite' || data?.type === 'event_soon' || data?.type === 'workout_reminder') && data?.eventId) {
                    nav.navigate('EventDetail', { id: data.eventId });
                }
            }
        );
        return cleanup;
    }, []);

    // Capture invite URLs BEFORE auth resolves.
    // If the user isn't logged in, the linking config can't route to SquadMain
    // (it's inside AppStack which only renders when user is truthy).
    // So we intercept the URL here and save it for after auth completes.
    useEffect(() => {
        // Handle the URL that launched the app (cold start)
        Linking.getInitialURL().then((url) => {
            if (url) {
                const code = extractInviteCode(url);
                if (code && !user) {
                    savePendingInvite(code);
                }
            }
        });

        // Handle URLs received while the app is already running (warm start)
        const subscription = Linking.addEventListener('url', ({ url }) => {
            const code = extractInviteCode(url);
            if (code && !user) {
                savePendingInvite(code);
            }
        });

        return () => subscription.remove();
    }, [user]);

    // Show nothing while loading auth state
    if (loading) {
        return null;
    }

    const linking: LinkingOptions<RootStackParamList> = {
        prefixes: [Linking.createURL('/'), 'https://hybrid.walsansoftware.com'],
        config: {
            screens: {
                Main: {
                    screens: {
                        Squad: {
                            screens: {
                                SquadMain: {
                                    path: 'join/:inviteCode',
                                },
                            },
                        },
                    },
                },
                // Add other root screens if needed for type safety, but optional
                CreateWorkout: 'create-workout',
                ActiveWorkout: 'workout/:id',
                ExerciseDetail: 'exercise/:id',
                CrossFitWorkout: 'crossfit/:id',
                AthleteProfile: 'profile/:id',
                Notifications: 'notifications',
                NotificationSettings: 'notification-settings',
                Settings: 'settings',
                SquadEvents: 'squad-events',
                EventDetail: 'event/:id',
                ActivityFeed: 'feed/:eventId',
                CreatePost: 'create-post',
                ManageEventPlan: 'manage-plan/:eventId',
                CompleteEventWorkout: 'complete-workout/:eventId/:trainingWorkoutId',
            },
        },
    };

    return (
        <NavigationContainer ref={navigationRef} theme={DarkTheme} linking={linking}>
            {user ? <AppStackWithHeader /> : <AuthStack />}
        </NavigationContainer>
    );
}
