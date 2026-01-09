import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography, MIN_TOUCH_TARGET } from '../theme';

type TabItem = {
    name: string;
    icon: keyof typeof Feather.glyphMap;
    label: string;
    route: string;
};

const TABS: TabItem[] = [
    { name: 'Home', icon: 'home', label: 'Home', route: 'Home' },
    { name: 'Calendar', icon: 'calendar', label: 'Calendar', route: 'Calendar' },
    { name: 'Exercises', icon: 'activity', label: 'Exercises', route: 'Exercises' },
    { name: 'Coach', icon: 'user', label: 'Coach', route: 'Coach' },
    { name: 'Squad', icon: 'users', label: 'Squad', route: 'Squad' },
];

interface BottomTabBarProps {
    activeTab?: string;
}

export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { themeColors, colors: userColors } = useTheme();
    const insets = useSafeAreaInsets();

    // Determine current tab - check if we're on a tab screen
    const tabNames = TABS.map(t => t.name);
    const isOnTabScreen = tabNames.includes(route.name);

    // If we're on a tab screen, use route.name; otherwise use the prop or default to nothing highlighted
    const currentTab = isOnTabScreen ? route.name : activeTab;

    const handlePress = (tab: TabItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Main', { screen: tab.route });
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: themeColors.bgSecondary,
                borderTopColor: `${userColors.accent_color}30`,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            }
        ]}>
            {TABS.map((tab) => {
                const isActive = currentTab === tab.name;
                return (
                    <Pressable
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => handlePress(tab)}
                    >
                        <Feather
                            name={tab.icon}
                            size={24}
                            color={isActive ? userColors.accent_color : themeColors.textMuted}
                        />
                        <Text style={[
                            styles.label,
                            { color: isActive ? userColors.accent_color : themeColors.textMuted }
                        ]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        minHeight: MIN_TOUCH_TARGET,
    },
    label: {
        fontSize: 11,
        marginTop: 2,
    },
});
