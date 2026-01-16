import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/ScreenLayout';
import { supabase } from '../lib/supabaseClient';
import { Feather } from '@expo/vector-icons';
import { spacing, radii, typography } from '../theme';

export default function AdminScreen() {
    const { themeColors, colors } = useTheme();
    const navigation = useNavigation();
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedback = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching feedback:', error);
        }
        if (data) {
            setFeedback(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: themeColors.glassBg, borderColor: themeColors.glassBorder }]}>
            <Text style={[styles.content, { color: themeColors.textPrimary }]}>{item.content}</Text>
            <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                    <Feather name="calendar" size={12} color={themeColors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                </View>
                <Text style={[styles.meta, { color: themeColors.textMuted }]}>
                    {item.device_info || 'Unknown Device'}
                </Text>
            </View>
            <Text style={[styles.idText, { color: themeColors.textMuted }]}>
                ID: {item.user_id ? 'Authenticated' : 'Anonymous'}
            </Text>
        </View>
    );

    return (
        <ScreenLayout hideHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
                <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
                    <Feather name="arrow-left" size={24} color={themeColors.textPrimary} />
                </Pressable>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.textPrimary }}>Admin Feedback</Text>
            </View>
            <FlatList
                contentContainerStyle={{ padding: spacing.md }}
                data={feedback}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchFeedback} tintColor={colors.accent_color} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 40 }}>
                            No feedback received yet.
                        </Text>
                    ) : null
                }
            />
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    content: {
        fontSize: typography.sizes.base,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    metaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    meta: {
        fontSize: typography.sizes.xs,
    },
    idText: {
        fontSize: 10,
        marginTop: 4,
        opacity: 0.5,
    }
});
