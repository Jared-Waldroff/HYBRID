import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { colors as themeColors, createStyles, Theme, presetThemes, PresetTheme, generateThemeColors } from '../theme';

interface ColorSettings {
    accent_color: string;
    secondary_color: string;
    background_color?: string;
}

interface ThemeContextType {
    theme: Theme;
    presetThemeId: string;
    presetTheme: PresetTheme;
    colors: ColorSettings;
    showCF: boolean;
    loading: boolean;
    themeColors: ReturnType<typeof generateThemeColors>;
    styles: ReturnType<typeof createStyles>;
    updateTheme: (newTheme: Theme) => Promise<void>;
    updatePresetTheme: (themeId: string) => Promise<void>;
    updateColors: (newColors: Partial<ColorSettings>) => Promise<void>;
    updateShowCF: (show: boolean) => Promise<void>;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

const DEFAULT_PRESET_THEME_ID = 'midnight';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const { user } = useAuth();
    const [presetThemeId, setPresetThemeId] = useState<string>(DEFAULT_PRESET_THEME_ID);
    const [theme, setTheme] = useState<Theme>('dark'); // Independent dark/light mode
    // Custom color overrides (optional - null means use preset default)
    const [colorOverrides, setColorOverrides] = useState<{
        primary?: string;
        secondary?: string;
        background?: string;
    }>({});
    const [showCF, setShowCF] = useState(true);
    const [loading, setLoading] = useState(true);

    // Get the current preset theme object
    const presetTheme = useMemo(() => {
        return presetThemes[presetThemeId] || presetThemes.midnight;
    }, [presetThemeId]);

    // Compute full theme colors from preset + dark/light mode + overrides
    const currentThemeColors = useMemo(() => {
        const pt = presetThemes[presetThemeId] || presetThemes.midnight;
        const isDark = theme === 'dark';
        return generateThemeColors(pt, isDark, colorOverrides);
    }, [presetThemeId, theme, colorOverrides]);

    // Get the effective colors (preset or overridden)
    const colors = useMemo<ColorSettings>(() => ({
        accent_color: colorOverrides.primary || presetTheme.primary,
        secondary_color: colorOverrides.secondary || presetTheme.secondary,
        background_color: colorOverrides.background,
    }), [presetTheme, colorOverrides]);

    const styles = useMemo(() => createStyles(theme === 'dark'), [theme]);

    // Load preferences when user changes
    useEffect(() => {
        if (user) {
            loadPreferences();
        } else {
            // Use defaults for logged out users
            setPresetThemeId(DEFAULT_PRESET_THEME_ID);
            setTheme('dark');
            setColorOverrides({});
            setShowCF(true);
            setLoading(false);
        }
    }, [user]);

    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (data && !error) {
                // Load preset theme if available
                const savedPreset = data.preset_theme_id || DEFAULT_PRESET_THEME_ID;
                setPresetThemeId(savedPreset);

                // Load dark/light mode independently
                setTheme((data.theme as Theme) || 'dark');

                // Load color overrides
                setColorOverrides({
                    primary: data.accent_color || undefined,
                    secondary: data.secondary_color || undefined,
                    background: data.background_color || undefined,
                });

                setShowCF(data.show_cf_feature !== false);
            }
        } catch (err) {
            console.error('Error loading preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    // Toggle between dark and light mode - keeps current theme
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        updateTheme(newTheme);
    };

    const updateTheme = async (newTheme: Theme) => {
        setTheme(newTheme);
        await AsyncStorage.setItem('theme', newTheme);

        if (user) {
            await supabase
                .from('user_preferences')
                .update({ theme: newTheme })
                .eq('user_id', user.id);
        }
    };

    const updatePresetTheme = async (themeId: string) => {
        if (!presetThemes[themeId]) return;

        setPresetThemeId(themeId);
        // Reset color overrides when selecting a new preset
        setColorOverrides({});

        await AsyncStorage.setItem('preset_theme_id', themeId);

        if (user) {
            await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    preset_theme_id: themeId,
                    // Keep current light/dark mode
                    theme: theme,
                    // Clear overrides when switching presets
                    accent_color: null,
                    secondary_color: null,
                    background_color: null,
                }, { onConflict: 'user_id' });
        }
    };

    const updateColors = async (newColors: Partial<ColorSettings>) => {
        const updatedOverrides = {
            primary: newColors.accent_color || colorOverrides.primary,
            secondary: newColors.secondary_color || colorOverrides.secondary,
            background: newColors.background_color || colorOverrides.background,
        };
        setColorOverrides(updatedOverrides);

        if (user) {
            await supabase
                .from('user_preferences')
                .update({
                    accent_color: updatedOverrides.primary || null,
                    secondary_color: updatedOverrides.secondary || null,
                    background_color: updatedOverrides.background || null,
                })
                .eq('user_id', user.id);
        }
    };

    const updateShowCF = async (show: boolean) => {
        setShowCF(show);

        if (user) {
            await supabase
                .from('user_preferences')
                .update({ show_cf_feature: show })
                .eq('user_id', user.id);
        }
    };

    const value: ThemeContextType = {
        theme,
        presetThemeId,
        presetTheme,
        colors,
        showCF,
        loading,
        themeColors: currentThemeColors,
        styles,
        updateTheme,
        updatePresetTheme,
        updateColors,
        updateShowCF,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}
