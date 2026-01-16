import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography, colors } from '../theme';

interface LiabilityWaiverModalProps {
    visible: boolean;
    onAgree: () => void;
    isUpdating: boolean;
}

export default function LiabilityWaiverModal({ visible, onAgree, isUpdating }: LiabilityWaiverModalProps) {
    const { themeColors, colors: userColors, styles: themeStyles } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Dark overlay backdrop */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)' }]} />

                <View style={[
                    styles.content,
                    {
                        backgroundColor: themeColors.bgSecondary,
                        borderColor: themeColors.glassBorder,
                    }
                ]}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                            <Feather name="alert-triangle" size={32} color="#ef4444" />
                        </View>
                        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                            Medical Disclaimer
                        </Text>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                            The AI Coach feature provides general fitness information and workout suggestions based on common training methodologies. It is <Text style={{ fontWeight: '700', color: themeColors.textPrimary }}>NOT</Text> a medical professional or a certified personal trainer.
                        </Text>

                        <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                            By using this feature, you acknowledge and agree that:
                        </Text>

                        <View style={styles.bulletPoint}>
                            <Text style={[styles.bullet, { color: themeColors.textSecondary }]}>•</Text>
                            <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                                You should consult with a physician or healthcare provider before beginning any new exercise program.
                            </Text>
                        </View>

                        <View style={styles.bulletPoint}>
                            <Text style={[styles.bullet, { color: themeColors.textSecondary }]}>•</Text>
                            <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                                You assume all risks associated with exercise, including but not limited to injury, strain, or other health complications.
                            </Text>
                        </View>

                        <View style={styles.bulletPoint}>
                            <Text style={[styles.bullet, { color: themeColors.textSecondary }]}>•</Text>
                            <Text style={[styles.text, { color: themeColors.textSecondary }]}>
                                HYBRID (Walsan Software) is not liable for any injuries or damages resulting from the use of this app or its suggestions.
                            </Text>
                        </View>

                        <Text style={[styles.text, { color: themeColors.textSecondary, marginTop: 12 }]}>
                            If you experience pain, dizziness, or shortness of breath at any time, stop immediately and seek medical attention.
                        </Text>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: themeColors.glassBorder }]}>
                        <Pressable
                            style={[
                                themeStyles.btn,
                                themeStyles.btnPrimary,
                                { width: '100%', backgroundColor: userColors.accent_color }
                            ]}
                            onPress={onAgree}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={[themeStyles.btnPrimaryText, { color: '#000', fontWeight: 'bold' }]}>
                                    I Acknowledge & Agree
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    content: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: radii.xl,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    header: {
        alignItems: 'center',
        padding: spacing.xl,
        paddingBottom: spacing.sm,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        textAlign: 'center',
    },
    scrollView: {
        paddingHorizontal: spacing.xl,
    },
    scrollContent: {
        paddingBottom: spacing.lg,
    },
    text: {
        fontSize: typography.sizes.base,
        lineHeight: 24,
        marginBottom: spacing.md,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
        paddingLeft: spacing.sm,
    },
    bullet: {
        fontSize: typography.sizes.base,
        marginRight: spacing.sm,
        lineHeight: 24,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
    }
});
