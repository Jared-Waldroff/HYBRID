import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { PostDraftProvider } from './src/context/PostDraftContext';
import { RevenueCatProvider } from './src/context/RevenueCatContext';
import Navigation from './src/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or error - ignore
});

function LoadingScreen() {
  return (
    <View style={[styles.container, styles.loading]}>
      <ActivityIndicator size="large" color="#1e3a5f" />
    </View>
  );
}

// Error Boundary for production crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, styles.loading]}>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
            {this.state.error?.message || 'Please restart the app'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any resources here if needed
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('App prepare error:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // Force hide splash screen after 5 seconds no matter what
    const forceHideTimeout = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore - already hidden
      }
    }, 5000);

    return () => clearTimeout(forceHideTimeout);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Splash screen already hidden - ignore
      }
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <AuthProvider>
          <ThemeProvider>
            <RevenueCatProvider>
              <PostDraftProvider>
                <View style={styles.container}>
                  <StatusBar style="light" />
                  <Navigation />
                </View>
              </PostDraftProvider>
            </RevenueCatProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a141f',
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
