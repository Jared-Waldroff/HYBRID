import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from './GradientBackground';

interface ScreenLayoutProps {
    children: React.ReactNode;
    hideHeader?: boolean;
}

/**
 * Simplified layout wrapper for screens.
 * Header and StatusBar are now handled at the navigation level.
 * This provides gradient background and content container.
 */
export default function ScreenLayout({
    children,
    hideHeader = false,
}: ScreenLayoutProps) {
    const { themeColors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgPrimary }]}>
            {/* Gradient Background - subtle radial gradients from corners */}
            <GradientBackground />

            {/* Screen Content */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
