import { StyleSheet } from 'react-native';
import { colors, spacing, radii, typography, MIN_TOUCH_TARGET } from './colors';

// Common reusable styles - equivalent to CSS utility classes
export const createStyles = (isDark: boolean = true) => {
    const theme = isDark ? colors.dark : colors.light;

    return StyleSheet.create({
        // Container
        container: {
            flex: 1,
            backgroundColor: theme.bgPrimary,
        },

        // Glass effect (glassmorphism)
        glass: {
            backgroundColor: theme.glassBg,
            borderWidth: 1,
            borderColor: theme.glassBorder,
            borderRadius: radii.lg,
            // Shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
        },

        glassSubtle: {
            backgroundColor: theme.glassBg,
            borderWidth: 1,
            borderColor: theme.glassBorder,
            borderRadius: radii.md,
        },

        // Button base - 48dp minimum for accessibility
        btn: {
            minHeight: MIN_TOUCH_TARGET,
            minWidth: MIN_TOUCH_TARGET,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radii.md,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
        },

        btnPrimary: {
            backgroundColor: colors.accentPrimary,
        },

        btnPrimaryText: {
            color: '#ffffff',
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
        },

        btnSecondary: {
            backgroundColor: theme.inputBg,
            borderWidth: 1,
            borderColor: theme.inputBorder,
        },

        btnSecondaryText: {
            color: theme.textPrimary,
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
        },

        btnGhost: {
            backgroundColor: 'transparent',
        },

        btnGhostText: {
            color: theme.textSecondary,
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
        },

        btnDanger: {
            backgroundColor: colors.error,
        },

        btnDangerText: {
            color: '#ffffff',
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
        },

        btnIcon: {
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: radii.full,
            minWidth: MIN_TOUCH_TARGET,
            minHeight: MIN_TOUCH_TARGET,
        },

        btnLarge: {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
        },

        btnLargeText: {
            fontSize: typography.sizes.base,
        },

        // Input styles - 48dp minimum height
        input: {
            minHeight: MIN_TOUCH_TARGET,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: theme.inputBg,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: radii.md,
            color: theme.textPrimary,
            fontSize: typography.sizes.base,
        },

        inputFocused: {
            borderColor: colors.accentPrimary,
        },

        inputLabel: {
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.medium,
            color: theme.textSecondary,
            marginBottom: spacing.xs,
        },

        // Typography
        textPrimary: {
            color: theme.textPrimary,
        },

        textSecondary: {
            color: theme.textSecondary,
        },

        textTertiary: {
            color: theme.textTertiary,
        },

        textMuted: {
            color: theme.textMuted,
        },

        textAccent: {
            color: colors.accentPrimary,
        },

        textSuccess: {
            color: colors.success,
        },

        textError: {
            color: colors.error,
        },

        // Large visible text for gym use (arm's length)
        textLarge: {
            fontSize: typography.sizes.lg,
            fontWeight: typography.weights.semibold,
            color: theme.textPrimary,
        },

        textXL: {
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.bold,
            color: theme.textPrimary,
        },

        // Headings
        h1: {
            fontSize: typography.sizes.xxxl,
            fontWeight: typography.weights.bold,
            color: theme.textPrimary,
        },

        h2: {
            fontSize: typography.sizes.xxl,
            fontWeight: typography.weights.bold,
            color: theme.textPrimary,
        },

        h3: {
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.semibold,
            color: theme.textPrimary,
        },

        h4: {
            fontSize: typography.sizes.lg,
            fontWeight: typography.weights.semibold,
            color: theme.textPrimary,
        },

        // Layout utilities
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },

        rowBetween: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },

        center: {
            justifyContent: 'center',
            alignItems: 'center',
        },

        // Divider
        divider: {
            height: 1,
            backgroundColor: theme.divider,
            alignSelf: 'stretch',
        },

        // Badge
        badge: {
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radii.full,
        },

        badgeAccent: {
            backgroundColor: colors.accentPrimary,
        },

        badgeGhost: {
            backgroundColor: theme.inputBg,
        },

        badgeText: {
            fontSize: typography.sizes.xs,
            fontWeight: typography.weights.medium,
        },

        // Loading spinner container
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.md,
        },

        // Empty state
        emptyState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.xxl,
        },

        emptyStateText: {
            color: theme.textTertiary,
            textAlign: 'center',
        },
    });
};

// Default dark theme styles
export const styles = createStyles(true);
