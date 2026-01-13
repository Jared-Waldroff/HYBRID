
import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { colors } from '../theme';

// Mock User
export const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated',
};

// Mock Auth Provider
export const MockAuthProvider = ({ children, user = mockUser }: { children: React.ReactNode, user?: any }) => {
    return (
        <AuthContext.Provider
            value={{
                user,
                session: null,
                loading: false,
                signIn: jest.fn(),
                signUp: jest.fn(),
                signOut: jest.fn(),
                signInWithGoogle: jest.fn(),
                resetPassword: jest.fn(),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Mock Theme Provider
export const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeContext.Provider
            value={{
                theme: 'dark',
                toggleTheme: jest.fn(),
                colors: colors.dark,
                themeColors: {
                    bgPrimary: '#0a141f',
                    bgSecondary: '#112240',
                    bgTertiary: '#1a202c',
                    headerBg: '#0a141f',
                    footerBg: '#0a141f',
                    textPrimary: '#ffffff',
                    textSecondary: '#a0aec0',
                    textTertiary: '#718096',
                    textMuted: '#4a5568',
                    glassBg: 'rgba(10, 20, 31, 0.8)',
                    glassBorder: 'rgba(255, 255, 255, 0.1)',
                    inputBg: '#1a202c',
                    inputBorder: '#2d3748',
                    divider: '#2d3748',
                    accentText: '#c9a227',
                    accent_color: '#c9a227',
                    secondary_color: '#112240',
                },
                showCF: true,
                toggleCF: jest.fn(),
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

// Custom render function
const customRender = (ui: React.ReactElement, options?: any) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        return (
            <MockAuthProvider user={options?.user || mockUser}>
                <MockThemeProvider>
                    {children}
                </MockThemeProvider>
            </MockAuthProvider>
        );
    };

    return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };
