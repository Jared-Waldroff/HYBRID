import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import GradientBackground from '../components/GradientBackground';
import { useAlert } from '../components/CustomAlert';

export default function LoginScreen() {
    const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword } = useAuth();
    const { showAlert } = useAlert();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadRememberedCredentials();
    }, []);

    const loadRememberedCredentials = async () => {
        try {
            const savedEmail = await SecureStore.getItemAsync('remembered_user_email');
            const savedPassword = await SecureStore.getItemAsync('remembered_user_password');

            if (savedEmail && savedPassword) {
                setEmail(savedEmail);
                setPassword(savedPassword);
                setRememberMe(true);
            }
        } catch (error) {
            console.log('Error loading saved credentials:', error);
        }
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (isSignUp) {
            if (!username) {
                setError('Please enter a username');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Handle Remember Me
            if (rememberMe) {
                await SecureStore.setItemAsync('remembered_user_email', email);
                await SecureStore.setItemAsync('remembered_user_password', password);
            } else {
                await SecureStore.deleteItemAsync('remembered_user_email');
                await SecureStore.deleteItemAsync('remembered_user_password');
            }

            if (isSignUp) {
                const { error: signUpError } = await signUp(email, password, username);
                if (signUpError) {
                    setError(signUpError.message);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } else {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showAlert({
                        title: 'Check your email',
                        message: 'We sent you a confirmation link. Please verify your email to continue.'
                    });
                }
            } else {
                const { error: signInError } = await signIn(email, password);
                if (signInError) {
                    setError(signInError.message);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } else {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };


    const handleAppleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const { error: appleError } = await signInWithApple();

            if (appleError) {
                // Ignore cancellation errors
                if (appleError.message !== 'Sign in cancelled') {
                    setError(appleError.message || 'Apple sign-in failed');
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
            } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            showAlert({ title: 'Enter your email', message: 'Please enter your email address first' });
            return;
        }

        setLoading(true);
        const { error } = await resetPassword(email);
        setLoading(false);

        if (error) {
            showAlert({ title: 'Error', message: error.message });
        } else {
            showAlert({ title: 'Check your email', message: 'We sent you a password reset link' });
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const { error: googleError } = await signInWithGoogle();

            if (googleError) {
                setError(googleError.message || 'Google sign-in failed');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <GradientBackground />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/hybrid-logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.tagline}>Out Lift The Runners, Out Run The Lifters</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {isSignUp && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Choose a username"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="emailAddress"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                            textContentType="password"
                        />
                    </View>

                    {isSignUp && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={true}
                                textContentType="password"
                            />
                        </View>
                    )}

                    {/* Remember Me Toggle */}
                    {!isSignUp && (
                        <Pressable
                            style={styles.rememberMeContainer}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setRememberMe(!rememberMe);
                            }}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Feather name="check" size={12} color="#0a141f" />}
                            </View>
                            <Text style={styles.rememberMeText}>Remember me</Text>
                        </Pressable>
                    )}

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Submit Button */}
                    <Pressable
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    {!isSignUp && (
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.divider} />
                        </View>
                    )}

                    {/* Apple Sign In (iOS Only) */}
                    {!isSignUp && Platform.OS === 'ios' && (
                        <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                            cornerRadius={12}
                            style={{ width: '100%', height: 48, marginBottom: 12 }}
                            onPress={handleAppleSignIn}
                        />
                    )}

                    {/* Google Sign In */}
                    {!isSignUp && (
                        <Pressable
                            style={styles.googleButton}
                            onPress={handleGoogleSignIn}
                            disabled={loading}
                        >
                            <Ionicons name="logo-google" size={20} color="#fff" />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </Pressable>
                    )}

                    {/* Forgot Password */}
                    {!isSignUp && (
                        <Pressable style={styles.linkButton} onPress={handleForgotPassword}>
                            <Text style={styles.linkText}>Forgot password?</Text>
                        </Pressable>
                    )}

                    {/* Toggle Sign Up / Sign In */}
                    <View style={styles.toggleContainer}>
                        <Text style={styles.toggleText}>
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        </Text>
                        <Pressable
                            style={styles.linkButton}
                            onPress={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                            }}
                        >
                            <Text style={styles.linkTextAccent}>
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a141f',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 120, // Move content down visually
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoImage: {
        width: 320,
        height: 92,
        marginBottom: 24,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        fontFamily: 'Inter_700Bold',
        color: '#ffffff',
        letterSpacing: 2,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: 'rgba(255,255,255,0.6)',
        fontStyle: 'italic',
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Inter_500Medium',
        color: 'rgba(255,255,255,0.75)',
    },
    input: {
        minHeight: 48,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(201,162,39,0.2)',
        borderRadius: 12,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#ffffff',
    },
    error: {
        color: '#ef4444',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    button: {
        minHeight: 48,
        backgroundColor: '#1e3a5f',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Inter_600SemiBold',
    },
    linkButton: {
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.75)',
    },
    linkTextAccent: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Inter_600SemiBold',
        color: '#c9a227',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: 16,
    },
    toggleText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.75)',
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#c9a227', // Gold accent
        borderColor: '#c9a227',
    },
    rememberMeText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.75)',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: 'rgba(255,255,255,0.5)',
    },
    googleButton: {
        minHeight: 48,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'Inter_500Medium',
    },
});
