import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';

export default function OnboardingScreen() {
    const { themeColors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>Welcome!</Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                    Let's set up your profile
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    title: {
        fontSize: typography.sizes.xxxl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.sizes.lg,
        textAlign: 'center',
    },
});
