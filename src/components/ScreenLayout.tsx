import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import AppHeader from './AppHeader';
import BottomTabBar from './BottomTabBar';
import GradientBackground from './GradientBackground';
import StatusBarGlow from './StatusBarGlow';

interface ScreenLayoutProps {
    children: React.ReactNode;
    showBack?: boolean;
    title?: string;
    hideFooter?: boolean;
}

// Main tab screen names - these use the built-in navigator tab bar
const TAB_SCREENS = ['Home', 'Calendar', 'Exercises', 'Coach', 'Squad'];

/**
 * Global layout wrapper for all screens.
 * Provides consistent header, footer, gradient background, and status bar styling throughout the app.
 * 
 * Usage:
 * <ScreenLayout>
 *   {content}
 * </ScreenLayout>
 * 
 * For screens with back navigation:
 * <ScreenLayout showBack title="Page Title">
 *   {content}
 * </ScreenLayout>
 */
export default function ScreenLayout({
    children,
    showBack = false,
    title,
    hideFooter = false,
}: ScreenLayoutProps) {
    const { themeColors, theme } = useTheme();
    const insets = useSafeAreaInsets();
    const route = useRoute();

    // Auto-hide custom footer on main tab screens (they use built-in navigator tab bar)
    const isTabScreen = TAB_SCREENS.includes(route.name);
    const shouldHideFooter = hideFooter || isTabScreen;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgPrimary }]}>
            {/* Status bar styling */}
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

            {/* Status bar glow effect */}
            <StatusBarGlow />

            {/* Gradient Background - subtle radial gradients from corners */}
            <GradientBackground />

            {/* Content area with safe area padding */}
            <View style={[styles.safeContent, { paddingTop: insets.top }]}>
                {/* Global Header */}
                <AppHeader showBack={showBack} title={title} />

                {/* Screen Content */}
                <View style={styles.content}>
                    {children}
                </View>

                {/* Global Footer - hidden on tab screens (using built-in navigator tab bar) */}
                {!shouldHideFooter && <BottomTabBar />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeContent: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});

