import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';
import ScreenLayout from '../components/ScreenLayout';

export default function NotificationsScreen() {
    const { themeColors } = useTheme();

    return (
        <ScreenLayout showBack title="Notifications">
            <View style={styles.content}>
                <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>
                    No notifications yet
                </Text>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    emptyText: {
        fontSize: typography.sizes.base,
    },
});
