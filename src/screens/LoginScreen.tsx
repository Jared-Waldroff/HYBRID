import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const { signIn, signUp, resetPassword } = useAuth();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (isSignUp && !username) {
            setError('Please enter a username');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (isSignUp) {
                const { error: signUpError } = await signUp(email, password, username);
                if (signUpError) {
                    setError(signUpError.message);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } else {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                        'Check your email',
                        'We sent you a confirmation link. Please verify your email to continue.'
                    );
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

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Enter your email', 'Please enter your email address first');
            return;
        }

        setLoading(true);
        const { error } = await resetPassword(email);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Check your email', 'We sent you a password reset link');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>💪</Text>
                    <Text style={styles.title}>HYBRID</Text>
                    <Text style={styles.subtitle}>
                        {isSignUp ? 'Create your account' : 'Welcome back, athlete'}
                    </Text>
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
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.75)',
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
        color: '#ffffff',
    },
    error: {
        color: '#ef4444',
        fontSize: 14,
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
    },
    linkButton: {
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
    },
    linkTextAccent: {
        fontSize: 14,
        fontWeight: '600',
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
        color: 'rgba(255,255,255,0.75)',
    },
});
