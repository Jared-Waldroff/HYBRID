import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BADGE_DEFINITIONS } from '../data/badges';
import { spacing, typography, radii } from '../theme';

interface BadgeRowProps {
    badges?: string[];
    maxDisplay?: number;
    onPress?: () => void;
    size?: 'small' | 'medium';
    /** Optional user name to show in the popup header */
    userName?: string;
}

/**
 * Compact inline display of badges as emojis.
 * Shows up to maxDisplay badges, with a "+N" indicator if there are more.
 * Tapping opens a popup showing all badges with full details.
 */
export default function BadgeRow({
    badges = [],
    maxDisplay = 3,
    onPress,
    size = 'small',
    userName
}: BadgeRowProps) {
    const { themeColors, colors: userColors } = useTheme();
    const [showModal, setShowModal] = useState(false);

    if (!badges || badges.length === 0) {
        return null;
    }

    // Get badge definitions for display
    const badgeDetails = badges
        .map(badgeId => (BADGE_DEFINITIONS as any)[badgeId])
        .filter(Boolean);

    if (badgeDetails.length === 0) {
        return null;
    }

    const visibleBadges = badgeDetails.slice(0, maxDisplay);
    const remainingCount = badgeDetails.length - maxDisplay;

    const emojiSize = size === 'small' ? 14 : 18;
    const containerPadding = size === 'small' ? 2 : 4;

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (badgeDetails.length > 0) {
            setShowModal(true);
        }
    };

    return (
        <>
            <Pressable
                style={[styles.container, { paddingHorizontal: containerPadding }]}
                onPress={handlePress}
            >
                {visibleBadges.map((badge, index) => (
                    <Text
                        key={badge.id}
                        style={[styles.emoji, { fontSize: emojiSize }]}
                    >
                        {badge.emoji}
                    </Text>
                ))}
                {remainingCount > 0 && (
                    <View style={[styles.moreIndicator, { backgroundColor: themeColors.bgTertiary }]}>
                        <Text style={[styles.moreText, { color: themeColors.textSecondary }]}>
                            +{remainingCount}
                        </Text>
                    </View>
                )}
            </Pressable>

            {/* Badge Popup Modal */}
            <Modal
                visible={showModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowModal(false)}
                >
                    <Pressable
                        style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                                {userName ? `${userName}'s Badges` : 'Badges'}
                            </Text>
                            <Pressable onPress={() => setShowModal(false)} hitSlop={10}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Badge count */}
                        <Text style={[styles.badgeCount, { color: themeColors.textMuted }]}>
                            {badgeDetails.length} badge{badgeDetails.length !== 1 ? 's' : ''} earned
                        </Text>

                        {/* Badge list */}
                        <ScrollView
                            style={styles.badgeList}
                            showsVerticalScrollIndicator={false}
                        >
                            {badgeDetails.map((badge) => (
                                <View
                                    key={badge.id}
                                    style={[styles.badgeItem, { borderBottomColor: themeColors.divider }]}
                                >
                                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                                    <View style={styles.badgeInfo}>
                                        <Text style={[styles.badgeName, { color: themeColors.textPrimary }]}>
                                            {badge.name}
                                        </Text>
                                        <Text style={[styles.badgeDescription, { color: themeColors.textMuted }]}>
                                            {badge.description}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    emoji: {
        lineHeight: 20,
    },
    moreIndicator: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: radii.sm,
        marginLeft: 2,
    },
    moreText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.medium,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        maxHeight: '70%',
        borderRadius: radii.xl,
        padding: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    modalTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
    },
    badgeCount: {
        fontSize: typography.sizes.sm,
        marginBottom: spacing.md,
    },
    badgeList: {
        flexGrow: 0,
    },
    badgeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    badgeEmoji: {
        fontSize: 28,
        width: 40,
    },
    badgeInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    badgeName: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
    badgeDescription: {
        fontSize: typography.sizes.sm,
        marginTop: 2,
    },
});
