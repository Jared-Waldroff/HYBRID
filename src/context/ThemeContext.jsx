import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({})

export const useTheme = () => useContext(ThemeContext)

const DEFAULT_COLORS = {
    accent_color: '#1e3a5f',
    secondary_color: '#c9a227'
}

export function ThemeProvider({ children }) {
    const { user } = useAuth()
    const [theme, setTheme] = useState('dark')
    const [colors, setColors] = useState(DEFAULT_COLORS)
    const [showCF, setShowCF] = useState(true)
    const [loading, setLoading] = useState(true)

    // Load preferences from Supabase when user changes
    useEffect(() => {
        if (user) {
            loadPreferences()
        } else {
            // Use defaults for logged out users
            setTheme('dark')
            setColors(DEFAULT_COLORS)
            applyColors(DEFAULT_COLORS)
            setShowCF(true)
            setLoading(false)
        }
    }, [user])

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data && !error) {
                setTheme(data.theme || 'dark')
                const newColors = {
                    accent_color: data.accent_color || DEFAULT_COLORS.accent_color,
                    secondary_color: data.secondary_color || DEFAULT_COLORS.secondary_color
                }
                setColors(newColors)
                applyColors(newColors)
                // Use bracket notation if show_cf_feature isn't camelCased in returned object (Supabase usually preserves case but snake case in DB)
                // Actually supabase-js converts to object as-is unless transformed.
                // Safest to check both or assume DB column name matches
                setShowCF(data.show_cf_feature !== false) // Default to true if null/undefined
            }
        } catch (err) {
            console.error('Error loading preferences:', err)
        } finally {
            setLoading(false)
        }
    }

    const applyColors = (colorSettings) => {
        document.documentElement.style.setProperty('--accent-primary', colorSettings.accent_color)
        document.documentElement.style.setProperty('--accent-secondary', colorSettings.secondary_color)
    }

    const updateTheme = async (newTheme) => {
        setTheme(newTheme)
        if (user) {
            await supabase
                .from('user_preferences')
                .update({ theme: newTheme })
                .eq('user_id', user.id)
        }
    }

    const updateColors = async (newColors) => {
        setColors(newColors)
        applyColors(newColors)
        if (user) {
            await supabase
                .from('user_preferences')
                .update({
                    accent_color: newColors.accent_color,
                    secondary_color: newColors.secondary_color
                })
                .eq('user_id', user.id)
        }
    }

    const updateShowCF = async (show) => {
        setShowCF(show)
        if (user) {
            await supabase
                .from('user_preferences')
                .update({ show_cf_feature: show })
                .eq('user_id', user.id)
        }
    }

    const toggleTheme = () => {
        updateTheme(theme === 'dark' ? 'light' : 'dark')
    }

    const value = {
        theme,
        colors,
        showCF,
        loading,
        updateTheme,
        updateColors,
        updateShowCF,
        toggleTheme
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
