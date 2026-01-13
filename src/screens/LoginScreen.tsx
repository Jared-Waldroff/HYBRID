import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import GradientBackground from '../components/GradientBackground';

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
            <GradientBackground />
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logoIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>HYBRID</Text>
                    <Text style={styles.tagline}>Out lift the runners, out run the lifters</Text>
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
    logoIcon: {
        width: 100,
        height: 100,
        marginBottom: 16,
        borderRadius: 20,
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
});
