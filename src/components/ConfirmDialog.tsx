import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography, MIN_TOUCH_TARGET, colors } from '../theme';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { themeColors, colors: userColors } = useTheme();

    const handleConfirm = async () => {
        if (variant === 'danger') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onConfirm();
    };

    const handleCancel = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel();
    };

    const confirmButtonColor = variant === 'danger' ? colors.error : userColors.accent_color;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={handleCancel}>
                <Pressable
                    style={[styles.dialog, { backgroundColor: themeColors.bgSecondary }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
                    <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>

                    <View style={styles.buttons}>
                        <Pressable
                            style={[
                                styles.button,
                                styles.cancelButton,
                                { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder },
                            ]}
                            onPress={handleCancel}
                        >
                            <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>
                                {cancelText}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.button, styles.confirmButton, { backgroundColor: confirmButtonColor }]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    dialog: {
        width: '100%',
        maxWidth: 400,
        borderRadius: radii.xl,
        padding: spacing.lg,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 22,
    },
    buttons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    button: {
        flex: 1,
        minHeight: MIN_TOUCH_TARGET,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radii.md,
    },
    cancelButton: {
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    confirmButton: {},
    confirmButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
});
