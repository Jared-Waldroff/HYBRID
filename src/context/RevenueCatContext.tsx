import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

const API_KEYS = {
    apple: 'test_EWFKbyVLspUDscBZXpvsdfRwXnu',
    google: 'test_EWFKbyVLspUDscBZXpvsdfRwXnu',
};

// Valid promo codes that grant Pro access
const VALID_PROMO_CODES = [
    'TURQUOISE',
];

const PROMO_STORAGE_KEY = '@hybrid_promo_code';

// Module-level flag to prevent multiple configure() calls
let isRevenueCatConfigured = false;
let configurationPromise: Promise<void> | null = null;

// PATCH: Suppress specific internal RevenueCat SDK errors that are safe to ignore in dev
const originalConsoleError = console.error;
console.error = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' &&
        (args[0].includes("Cannot read property 'search' of undefined") ||
            args[0].includes("Error while tracking event"))) {
        // Suppress this specific known benign error
        return;
    }
    originalConsoleError.apply(console, args);
};

const configureRevenueCat = async (): Promise<void> => {
    if (isRevenueCatConfigured) return;

    if (configurationPromise) {
        return configurationPromise;
    }

    configurationPromise = (async () => {
        try {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);

            if (Platform.OS === 'ios') {
                await Purchases.configure({ apiKey: API_KEYS.apple });
            } else if (Platform.OS === 'android') {
                await Purchases.configure({ apiKey: API_KEYS.google });
            }

            isRevenueCatConfigured = true;
        } catch (e: any) {
            // Known legacy SDK issue with test keys - safe to ignore strictly for 'search' of undefined
            if (e instanceof TypeError && e.message.includes("Cannot read property 'search' of undefined")) {
                console.log('RevenueCat SDK init warning (safe to ignore in dev):', e.message);
                isRevenueCatConfigured = true; // Mark as configured anyway as the core SDK works
            } else {
                console.log('Error configuring RevenueCat:', e);
                configurationPromise = null;
                // Don't re-throw to prevent app crash, but log error
            }
        }
    })();

    return configurationPromise;
};

// Context types
interface RevenueCatContextType {
    isPro: boolean;
    isLoading: boolean;
    hasPromoAccess: boolean;
    currentOffering: PurchasesPackage | null;
    purchasePro: () => Promise<boolean | undefined>;
    restorePurchases: () => Promise<boolean>;
    applyPromoCode: (code: string) => Promise<{ success: boolean; message: string }>;
    removePromoCode: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

// Provider component
export function RevenueCatProvider({ children }: { children: ReactNode }) {
    const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPromoAccess, setHasPromoAccess] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // Check for promo code first
                const promoCode = await AsyncStorage.getItem(PROMO_STORAGE_KEY);
                if (promoCode && VALID_PROMO_CODES.includes(promoCode.toUpperCase())) {
                    setHasPromoAccess(true);
                    setIsPro(true);
                }

                // Ensure RevenueCat is configured (only happens once globally)
                await configureRevenueCat();

                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                checkProStatus(info, promoCode);

                try {
                    const offerings = await Purchases.getOfferings();
                    if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                        setCurrentOffering(offerings.current.availablePackages[0]);
                    }
                } catch (e) {
                    console.log('Error fetching offerings:', e);
                }
            } catch (e) {
                console.log('Error initializing RevenueCat:', e);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const checkProStatus = (info: CustomerInfo, promoCode?: string | null) => {
        // Check promo code first - if they have promo, they're always Pro
        if (promoCode && VALID_PROMO_CODES.includes(promoCode.toUpperCase())) {
            setHasPromoAccess(true);
            setIsPro(true);
            return;
        }

        // Check RevenueCat entitlement
        if (typeof info.entitlements.active['HYBRID - Walsan Software Pro'] !== "undefined") {
            setIsPro(true);
        } else {
            // Only set to false if NOT promo access
            if (!promoCode || !VALID_PROMO_CODES.includes(promoCode.toUpperCase())) {
                setIsPro(false);
            }
        }
    };

    const applyPromoCode = async (code: string): Promise<{ success: boolean; message: string }> => {
        const upperCode = code.toUpperCase().trim();

        if (VALID_PROMO_CODES.includes(upperCode)) {
            await AsyncStorage.setItem(PROMO_STORAGE_KEY, upperCode);
            setHasPromoAccess(true);
            setIsPro(true);
            return { success: true, message: 'Promo code applied! You now have Pro access.' };
        }

        return { success: false, message: 'Invalid promo code. Please try again.' };
    };

    const removePromoCode = async () => {
        await AsyncStorage.removeItem(PROMO_STORAGE_KEY);
        setHasPromoAccess(false);
        // Re-check RevenueCat status
        if (customerInfo) {
            checkProStatus(customerInfo, null);
        } else {
            setIsPro(false);
        }
    };

    const purchasePro = async () => {
        if (!currentOffering) return;
        try {
            const { customerInfo } = await Purchases.purchasePackage(currentOffering);
            checkProStatus(customerInfo);
            return true;
        } catch (e: any) {
            if (!e.userCancelled) {
                console.log('Purchase error:', e);
                throw e;
            }
            return false;
        }
    };

    const restorePurchases = async () => {
        try {
            const info = await Purchases.restorePurchases();
            const promoCode = await AsyncStorage.getItem(PROMO_STORAGE_KEY);
            checkProStatus(info, promoCode);
            return true;
        } catch (e) {
            console.log('Restore error:', e);
            return false;
        }
    };

    return (
        <RevenueCatContext.Provider
            value={{
                isPro,
                isLoading,
                hasPromoAccess,
                currentOffering,
                purchasePro,
                restorePurchases,
                applyPromoCode,
                removePromoCode,
            }}
        >
            {children}
        </RevenueCatContext.Provider>
    );
}

// Hook to use the context
export const useRevenueCat = (): RevenueCatContextType => {
    const context = useContext(RevenueCatContext);
    if (context === undefined) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
};
