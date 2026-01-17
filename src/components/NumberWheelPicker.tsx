import React, { useRef, useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

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
    const flatListRef = useRef<FlatList>(null);
    const values = generateValues(min, max, step);

    // Find initial index
    const initialIndex = values.findIndex(v => v === value);
    const startIndex = initialIndex >= 0 ? initialIndex : 0;

    const handleValueChange = useCallback((newValue: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(newValue);
    }, [onChange]);

    const handleConfirm = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
    }, [onClose]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const renderItem = useCallback(({ item }: { item: number }) => {
        const isSelected = item === value;
        return (
            <Pressable
                style={[
                    styles.item,
                    isSelected && { backgroundColor: userColors.accent_color + '20' },
                ]}
                onPress={() => handleValueChange(item)}
            >
                <Text
                    style={[
                        styles.itemText,
                        { color: isSelected ? userColors.accent_color : themeColors.textSecondary },
                        isSelected && styles.itemTextSelected,
                    ]}
                >
                    {item} {unit}
                </Text>
            </Pressable>
        );
    }, [value, themeColors, userColors, unit, handleValueChange]);

    const keyExtractor = useCallback((item: number) => item.toString(), []);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: themeColors.bgSecondary }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
                    </View>

                    <View style={styles.pickerContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={values}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            getItemLayout={getItemLayout}
                            initialScrollIndex={startIndex}
                            showsVerticalScrollIndicator={false}
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            style={styles.flatList}
                            contentContainerStyle={styles.listContent}
                        />
                    </View>

                    <Pressable
                        style={[styles.confirmButton, { backgroundColor: userColors.accent_color }]}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmButtonText}>Done</Text>
                    </Pressable>
                </View>
            </View>
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
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
    },
    flatList: {
        flex: 1,
    },
    listContent: {
        paddingVertical: ITEM_HEIGHT * 2,
    },
    item: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemText: {
        fontSize: typography.sizes.xl,
    },
    itemTextSelected: {
        fontWeight: typography.weights.bold,
        fontSize: typography.sizes.xxl,
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
