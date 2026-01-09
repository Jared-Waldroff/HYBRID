import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/**
 * StatusBarGlow - Creates a seamless status bar that matches the header
 * Simple solid background matching the header color
 */
export default function StatusBarGlow() {
    const { themeColors } = useTheme();
    const insets = useSafeAreaInsets();

    // Only show if there's a status bar area
    if (insets.top === 0) return null;

    return (
        <View style={[styles.container, { height: insets.top, backgroundColor: themeColors.glassBg }]} />
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
});
