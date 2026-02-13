import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import WheelPicker from '@quidone/react-native-wheel-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';

interface NumberWheelPickerProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    visible: boolean;
    onClose: () => void;
    title?: string;
}

function generateValues(min: number, max: number, step: number): number[] {
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(Number(i.toFixed(1)));
    }
    return values;
}

export default function NumberWheelPicker({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 5,
    unit = '',
    visible,
    onClose,
    title = 'Select Value',
}: NumberWheelPickerProps) {
    const { themeColors, colors: userColors } = useTheme();

    // Generate picker data
    const data = useMemo(() => {
        const values = generateValues(min, max, step);
        return values.map(v => ({
            value: v,
            label: unit ? `${v} ${unit}` : `${v}`,
        }));
    }, [min, max, step, unit]);

    const handleValueChange = useCallback(({ item }: { item: { value: number } }) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(item.value);
    }, [onChange]);

    const handleConfirm = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
    }, [onClose]);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <Pressable style={styles.overlay} onPress={handleConfirm}>
                <Pressable
                    style={[styles.container, { backgroundColor: themeColors.bgSecondary }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
                    </View>

                    <View style={styles.pickerContainer}>
                        <WheelPicker
                            data={data}
                            value={value}
                            onValueChanged={handleValueChange}
                            itemHeight={50}
                            visibleItemCount={5}
                            itemTextStyle={{
                                fontSize: 22,
                                color: themeColors.textSecondary,
                            }}
                            width="100%"
                        />
                    </View>

                    <Pressable
                        style={[styles.confirmButton, { backgroundColor: userColors.accent_color }]}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Done</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        paddingBottom: spacing.xl + 16,
    },
    header: {
        padding: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
    },
    pickerContainer: {
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    confirmButton: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
});
