import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';

export default function AthleteProfileScreen() {
    const { themeColors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bgPrimary }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>Athlete Profile</Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                    View athlete stats and badges
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
        fontSize: typography.sizes.xxl,
        fontWeight: typography.weights.bold,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
    },
});
