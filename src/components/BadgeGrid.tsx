import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BADGE_DEFINITIONS, getBadgesByCategory } from '../data/badges';
import { spacing, typography, radii } from '../theme';

interface BadgeGridProps {
    earnedBadges?: string[];
    showLocked?: boolean;
    onBadgePress?: (badgeId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    strength: '💪 Strength',
    milestone: '🎯 Milestones',
    endurance: '🏃 Endurance',
    competition: '🏆 Competition',
};

const CATEGORY_ORDER = ['milestone', 'strength', 'endurance', 'competition'];

interface BadgeInfo {
    id: string;
    name: string;
    emoji: string;
    description: string;
    isEarned: boolean;
}

/**
 * Full badge grid display organized by category.
 * Shows earned badges with full color, locked badges grayed out.
 * Tapping a badge shows a popup with details on how to earn it.
 */
export default function BadgeGrid({
    earnedBadges = [],
    showLocked = true,
    onBadgePress
}: BadgeGridProps) {
    const { themeColors, colors: userColors } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const [selectedBadge, setSelectedBadge] = useState<BadgeInfo | null>(null);

    const badgesByCategory = getBadgesByCategory();
    const earnedSet = new Set(earnedBadges);

    // Calculate grid layout - 3 badges per row with even spacing
    const containerPadding = spacing.md * 2;
    const gap = spacing.sm;
    const badgesPerRow = 3;
    const availableWidth = screenWidth - containerPadding;
    const badgeSize = Math.floor((availableWidth - gap * (badgesPerRow - 1)) / badgesPerRow);

    // Count stats
    const totalEarned = earnedBadges.length;

    const handleBadgePress = (badge: any, isEarned: boolean) => {
        if (onBadgePress) {
            onBadgePress(badge.id);
        } else {
            setSelectedBadge({
                id: badge.id,
                name: badge.name,
                emoji: badge.emoji,
                description: badge.description,
                isEarned,
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Summary Header */}
            <View style={[styles.summaryCard, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                <Text style={[styles.summaryNumber, { color: userColors.accent_color }]}>
                    {totalEarned}
                </Text>
                <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                    Badges Earned
                </Text>
            </View>

            {/* Category Sections */}
            {CATEGORY_ORDER.map(category => {
                const badges = badgesByCategory[category] || [];
                if (badges.length === 0) return null;

                const displayBadges = showLocked
                    ? badges
                    : badges.filter((b: any) => earnedSet.has(b.id));

                if (displayBadges.length === 0) return null;

                return (
                    <View key={category} style={styles.categorySection}>
                        <Text style={[styles.categoryTitle, { color: themeColors.textPrimary }]}>
                            {CATEGORY_LABELS[category] || category}
                        </Text>

                        <View style={styles.badgeGrid}>
                            {displayBadges.map((badge: any) => {
                                const isEarned = earnedSet.has(badge.id);

                                return (
                                    <Pressable
                                        key={badge.id}
                                        style={[
                                            styles.badgeItem,
                                            {
                                                width: badgeSize,
                                                backgroundColor: themeColors.glassBg,
                                                borderColor: isEarned ? userColors.accent_color : themeColors.glassBorder,
                                                opacity: isEarned ? 1 : 0.5,
                                            }
                                        ]}
                                        onPress={() => handleBadgePress(badge, isEarned)}
                                    >
                                        <Text style={styles.badgeEmoji}>
                                            {isEarned ? badge.emoji : '🔒'}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.badgeName,
                                                { color: isEarned ? themeColors.textPrimary : themeColors.textMuted }
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {badge.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                );
            })}

            {totalEarned === 0 && (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyEmoji]}>🏅</Text>
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                        No Badges Yet
                    </Text>
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                        Complete workouts and achieve milestones to earn badges!
                    </Text>
                </View>
            )}

            {/* Badge Info Popup */}
            <Modal
                visible={!!selectedBadge}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSelectedBadge(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedBadge(null)}
                >
                    <Pressable
                        style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Badge Emoji */}
                        <View style={[
                            styles.modalBadgeCircle,
                            {
                                backgroundColor: selectedBadge?.isEarned ? userColors.accent_color + '20' : themeColors.bgTertiary,
                                borderColor: selectedBadge?.isEarned ? userColors.accent_color : themeColors.glassBorder
                            }
                        ]}>
                            <Text style={styles.modalBadgeEmoji}>
                                {selectedBadge?.isEarned ? selectedBadge.emoji : '🔒'}
                            </Text>
                        </View>

                        {/* Badge Name */}
                        <Text style={[styles.modalBadgeName, { color: themeColors.textPrimary }]}>
                            {selectedBadge?.name}
                        </Text>

                        {/* Status */}
                        <View style={[
                            styles.statusBadge,
                            {
                                backgroundColor: selectedBadge?.isEarned
                                    ? userColors.accent_color + '20'
                                    : themeColors.bgTertiary
                            }
                        ]}>
                            <Feather
                                name={selectedBadge?.isEarned ? 'check-circle' : 'lock'}
                                size={14}
                                color={selectedBadge?.isEarned ? userColors.accent_color : themeColors.textMuted}
                            />
                            <Text style={[
                                styles.statusText,
                                { color: selectedBadge?.isEarned ? userColors.accent_color : themeColors.textMuted }
                            ]}>
                                {selectedBadge?.isEarned ? 'Earned!' : 'Locked'}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text style={[styles.modalDescription, { color: themeColors.textSecondary }]}>
                            {selectedBadge?.isEarned
                                ? `You've unlocked this badge by completing: ${selectedBadge.description.toLowerCase()}`
                                : `How to earn: ${selectedBadge?.description}`
                            }
                        </Text>

                        {/* Close Button */}
                        <Pressable
                            style={[styles.closeButton, { backgroundColor: themeColors.bgTertiary }]}
                            onPress={() => setSelectedBadge(null)}
                        >
                            <Text style={[styles.closeButtonText, { color: themeColors.textPrimary }]}>
                                Got it
                            </Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryCard: {
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 1,
    },
    summaryNumber: {
        fontSize: 48,
        fontWeight: '700',
    },
    summaryLabel: {
        fontSize: typography.sizes.base,
        marginTop: spacing.xs,
    },
    categorySection: {
        marginBottom: spacing.lg,
    },
    categoryTitle: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.sm,
    },
    badgeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    badgeItem: {
        padding: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    badgeEmoji: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    badgeName: {
        fontSize: typography.sizes.xs,
        textAlign: 'center',
        fontWeight: typography.weights.medium,
        height: 32,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginBottom: spacing.xs,
    },
    emptyText: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
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
        width: '85%',
        maxWidth: 320,
        borderRadius: radii.xl,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalBadgeCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalBadgeEmoji: {
        fontSize: 40,
    },
    modalBadgeName: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        marginBottom: spacing.md,
    },
    statusText: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
    },
    modalDescription: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    closeButton: {
        width: '100%',
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.semibold,
    },
});
