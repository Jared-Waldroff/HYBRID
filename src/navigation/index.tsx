import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MIN_TOUCH_TARGET } from '../theme';
import AppHeader from '../components/AppHeader';

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
import EventDetailScreen from '../screens/EventDetailScreen';
import ActivityFeedScreen from '../screens/ActivityFeedScreen';
import CompleteEventWorkoutScreen from '../screens/CompleteEventWorkoutScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

// Type definitions for navigation
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
    Login: undefined;
    Onboarding: undefined;
    CreateWorkout: { date?: string };
    ActiveWorkout: { id: string };
    ExerciseDetail: { id: string };
    CrossFitWorkout: { id: string };
    AthleteProfile: { id: string };
    Notifications: undefined;
    NotificationSettings: undefined;
    Settings: undefined;
    // Squad Events
    SquadEvents: undefined;
    CreateEvent: undefined;
    EventDetail: { id: string };
    ActivityFeed: { eventId?: string };
    CompleteEventWorkout: { trainingWorkoutId: string; eventId: string };
};

export type MainTabParamList = {
    Home: { selectedDate?: string; timestamp?: number } | undefined;
    Calendar: undefined;
    Exercises: undefined;
    Coach: undefined;
    Squad: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

// Tab icons mapping
const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
    Home: 'home',
    Calendar: 'calendar',
    Exercises: 'activity',
    Coach: 'user',
    Squad: 'users',
};

function MainTabs() {
    const { themeColors, colors: userColors } = useTheme();

    return (
        <Tab.Navigator
            id="MainTabs"
            tabBarPosition="bottom"
            screenOptions={({ route }) => ({
                swipeEnabled: true,
                animationEnabled: true,
                lazy: true,
                tabBarScrollEnabled: false,
                tabBarShowIcon: true,
                tabBarShowLabel: true,
                tabBarIndicatorStyle: {
                    backgroundColor: userColors.accent_color,
                    height: 3,
                    bottom: 0,
                },
                tabBarStyle: {
                    backgroundColor: themeColors.bgSecondary,
                    borderTopWidth: 1,
                    borderTopColor: `${userColors.accent_color}30`,
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 13,
                    fontWeight: '500',
                    textTransform: 'none',
                    marginTop: -4,
                },
                tabBarIconStyle: {
                    marginBottom: -4,
                },
                tabBarItemStyle: {
                    minWidth: 70,
                    paddingHorizontal: 4,
                },
                tabBarActiveTintColor: userColors.accent_color,
                tabBarInactiveTintColor: themeColors.textMuted,
                tabBarIcon: ({ color }) => (
                    <Feather name={TAB_ICONS[route.name as keyof MainTabParamList]} size={22} color={color} />
                ),
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{ tabBarLabel: 'Calendar' }}
            />
            <Tab.Screen
                name="Exercises"
                component={ExercisesScreen}
                options={{ tabBarLabel: 'Exercises' }}
            />
            <Tab.Screen
                name="Coach"
                component={CoachScreen}
                options={{ tabBarLabel: 'Coach' }}
            />
            <Tab.Screen
                name="Squad"
                component={SquadScreen}
                options={{ tabBarLabel: 'Squad' }}
            />
        </Tab.Navigator>
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
            {/* Squad Events */}
            <Stack.Screen name="SquadEvents" component={SquadEventsScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="ActivityFeed" component={ActivityFeedScreen} />
            <Stack.Screen name="CompleteEventWorkout" component={CompleteEventWorkoutScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        </Stack.Navigator>
    );
}

export default function Navigation() {
    const { user, loading } = useAuth();

    // Show nothing while loading auth state
    if (loading) {
        return null;
    }

    return (
        <NavigationContainer theme={DarkTheme}>
            {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}
