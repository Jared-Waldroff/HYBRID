import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';

// Required for expo-auth-session to work properly
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (
        email: string,
        password: string,
        username: string
    ) => Promise<{ data: any; error: any }>;
    signIn: (
        email: string,
        password: string
    ) => Promise<{ data: any; error: any }>;
    signInWithGoogle: () => Promise<{ data: any; error: any }>;
    signOut: () => Promise<{ error: any }>;
    resetPassword: (email: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session with timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.warn('Auth session check timed out - proceeding without session');
            setUser(null);
            setSession(null);
            setLoading(false);
        }, 5000);

        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
                clearTimeout(timeoutId);
                console.log(
                    'Session check complete:',
                    session ? 'logged in' : 'no session'
                );
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                console.error('Failed to get session:', error);
                setUser(null);
                setSession(null);
                setLoading(false);
            });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            setSession(session);
            setUser(session?.user ?? null);

            // Create user preferences if new sign up
            if (event === 'SIGNED_IN' && session?.user) {
                try {
                    const { data: existingPrefs } = await supabase
                        .from('user_preferences')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (!existingPrefs) {
                        await supabase.from('user_preferences').insert({
                            user_id: session.user.id,
                            theme: 'dark',
                            accent_color: '#1e3a5f',
                            secondary_color: '#c9a227',
                        });
                    }

                    // Also create athlete profile if it doesn't exist (for OAuth users)
                    const { data: existingProfile } = await supabase
                        .from('athlete_profiles')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (!existingProfile) {
                        // Generate username from email or Google name
                        const baseName = session.user.user_metadata?.name ||
                            session.user.email?.split('@')[0] ||
                            'user';
                        const username = baseName.toLowerCase().replace(/[^a-z0-9]/g, '') +
                            Math.floor(Math.random() * 1000);

                        await supabase.from('athlete_profiles').insert({
                            user_id: session.user.id,
                            username: username,
                            display_name: session.user.user_metadata?.name || null,
                            avatar_url: session.user.user_metadata?.avatar_url || null,
                        });
                    }
                } catch (err: any) {
                    console.warn('Could not create user preferences/profile:', err.message);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, username: string) => {
        // First check if username is available
        const { data: existingUser } = await supabase
            .from('athlete_profiles')
            .select('username')
            .eq('username', username.toLowerCase())
            .single();

        if (existingUser) {
            return { data: null, error: { message: 'Username already taken' } };
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) return { data, error };

        // Create athlete profile with username
        if (data?.user) {
            const { error: profileError } = await supabase
                .from('athlete_profiles')
                .upsert(
                    {
                        user_id: data.user.id,
                        username: username.toLowerCase(),
                    },
                    { onConflict: 'user_id' }
                );

            if (profileError) {
                console.error('Error creating profile:', profileError);
            }
        }

        return { data, error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    };

    const signInWithGoogle = async () => {
        try {
            // Create redirect URI using app scheme
            const redirectUri = makeRedirectUri({
                scheme: 'hybridworkout',
            });

            console.log('Redirect URI:', redirectUri);

            // Get OAuth URL from Supabase  
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error('No OAuth URL returned');

            // Open browser for OAuth
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            if (result.type === 'success' && result.url) {
                // Extract tokens from URL
                const url = new URL(result.url);
                const params = new URLSearchParams(url.hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken) {
                    // Set session with tokens
                    const { data: sessionData, error: sessionError } =
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                    if (sessionError) throw sessionError;
                    return { data: sessionData, error: null };
                }
            }

            return { data: null, error: { message: 'Authentication cancelled' } };
        } catch (err: any) {
            console.error('Google sign-in error:', err);
            return { data: null, error: err };
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const resetPassword = async (email: string) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        return { data, error };
    };

    const value: AuthContextType = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
