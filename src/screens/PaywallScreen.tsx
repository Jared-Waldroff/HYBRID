import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/ScreenLayout';
import { useRevenueCat } from '../context/RevenueCatContext';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

export default function PaywallScreen() {
    const { themeColors, colors: userColors } = useTheme();
    const { purchasePro, restorePurchases, isLoading, isPro } = useRevenueCat();
    const navigation = useNavigation();
    const [isPurchasing, setIsPurchasing] = useState(false);

    const accentColor = userColors.accent_color;

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const success = await purchasePro();
            if (success) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Welcome to HYBRID Pro!');
                navigation.goBack();
            }
        } catch (error) {
            Alert.alert('Error', 'Purchase failed. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setIsPurchasing(true);
        const success = await restorePurchases();
        setIsPurchasing(false);
        if (success) {
            Alert.alert('Restored', 'Your purchases have been restored.');
            if (isPro) navigation.goBack();
        } else {
            Alert.alert('Notice', 'No active subscription found to restore.');
        }
    };

    return (
        <ScreenLayout hideHeader>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { shadowColor: accentColor }]}>
                        <MaterialCommunityIcons name="crown" size={64} color={accentColor} />
                    </View>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                        Upgrade to <Text style={{ color: accentColor }}>PRO</Text>
                    </Text>
                    <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                        Unlock your full potential with unlimited AI coaching and advanced tools.
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <FeatureItem
                        icon="cpu"
                        title="Unlimited AI Coach"
                        desc="Generate personalized workout plans anytime."
                        colors={themeColors}
                        accentColor={accentColor}
                    />
                    <FeatureItem
                        icon="calendar"
                        title="Event Training"
                        desc="Sync your training to your race or competition date."
                        colors={themeColors}
                        accentColor={accentColor}
                    />
                    <FeatureItem
                        icon="zap"
                        title="Support Development"
                        desc="Help us keep building new features!"
                        colors={themeColors}
                        accentColor={accentColor}
                    />
                </View>

                <View style={styles.pricingContainer}>
                    <View style={[styles.priceCard, { borderColor: accentColor, backgroundColor: themeColors.glassBg }]}>
                        <View style={[styles.bestValueTag, { backgroundColor: accentColor }]}>
                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                        </View>
                        <Text style={[styles.priceTitle, { color: themeColors.textPrimary }]}>Monthly</Text>
                        <Text style={[styles.priceAmount, { color: accentColor }]}>
                            <Text style={[styles.currency, { color: accentColor }]}>$</Text>1.99
                            <Text style={[styles.period, { color: accentColor }]}>/mo</Text>
                        </Text>
                        <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>Cancel anytime</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Pressable
                        style={[styles.subscribeBtn, { backgroundColor: accentColor, shadowColor: accentColor }, isPurchasing && styles.disabledBtn]}
                        onPress={handlePurchase}
                        disabled={isPurchasing}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.subscribeText}>Subscribe Now</Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.restoreBtn}
                        onPress={handleRestore}
                        disabled={isPurchasing}
                    >
                        <Text style={[styles.restoreText, { color: themeColors.textSecondary }]}>
                            Restore Purchases
                        </Text>
                    </Pressable>
                </View>

                <Pressable onPress={() => navigation.goBack()} style={styles.dismissBtn}>
                    <Text style={{ color: themeColors.textMuted }}>Maybe Later</Text>
                </Pressable>
            </ScrollView>
        </ScreenLayout>
    );
}

function FeatureItem({ icon, title, desc, colors, accentColor }: any) {
    return (
        <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: `${accentColor}20` }]}>
                <Feather name={icon as any} size={24} color={accentColor} />
            </View>
            <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{desc}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        marginBottom: 20,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    featuresContainer: {
        gap: 24,
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    pricingContainer: {
        marginBottom: 32,
    },
    priceCard: {
        borderWidth: 2,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        position: 'relative',
    },
    bestValueTag: {
        position: 'absolute',
        top: -12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    bestValueText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '800',
    },
    priceTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    priceAmount: {
        fontSize: 48,
        fontWeight: '800',
        marginBottom: 4,
    },
    currency: {
        fontSize: 24,
        fontWeight: '600',
    },
    period: {
        fontSize: 16,
        fontWeight: '500',
    },
    cancelText: {
        fontSize: 12,
    },
    actions: {
        gap: 16,
    },
    subscribeBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    subscribeText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '700',
    },
    restoreBtn: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    restoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dismissBtn: {
        marginTop: 20,
        alignItems: 'center',
    }
});
