import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

/**
 * GradientBackground - Creates subtle radial gradient effects from corners
 * 
 * Primary color emits from top-left corner
 * Secondary color emits from bottom-right corner
 * Both gradients fade to transparent for a subtle, smooth effect
 */
export default function GradientBackground() {
    const { colors: userColors } = useTheme();

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Primary color gradient from top-left */}
            <LinearGradient
                colors={[
                    `${userColors.accent_color}45`,
                    `${userColors.accent_color}30`,
                    `${userColors.accent_color}15`,
                    `${userColors.accent_color}05`,
                    'transparent',
                ]}
                locations={[0, 0.2, 0.4, 0.6, 0.85]}
                style={styles.topLeftGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Secondary color gradient from bottom-right */}
            <LinearGradient
                colors={[
                    `${userColors.secondary_color}35`,
                    `${userColors.secondary_color}20`,
                    `${userColors.secondary_color}10`,
                    `${userColors.secondary_color}03`,
                    'transparent',
                ]}
                locations={[0, 0.2, 0.4, 0.6, 0.85]}
                style={styles.bottomRightGradient}
                start={{ x: 1, y: 1 }}
                end={{ x: 0, y: 0 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    topLeftGradient: {
        position: 'absolute',
        top: -height * 0.15,
        left: -width * 0.3,
        width: width * 1.5,
        height: height * 0.9,
    },
    bottomRightGradient: {
        position: 'absolute',
        bottom: -height * 0.15,
        right: -width * 0.3,
        width: width * 1.5,
        height: height * 0.9,
    },
});
