import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    Image,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BadgeRow from './BadgeRow';
import { useAlert } from './CustomAlert';
import { typography, spacing, radii } from '../theme';

interface UserProfile {
    id: string;
    display_name: string;
    avatar_url?: string;
    badges?: string[];
}

interface Props {
    visible: boolean;
    onClose: () => void;
    user: UserProfile | null;
}

export default function SquadUserModal({ visible, onClose, user }: Props) {
    const { themeColors, colors: userColors } = useTheme();
    const { user: currentUser } = useAuth();
    const { showAlert } = useAlert();

    const [status, setStatus] = useState<'none' | 'pending' | 'accepted' | 'self' | 'loading'>('loading');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (visible && user && currentUser) {
            checkStatus();
        } else {
            setStatus('loading');
        }
    }, [visible, user, currentUser]);

    const checkStatus = async () => {
        if (!user || !currentUser) return;

        if (user.id === currentUser.id) {
            setStatus('self');
            return;
        }

        setStatus('loading');
        try {
            // Check for any relationship
            const { data, error } = await supabase
                .from('squad_members')
                .select('status, requester_id, receiver_id')
                .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(requester_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking squad status:', error);
            }

            if (data) {
                setStatus(data.status as any); // 'pending' or 'accepted'
            } else {
                setStatus('none');
            }
        } catch (err) {
            console.error('Squad check error:', err);
            setStatus('none');
        }
    };

    const handleAddToSquad = async () => {
        if (!user || !currentUser) return;

        setActionLoading(true);
        try {
            // Add as accepted immediately based on user preference to "add to own squad"
            // or pending if we want realism. User said "button to add them... or says they are in your squad".
            // I'll use 'accepted' to reduce friction as per the Seed logic, 
            // but normally this should be 'pending'. I'll stick to 'accepted' for now as it seems to be a "Squad" (like Following) vs "Friend" model in this specific requested context.
            // Actually, let's use 'accepted' to delight the user with instant gratification.

            const { error } = await supabase
                .from('squad_members')
                .insert({
                    requester_id: currentUser.id,
                    receiver_id: user.id,
                    status: 'accepted'
                });

            if (error) throw error;

            setStatus('accepted');
            showAlert({ title: 'Success', message: `${user.display_name} Added to Squad!` });
        } catch (err: any) {
            console.error('Add squad error:', err);
            showAlert({ title: 'Error', message: 'Failed to add to squad' });
        } finally {
            setActionLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: themeColors.bgSecondary, borderColor: themeColors.glassBorder }]}>
                    {/* Close Button */}
                    <Pressable style={styles.closeBtn} onPress={onClose}>
                        <Feather name="x" size={24} color={themeColors.textSecondary} />
                    </Pressable>

                    {/* Avatar */}
                    <View style={[styles.avatarContainer, { borderColor: userColors.accent_color }]}>
                        {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.bgTertiary }]}>
                                <Text style={[styles.avatarInitial, { color: themeColors.textSecondary }]}>
                                    {user.display_name?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Name & Badges */}
                    <Text style={[styles.name, { color: themeColors.textPrimary }]}>{user.display_name}</Text>

                    {user.badges && user.badges.length > 0 && (
                        <View style={styles.badgeContainer}>
                            <BadgeRow badges={user.badges} maxDisplay={3} size="medium" />
                        </View>
                    )}

                    {/* Action Button */}
                    <View style={styles.actionContainer}>
                        {status === 'loading' ? (
                            <ActivityIndicator color={userColors.accent_color} />
                        ) : status === 'self' ? (
                            <Text style={[styles.statusText, { color: themeColors.textMuted }]}>That's you!</Text>
                        ) : status === 'accepted' ? (
                            <View style={[styles.statusBadge, { backgroundColor: userColors.accent_color + '20', borderColor: userColors.accent_color }]}>
                                <Feather name="check" size={16} color={userColors.accent_color} />
                                <Text style={[styles.statusBadgeText, { color: userColors.accent_color }]}>In Your Squad</Text>
                            </View>
                        ) : status === 'pending' ? (
                            <View style={[styles.statusBadge, { backgroundColor: themeColors.bgTertiary, borderColor: themeColors.textMuted }]}>
                                <Feather name="clock" size={16} color={themeColors.textSecondary} />
                                <Text style={[styles.statusBadgeText, { color: themeColors.textSecondary }]}>Request Sent</Text>
                            </View>
                        ) : (
                            <Pressable
                                style={[styles.addBtn, { backgroundColor: userColors.accent_color }]}
                                onPress={handleAddToSquad}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Feather name="user-plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.addBtnText}>Add to Squad</Text>
                                    </>
                                )}
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    content: {
        width: '85%',
        borderRadius: radii.xl,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    closeBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        padding: 4,
        zIndex: 1,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    name: {
        fontSize: typography.sizes.xl,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    badgeContainer: {
        marginBottom: spacing.lg,
    },
    actionContainer: {
        width: '100%',
        alignItems: 'center',
        paddingTop: spacing.sm,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.lg,
        width: '100%',
    },
    addBtnText: {
        color: '#fff',
        fontSize: typography.sizes.base,
        fontWeight: 'bold',
    },
    statusText: {
        fontSize: typography.sizes.base,
        fontStyle: 'italic',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: typography.sizes.sm,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});
