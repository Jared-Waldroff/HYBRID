import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    ScrollView,
    Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography, MIN_TOUCH_TARGET } from '../theme';

// Larger sizes for gym use - sweaty hands need big targets!
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

interface InlineDragPickerProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    style?: any;
}

function generateValues(min: number, max: number, step: number): number[] {
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(Number(i.toFixed(1)));
    }
    return values;
}

export default function InlineDragPicker({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 5,
    style,
}: InlineDragPickerProps) {
    const { themeColors, colors: userColors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const scrollViewRef = useRef<ScrollView>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const values = generateValues(min, max, step);
    const currentIndex = values.findIndex(v => v === value);

    // Sync temp value with actual value when closed
    useEffect(() => {
        if (!isOpen) {
            setTempValue(value);
        }
    }, [value, isOpen]);

    const handleOpen = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsOpen(true);
        setTempValue(value);

        // Animate scale
        Animated.spring(scaleAnim, {
            toValue: 1.05,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();
    }, [value, scaleAnim]);

    const handleClose = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
        }).start();

        setIsOpen(false);
        if (tempValue !== value) {
            onChange(tempValue);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [tempValue, value, onChange, scaleAnim]);

    const handleValueSelect = useCallback((newValue: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTempValue(newValue);
    }, []);

    const handleScrollEnd = useCallback((event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        if (index >= 0 && index < values.length) {
            const newValue = values[index];
            if (newValue !== tempValue) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTempValue(newValue);
            }
        }
    }, [values, tempValue]);

    // Scroll to current value when opening
    useEffect(() => {
        if (isOpen && scrollViewRef.current) {
            const index = values.findIndex(v => v === tempValue);
            if (index >= 0) {
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        y: index * ITEM_HEIGHT,
                        animated: false,
                    });
                }, 50);
            }
        }
    }, [isOpen, tempValue, values]);

    return (
        <>
            {/* Inline Value Display */}
            <Pressable onPress={handleOpen} style={[styles.container, style]}>
                <Animated.View
                    style={[
                        styles.valueContainer,
                        {
                            backgroundColor: themeColors.inputBg,
                            borderColor: themeColors.inputBorder,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.valueText,
                            { color: value ? themeColors.textPrimary : themeColors.textMuted },
                        ]}
                    >
                        {value}
                    </Text>
                </Animated.View>
            </Pressable>

            {/* Compact Picker Modal */}
            <Modal visible={isOpen} transparent animationType="fade">
                <Pressable style={styles.overlay} onPress={handleClose}>
                    <View
                        style={[styles.pickerContainer, { backgroundColor: themeColors.bgSecondary }]}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Selection highlight */}
                        <View
                            style={[
                                styles.selectionHighlight,
                                { backgroundColor: userColors.accent_color + '25', borderColor: userColors.accent_color + '50' }
                            ]}
                        />

                        <ScrollView
                            ref={scrollViewRef}
                            showsVerticalScrollIndicator={false}
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            contentContainerStyle={styles.scrollContent}
                            onMomentumScrollEnd={handleScrollEnd}
                            onScrollEndDrag={handleScrollEnd}
                        >
                            {values.map((v) => {
                                const isSelected = v === tempValue;
                                return (
                                    <Pressable
                                        key={v}
                                        style={styles.item}
                                        onPress={() => handleValueSelect(v)}
                                    >
                                        <Text
                                            style={[
                                                styles.itemText,
                                                { color: isSelected ? userColors.accent_color : themeColors.textSecondary },
                                                isSelected && styles.itemTextSelected,
                                            ]}
                                        >
                                            {v}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Confirm button */}
                        <Pressable
                            style={[styles.confirmButton, { backgroundColor: userColors.accent_color }]}
                            onPress={handleClose}
                        >
                            <Text style={styles.confirmText}>Done</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    valueContainer: {
        height: MIN_TOUCH_TARGET,
        minWidth: 60,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valueText: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        textAlign: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        width: 240,
        height: ITEM_HEIGHT * VISIBLE_ITEMS + 80,
        borderRadius: radii.xl,
        overflow: 'hidden',
        position: 'relative',
    },
    selectionHighlight: {
        position: 'absolute',
        top: ITEM_HEIGHT * 2,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        borderTopWidth: 2,
        borderBottomWidth: 2,
        zIndex: 1,
        pointerEvents: 'none',
    },
    scrollContent: {
        paddingVertical: ITEM_HEIGHT * 2,
    },
    item: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 24,
    },
    itemTextSelected: {
        fontWeight: typography.weights.bold,
        fontSize: 32,
    },
    confirmButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radii.lg,
    },
    confirmText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: typography.weights.bold,
    },
});

