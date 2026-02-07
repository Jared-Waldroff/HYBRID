import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert, Modal, TextInput, Image, ActivityIndicator, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAthleteProfile } from '../hooks/useAthleteProfile';
import { useRevenueCat } from '../context/RevenueCatContext';
import { supabase } from '../lib/supabaseClient';
import { spacing, radii, typography, colors, presetThemes } from '../theme';
import ScreenLayout from '../components/ScreenLayout';
import ProfileLayout from '../components/ProfileLayout';

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { signOut, user } = useAuth();
    const { theme, toggleTheme, themeColors, colors: userColors, updateColors, showCF, updateShowCF, presetThemeId, updatePresetTheme } = useTheme();
    const { profile, updateProfile, fetchProfile, loading: profileLoading } = useAthleteProfile();
    const { hasPromoAccess, applyPromoCode, removePromoCode, isPro } = useRevenueCat();

    // State
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [editingColor, setEditingColor] = useState<'primary' | 'secondary'>('primary');
    const [customColor, setCustomColor] = useState('');

    // Edit Profile State
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [bio, setBio] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Stats
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

    // Promo & Features
    const [promoCode, setPromoCode] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Feedback
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Initial Data
    useEffect(() => {
        if (profile) {
            setBio(profile.bio || '');
            setDisplayName(profile.display_name || '');
        }
    }, [profile]);

    // Fetch Stats
    useEffect(() => {
        if (!user?.id) return;
        const fetchStats = async () => {
            // Posts count
            const { count: posts } = await supabase
                .from('activity_feed')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Squad (Followers/Members depending on def). Assuming 'squad_members' where squad_id is me.
            const { count: followers } = await supabase
                .from('squad_members')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', user.id);

            // Following (Where I am a member)
            const { count: following } = await supabase
                .from('squad_members')
                .select('*', { count: 'exact', head: true })
                .eq('member_id', user.id);

            setStats({
                posts: posts || 0,
                followers: followers || 0,
                following: following || 0
            });
        };
        fetchStats();
    }, [user?.id]);

    // Keyboard Listener
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Handlers
    const handlePickPhoto = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri: string) => {
        if (!user) return;
        setUploadingPhoto(true);
        try {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const fileName = `${user.id}-${Date.now()}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            await updateProfile({ avatar_url: publicUrl });
            await fetchProfile();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Upload Failed', err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const updates = {
                id: user?.id,
                bio: bio,
                display_name: displayName,
                updated_at: new Date(),
            };
            const { error } = await supabase.from('athlete_profiles').upsert(updates);
            if (error) throw error;
            await fetchProfile();
            setShowEditProfile(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleJoinPro = async () => {
        setApplyingPromo(true);
        try {
            const result = await applyPromoCode(promoCode);
            setApplyingPromo(false);
            if (result.success) {
                Alert.alert('Success!', result.message);
                setPromoCode('');
            } else {
                Alert.alert('Invalid Code', result.message);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setApplyingPromo(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) return;
        setSendingFeedback(true);
        try {
            const { error } = await supabase.from('feedback').insert({
                user_id: user?.id,
                content: feedbackText,
                type: 'general'
            });
            if (error) throw error;
            setFeedbackText('');
            setShowFeedbackModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Thank You', 'Your feedback has been received!');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to send feedback.');
        } finally {
            setSendingFeedback(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await signOut();
                }
            }
        ]);
    };

    // Color Logic
    const openColorPicker = (type: 'primary' | 'secondary') => {
        setEditingColor(type);
        setCustomColor(type === 'primary' ? userColors.accent_color : userColors.secondary_color);
        setShowCustomPicker(true);
    };

    const handleColorSave = () => {
        const newColors = {
            ...userColors,
            [editingColor === 'primary' ? 'accent_color' : 'secondary_color']: customColor
        };
        updateColors(newColors);
        setShowCustomPicker(false);
    };

    const handlePresetSelect = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updatePresetTheme(id);
    };

    // Sub-components
    const SettingsRow = ({ icon, label, value, onPress, showChevron = true }: any) => (
        <Pressable
            style={[styles.settingsRow, { backgroundColor: themeColors.inputBg }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingsRowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: userColors.accent_color }]}>
                    <Feather name={icon} size={18} color="#fff" />
                </View>
                <Text style={[styles.settingsLabel, { color: themeColors.textPrimary }]}>{label}</Text>
            </View>
            <View style={styles.settingsRowRight}>
                {value && <Text style={[styles.settingsValue, { color: themeColors.textSecondary }]}>{value}</Text>}
                {showChevron && onPress && <Feather name="chevron-right" size={20} color={themeColors.textMuted} />}
            </View>
        </Pressable>
    );

    const presetThemeArray = Object.values(presetThemes);
    // Curated color palette - 20 colors in a 5x4 grid
    const COLOR_PALETTE = [
        // Row 1: Blues & Teals
        '#0ea5e9', '#3b82f6', '#6366f1', '#1e3a5f', '#0f766e',
        // Row 2: Greens & Yellows  
        '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#c9a227',
        // Row 3: Oranges & Reds
        '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#ec4899',
        // Row 4: Purples & Neutrals
        '#a855f7', '#8b5cf6', '#7c3aed', '#64748b', '#1f2937',
    ];

    return (
        <ScreenLayout>
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50 }}
            >
                {/* Profile Layout with REAL stats */}
                <ProfileLayout
                    user={profile}
                    isOwnProfile={true}
                    stats={stats}
                    loading={profileLoading}
                    onEditProfile={() => setShowEditProfile(true)}
                    onViewBadges={() => navigation.navigate('Badges', { user: profile })}
                >
                    <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.md }}>

                        {/* Account */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Account</Text>
                            <View style={styles.sectionContent}>
                                <SettingsRow icon="mail" label="Email" value={user?.email} showChevron={false} />
                            </View>
                        </View>

                        {/* Appearance */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Appearance</Text>
                            <View style={styles.sectionContent}>
                                <View style={[styles.settingsRow, { backgroundColor: themeColors.inputBg }]}>
                                    <View style={styles.settingsRowLeft}>
                                        <View style={[styles.iconContainer, { backgroundColor: userColors.accent_color }]}>
                                            <Feather name="moon" size={18} color="#fff" />
                                        </View>
                                        <Text style={[styles.settingsLabel, { color: themeColors.textPrimary }]}>Dark Mode</Text>
                                    </View>
                                    <Switch
                                        value={theme === 'dark'}
                                        onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
                                        trackColor={{ false: themeColors.inputBorder, true: userColors.accent_color }}
                                        ios_backgroundColor={themeColors.inputBorder}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* App Colors */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>App Colors</Text>
                            <View style={[styles.colorSection, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
                                <Text style={[styles.subsectionTitle, { color: themeColors.textPrimary }]}>Preset Themes</Text>
                                <View style={styles.presetGrid}>
                                    {presetThemeArray.map((preset: any) => (
                                        <Pressable
                                            key={preset.id}
                                            style={[styles.presetItem, presetThemeId === preset.id && styles.presetItemSelected]}
                                            onPress={() => handlePresetSelect(preset.id)}
                                        >
                                            <LinearGradient
                                                colors={[preset.primary, preset.secondary]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={[
                                                    styles.presetCircle,
                                                    presetThemeId === preset.id && styles.presetCircleSelected
                                                ]}
                                            />
                                            <Text style={[styles.presetLabel, { color: themeColors.textSecondary }]}>{preset.name.toUpperCase()}</Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={[styles.customizeTitle, { color: themeColors.textPrimary }]}>Customize Colors</Text>
                                <Text style={[styles.customizeSubtitle, { color: themeColors.textMuted }]}>Tap a color to customize it</Text>
                                <View style={styles.customColorsRow}>
                                    <Pressable style={styles.customColorItem} onPress={() => openColorPicker('primary')}>
                                        <Text style={[styles.customColorLabel, { color: themeColors.textSecondary }]}>Primary</Text>
                                        <View style={[styles.customColorSwatch, { backgroundColor: userColors.accent_color }]} />
                                    </Pressable>
                                    <Pressable style={styles.customColorItem} onPress={() => openColorPicker('secondary')}>
                                        <Text style={[styles.customColorLabel, { color: themeColors.textSecondary }]}>Secondary</Text>
                                        <View style={[styles.customColorSwatch, { backgroundColor: userColors.secondary_color }]} />
                                    </Pressable>
                                </View>

                                <Text style={[styles.previewTitle, { color: themeColors.textPrimary }]}>Preview</Text>
                                <LinearGradient
                                    colors={[userColors.accent_color, userColors.secondary_color]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.previewButton}
                                >
                                    <Text style={styles.previewButtonText}>Your Theme</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Features (CrossFit) */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Features</Text>
                            <View style={styles.sectionContent}>
                                <View style={[styles.settingsRow, { backgroundColor: themeColors.inputBg }]}>
                                    <View style={styles.settingsRowLeft}>
                                        <View style={[styles.iconContainer, { backgroundColor: '#1e3a5f', borderWidth: 1, borderColor: '#c9a227' }]}>
                                            <Text style={{ color: '#c9a227', fontWeight: '700', fontSize: 10 }}>CF</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.settingsLabel, { color: themeColors.textPrimary }]}>CrossFit Workouts</Text>
                                            <Text style={[styles.settingsSubLabel, { color: themeColors.textMuted }]}>Show CrossFit Open button</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={showCF}
                                        onValueChange={updateShowCF}
                                        trackColor={{ false: themeColors.inputBorder, true: userColors.accent_color }}
                                        ios_backgroundColor={themeColors.inputBorder}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Promo Code */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Promo Code</Text>
                            <View style={styles.sectionContent}>
                                {hasPromoAccess ? (
                                    <Pressable style={[styles.settingsRow, { backgroundColor: themeColors.inputBg }]} onPress={() => {
                                        Alert.alert('Remove Promo Code', 'Remove access?', [{ text: 'Cancel' }, { text: 'Remove', onPress: removePromoCode }]);
                                    }}>
                                        <View style={styles.settingsRowLeft}>
                                            <Feather name="gift" size={18} color={userColors.accent_color} />
                                            <Text style={[styles.settingsLabel, { color: themeColors.textPrimary }]}>Pro Access Active</Text>
                                        </View>
                                        <Feather name="x-circle" size={20} color={themeColors.textMuted} />
                                    </Pressable>
                                ) : (
                                    <View style={[styles.settingsRow, { backgroundColor: themeColors.inputBg }]}>
                                        <TextInput
                                            style={{ flex: 1, color: themeColors.textPrimary }}
                                            placeholder="Enter Code"
                                            placeholderTextColor={themeColors.textMuted}
                                            value={promoCode}
                                            onChangeText={setPromoCode}
                                        />
                                        <Pressable onPress={handleJoinPro} disabled={applyingPromo}>
                                            {applyingPromo ? <ActivityIndicator size="small" color={userColors.accent_color} /> : <Text style={{ color: userColors.accent_color, fontWeight: 'bold' }}>Apply</Text>}
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Support */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Support</Text>
                            <View style={styles.sectionContent}>
                                <SettingsRow icon="message-square" label="Send Feedback" onPress={() => setShowFeedbackModal(true)} />
                            </View>
                        </View>

                        {/* Admin Section (Added Back) */}
                        {user?.email === 'jared.waldroff@gmail.com' && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Admin</Text>
                                <View style={styles.sectionContent}>
                                    <SettingsRow icon="shield" label="View User Feedback" onPress={() => navigation.navigate('Admin')} />
                                </View>
                            </View>
                        )}

                        {/* Danger Zone */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Account Actions</Text>
                            <View style={styles.sectionContent}>
                                <Pressable style={[styles.settingsRow, styles.dangerRow, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} onPress={handleSignOut}>
                                    <View style={styles.settingsRowLeft}>
                                        <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                                            <Feather name="log-out" size={18} color="#fff" />
                                        </View>
                                        <Text style={[styles.settingsLabel, { color: colors.error }]}>Sign Out</Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={colors.error} />
                                </Pressable>
                            </View>
                        </View>

                        {/* Footer Version Info */}
                        <View style={styles.appInfo}>
                            <Text style={[styles.appName, { color: themeColors.textMuted }]}>HYBRID</Text>
                            <Text style={[styles.appVersion, { color: themeColors.textMuted, marginTop: 4 }]}>Walsan Software</Text>
                            <Text style={[styles.appVersion, { color: themeColors.textMuted }]}>Version 1.0.0</Text>
                        </View>

                        <View style={{ height: keyboardHeight }} />
                    </View>
                </ProfileLayout>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={showEditProfile} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditProfile(false)}>
                <View style={[styles.modalContentFull, { backgroundColor: themeColors.bgPrimary }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Edit Profile</Text>
                        <Pressable onPress={() => setShowEditProfile(false)}>
                            <Feather name="x" size={24} color={themeColors.textPrimary} />
                        </Pressable>
                    </View>
                    <ScrollView style={{ padding: spacing.md }}>
                        <Pressable style={{ alignItems: 'center', marginBottom: spacing.xl }} onPress={handlePickPhoto}>
                            <View style={[styles.avatarRing, { borderColor: userColors.accent_color }]}>
                                {profile?.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.inputBg }]}>
                                        <Feather name="user" size={40} color={themeColors.textMuted} />
                                    </View>
                                )}
                                {uploadingPhoto && <View style={styles.uploadingOverlay}><ActivityIndicator color="#fff" /></View>}
                            </View>
                            <Text style={{ color: userColors.accent_color, fontWeight: 'bold', marginTop: 8 }}>Change Photo</Text>
                        </Pressable>

                        <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Display Name</Text>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.inputBorder }]}
                            value={displayName}
                            onChangeText={setDisplayName}
                        />

                        <Text style={[styles.inputLabel, { color: themeColors.textSecondary, marginTop: spacing.md }]}>Bio</Text>
                        <TextInput
                            style={[styles.textInput, styles.bioInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.inputBorder }]}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={3}
                        />

                        <Pressable
                            style={[styles.saveButton, { backgroundColor: userColors.accent_color, marginTop: spacing.xl }]}
                            onPress={handleSaveProfile}
                            disabled={savingProfile}
                        >
                            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                        </Pressable>
                    </ScrollView>
                </View>
            </Modal>

            {/* Color Picker Modal - Visual Palette */}
            <Modal visible={showCustomPicker} transparent animationType="slide" onRequestClose={() => setShowCustomPicker(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCustomPicker(false)}>
                    <Pressable style={[styles.colorPickerModal, { backgroundColor: themeColors.bgSecondary }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                                Choose {editingColor === 'primary' ? 'Primary' : 'Secondary'} Color
                            </Text>
                            <Pressable onPress={() => setShowCustomPicker(false)}>
                                <Feather name="x" size={24} color={themeColors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.colorPaletteGrid}>
                            {COLOR_PALETTE.map((color) => (
                                <Pressable
                                    key={color}
                                    style={[
                                        styles.colorPaletteItem,
                                        { backgroundColor: color },
                                        customColor === color && styles.colorPaletteItemSelected
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setCustomColor(color);
                                    }}
                                />
                            ))}
                        </View>

                        {/* Preview of selected color */}
                        <View style={styles.colorPreviewRow}>
                            <Text style={[styles.colorPreviewLabel, { color: themeColors.textSecondary }]}>Selected:</Text>
                            <View style={[styles.colorPreviewSwatch, { backgroundColor: customColor }]} />
                        </View>

                        <Pressable
                            style={[styles.saveButton, { backgroundColor: userColors.accent_color }]}
                            onPress={handleColorSave}
                        >
                            <Text style={styles.saveButtonText}>Apply Color</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Feedback Modal */}
            <Modal visible={showFeedbackModal} transparent animationType="slide" onRequestClose={() => setShowFeedbackModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <Pressable style={{ flex: 1 }} onPress={() => setShowFeedbackModal(false)}>
                        {/* Overlay Close */}
                    </Pressable>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Feedback</Text>
                            <Pressable onPress={() => setShowFeedbackModal(false)}><Feather name="x" size={24} color={themeColors.textSecondary} /></Pressable>
                        </View>
                        <TextInput
                            style={[styles.textInput, { height: 100, backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.inputBorder }]}
                            placeholder="Your feedback..."
                            placeholderTextColor={themeColors.textMuted}
                            multiline
                            value={feedbackText}
                            onChangeText={setFeedbackText}
                        />
                        <Pressable
                            style={[styles.saveButton, { backgroundColor: userColors.accent_color, marginTop: spacing.md }]}
                            onPress={handleSendFeedback}
                            disabled={sendingFeedback}
                        >
                            {sendingFeedback ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Send Feedback</Text>}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        marginLeft: spacing.sm,
    },
    sectionContent: {
        borderRadius: radii.lg,
        overflow: 'hidden',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 52,
        marginBottom: 1,
    },
    settingsRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    settingsRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: radii.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsLabel: {
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
    },
    settingsSubLabel: {
        fontSize: 12
    },
    settingsValue: {
        fontSize: typography.sizes.sm,
    },
    dangerRow: {
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },

    // Modal & Inputs
    modalContentFull: { flex: 1, paddingTop: 60 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: spacing.md },
    modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
    textInput: { borderRadius: 8, padding: 12, borderWidth: 1, fontSize: 16 },
    bioInput: { height: 80, paddingTop: 12 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    saveButton: { borderRadius: 8, padding: 16, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Avatar
    avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', margin: spacing.md },
    avatarImage: { width: 88, height: 88, borderRadius: 44 },
    avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },

    // Feature/Color Specific
    colorSection: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
    colorSectionTitle: {
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    subsectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: spacing.lg, paddingHorizontal: 4 },
    presetItem: { width: '22%', alignItems: 'center', opacity: 0.7 },
    presetItemSelected: { opacity: 1 },
    presetCircle: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
    presetCircleSelected: { borderWidth: 3, borderColor: '#fff' },
    presetGradient: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
    presetGradientSelected: { borderWidth: 3, borderColor: '#fff' },
    presetLabel: { fontSize: 9, fontWeight: '500', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing.lg },
    customizeTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'center' },
    customizeSubtitle: { fontSize: 12, marginBottom: spacing.md, textAlign: 'center' },
    customColorsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: spacing.lg },
    customColorItem: { alignItems: 'center', flex: 1 },
    customColorLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
    customColorSwatch: { width: '100%', height: 44, borderRadius: radii.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    previewTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm, textAlign: 'left' },
    previewButton: { borderRadius: radii.lg, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    previewButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    colorInput: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },

    // Color Picker Modal
    colorPickerModal: {
        padding: spacing.lg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    colorPaletteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    colorPaletteItem: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorPaletteItemSelected: {
        borderColor: '#fff',
        borderWidth: 3,
        transform: [{ scale: 1.1 }],
    },
    colorPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: spacing.lg,
    },
    colorPreviewLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    colorPreviewSwatch: {
        width: 80,
        height: 36,
        borderRadius: radii.sm,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // App Info
    appInfo: { alignItems: 'center', paddingTop: spacing.md },
    appName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
    appVersion: { fontSize: typography.sizes.xs, marginTop: 4 },
});
