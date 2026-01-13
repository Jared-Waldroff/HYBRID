import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
// Header for LOG_LEVEL import - ensure it's imported from 'react-native-purchases'
import Purchases, { CustomerInfo, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

const API_KEYS = {
    apple: 'test_EWFKbyVLspUDscBZXpvsdfRwXnu',
    google: 'test_EWFKbyVLspUDscBZXpvsdfRwXnu',
};

export const useRevenueCat = () => {
    const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

                if (Platform.OS === 'ios') {
                    await Purchases.configure({ apiKey: API_KEYS.apple });
                } else if (Platform.OS === 'android') {
                    await Purchases.configure({ apiKey: API_KEYS.google });
                }

                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                checkProStatus(info);

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

    const checkProStatus = (info: CustomerInfo) => {
        // "HYBRID - Walsan Software Pro" is the Entitlement Identifier from RevenueCat
        if (typeof info.entitlements.active['HYBRID - Walsan Software Pro'] !== "undefined") {
            setIsPro(true);
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
            checkProStatus(info);
            return true;
        } catch (e) {
            console.log('Restore error:', e);
            return false;
        }
    };

    return {
        isPro,
        currentOffering,
        purchasePro,
        restorePurchases,
        isLoading
    };
};
