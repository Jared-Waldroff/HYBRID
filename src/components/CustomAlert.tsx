import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    StyleSheet,
    Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, typography } from '../theme';

// Types
interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface AlertConfig {
    title: string;
    message?: string;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (config: AlertConfig) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Hook for using alerts
export const useAlert = (): AlertContextType => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

// Provider component
export function AlertProvider({ children }: { children: ReactNode }) {
    const { themeColors, colors: userColors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertConfig | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));

    const showAlert = useCallback((alertConfig: AlertConfig) => {
        setConfig(alertConfig);
        setVisible(true);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    const hideAlert = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            setConfig(null);
        });
    }, [fadeAnim, scaleAnim]);

    const handleButtonPress = (button: AlertButton) => {
        hideAlert();
        // Delay onPress to allow animation to complete
        setTimeout(() => {
            button.onPress?.();
        }, 150);
    };

    const buttons = config?.buttons || [{ text: 'OK', style: 'default' }];

    const getButtonStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return { color: '#ef4444' };
            case 'cancel':
                return { fontWeight: '600' as const };
            default:
                return { color: userColors.accent_color };
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={hideAlert}
            >
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <Pressable style={styles.backdrop} onPress={hideAlert} />
                    <Animated.View
                        style={[
                            styles.alertBox,
                            {
                                backgroundColor: themeColors.bgSecondary,
                                borderColor: themeColors.glassBorder,
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        {config?.title && (
                            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                                {config.title}
                            </Text>
                        )}
                        {config?.message && (
                            <Text style={[styles.message, { color: themeColors.textSecondary }]}>
                                {config.message}
                            </Text>
                        )}
                        <View style={[styles.buttonRow, { borderTopColor: themeColors.divider }]}>
                            {buttons.map((button, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.button,
                                        index > 0 && { borderLeftWidth: 1, borderLeftColor: themeColors.divider },
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            { color: themeColors.textPrimary },
                                            getButtonStyle(button.style),
                                        ]}
                                    >
                                        {button.text}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </AlertContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    alertBox: {
        width: '80%',
        maxWidth: 320,
        borderRadius: radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    message: {
        fontSize: typography.sizes.base,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    button: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: typography.sizes.base,
        fontWeight: '500',
    },
});

export default AlertProvider;
