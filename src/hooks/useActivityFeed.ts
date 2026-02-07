import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getCached, setCache, CacheKeys, CacheTTL } from '../lib/cacheManager';

// Types
export interface FeedPost {
    id: string;
    user_id: string;
    event_id: string | null;

    completion_id: string | null;
    workout_id: string | null;
    caption: string | null;
    photo_urls: string[];
    lfg_count: number;
    comment_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    user?: {
        display_name: string;
        avatar_url: string;
        badges?: string[];
    };
    event?: {
        name: string;
        event_type: string;
    };
    completion?: {
        actual_value: number | null;
        actual_unit: string | null;
        actual_zone: string | null;
        duration_seconds: number | null;
        feeling: string | null;
        training_workout?: {
            name: string;
            workout_type: string;
            target_value: number | null;
            target_unit: string | null;
            description: string | null;
            color: string | null;
            target_zone: string | null;
        };
    };
    // Linked Workout (Regular)
    workout?: {
        id: string;
        name: string;
        color: string;
        is_completed?: boolean;
        workout_exercises?: Array<{
            id: string;
            order_index: number;
            exercise?: {
                name: string;
            };
            sets?: Array<{
                id: string;
                weight: number;
                reps: number;
                is_completed: boolean;
            }>;
        }>;
    };
    has_lfg?: boolean; // Whether current user has LFG'd this post
    preview_comments?: Array<{
        id: string;
        user_id: string;
        content: string;
        created_at: string;
        user?: {
            display_name: string;
            avatar_url: string;
            badges?: string[];
        };
    }>;
}

export interface FeedComment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    // Joined data
    user?: {
        display_name: string;
        avatar_url: string;
    };
}

export interface CreatePostInput {
    event_id?: string | null;
    completion_id?: string;
    workout_id?: string | null;
    caption?: string;
    photo_urls?: string[];
}

// Cache for user profiles to avoid repeated queries
const profileCache = new Map<string, { display_name: string; avatar_url: string; badges?: string[]; cachedAt: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useActivityFeed(eventId?: string) { // Accepts optional eventId for scoping
    const { user } = useAuth();
    const [feed, setFeed] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Store allowed IDs for realtime filtering
    const allowedIdsRef = useRef<string[]>([]);

    // Load from cache on mount (instant display) - only for global feed, not event-specific
    useEffect(() => {
        const loadCached = async () => {
            if (!user || eventId) return; // Don't cache event-specific feeds
            const cached = await getCached<FeedPost[]>(CacheKeys.feed(user.id), CacheTTL.feed);
            if (cached && cached.length > 0) {
                setFeed(cached);
                setLoading(false);
            }
        };
        loadCached();
    }, [user, eventId]);

    // Helper to get cached profiles or fetch missing ones
    const getProfiles = useCallback(async (userIds: string[]) => {
        const now = Date.now();
        const cached: Map<string, { display_name: string; avatar_url: string; badges?: string[] }> = new Map();
        const missing: string[] = [];

        for (const id of userIds) {
            const cachedProfile = profileCache.get(id);
            if (cachedProfile && (now - cachedProfile.cachedAt) < PROFILE_CACHE_TTL) {
                cached.set(id, { display_name: cachedProfile.display_name, avatar_url: cachedProfile.avatar_url, badges: cachedProfile.badges });
            } else {
                missing.push(id);
            }
        }

        if (missing.length > 0) {
            const { data: profiles } = await supabase
                .from('athlete_profiles')
                .select('user_id, display_name, avatar_url, badges')
                .in('user_id', missing);

            for (const p of (profiles || [])) {
                profileCache.set(p.user_id, { ...p, cachedAt: now });
                cached.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url, badges: p.badges });
            }
        }

        return cached;
    }, []);

    // Load activity feed - OPTIMIZED: Reduced nested queries, parallel requests
    const loadFeed = useCallback(async (eventId?: string, limit: number = 50) => {
        if (!user) return;

        // Only show loading if we have no cached data
        if (feed.length === 0) {
            setLoading(true);
        }
        setError(null);

        try {

            // OPTIMIZATION 1: Fetch squad IDs first (needed for filtering)
            let allowedIds: string[] = [user.id];
            if (!eventId) {
                const { data: squadIds } = await supabase.rpc('get_squad_ids', { p_user_id: user.id });
                allowedIds = [user.id, ...(squadIds?.map((c: any) => c.member_id) || [])];
            }
            allowedIdsRef.current = allowedIds;

            // OPTIMIZATION 2: Simplified initial query - don't fetch deep nested workout data
            // Fetch workout details lazily when user taps on a post
            let query = supabase
                .from('activity_feed')
                .select(`
                    id,
                    user_id,
                    event_id,
                    completion_id,
                    workout_id,
                    caption,
                    photo_urls,
                    lfg_count,
                    comment_count,
                    created_at,
                    updated_at,
                    event:squad_events(name, event_type),
                    completion:event_workout_completions(
                        actual_value,
                        actual_unit,
                        actual_zone,
                        duration_seconds,
                        feeling,
                        training_workout:event_training_workouts(
                            name,
                            workout_type,
                            target_value,
                            target_unit,
                            description,
                            color,
                            target_zone
                        )
                    ),
                    workout:workouts(
                        id,
                        name,
                        color,
                        is_completed,
                        workout_exercises(
                            id,
                            order_index,
                            exercise:exercises(name),
                            sets(id, weight, reps, is_completed)
                        )
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (eventId) {
                query = query.eq('event_id', eventId);
            } else {
                query = query.in('user_id', allowedIds);
            }

            // OPTIMIZATION 3: Run queries in parallel
            const [feedResult, reactionsResult] = await Promise.all([
                query,
                // Only fetch user's reactions, not all users
                supabase
                    .from('feed_reactions')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .eq('reaction_type', 'lfg')
            ]);

            if (feedResult.error) throw feedResult.error;

            const data = feedResult.data || [];
            const lfgPostIds = new Set(reactionsResult.data?.map(r => r.post_id) || []);

            // OPTIMIZATION 4: Use cached profiles
            const userIds = [...new Set(data.map(p => p.user_id))];
            const profileMap = await getProfiles(userIds);

            const postsWithData = data.map((post: any) => {
                // Normalize event (Supabase returns array for 1:1 join sometimes)
                const event = Array.isArray(post.event) ? post.event[0] : post.event;

                // Normalize workout and exercises
                let workout = Array.isArray(post.workout) ? post.workout[0] : post.workout;
                if (workout && workout.workout_exercises) {
                    workout = {
                        ...workout,
                        workout_exercises: workout.workout_exercises.map((we: any) => ({
                            ...we,
                            exercise: Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
                        }))
                    };
                }

                return {
                    ...post,
                    event,
                    workout,
                    user: profileMap.get(post.user_id),
                    has_lfg: lfgPostIds.has(post.id),
                    preview_comments: [] // Placeholder, populated below
                };
            });

            // OPTIMIZATION 6: Fetch preview comments for visible posts
            // We fetch latest 2 comments for the retrieved posts
            const postIds = postsWithData.map(p => p.id);
            if (postIds.length > 0) {
                const { data: comments, error: commentsError } = await supabase
                    .from('feed_comments')
                    .select('id, post_id, user_id, content, created_at')
                    .in('post_id', postIds)
                    .order('created_at', { ascending: false });

                if (!commentsError && comments) {
                    // Group by post_id and take top 2
                    const commentMap = new Map<string, any[]>();

                    // Also need profiles for commenters
                    const commenterIds = new Set(comments.map(c => c.user_id));
                    const commenterProfileMap = await getProfiles([...commenterIds]);

                    comments.forEach(c => {
                        const existing = commentMap.get(c.post_id) || [];
                        if (existing.length < 2) {
                            existing.push({
                                ...c,
                                user: commenterProfileMap.get(c.user_id)
                            });
                            // Store in reverse chronological for processing, but display chronological
                            commentMap.set(c.post_id, existing);
                        }
                    });

                    // Assign to posts
                    postsWithData.forEach(p => {
                        if (commentMap.has(p.id)) {
                            // Reverse to show oldest first (like conversation) or newest? Instagram usually shows newest or "View all". 
                            // Actually inline comments usually show somewhat recent. 
                            // Let's sort chronological for reading flow.
                            p.preview_comments = commentMap.get(p.id)?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        }
                    });
                }
            }

            setFeed(postsWithData);

            // Cache the results (only cache global feed, not event-specific)
            if (!eventId && postsWithData.length > 0) {
                await setCache(CacheKeys.feed(user.id), postsWithData);
            }
        } catch (err: any) {
            console.error('Error loading feed:', err);
            setError(err.message);
            // Don't clear feed on error - keep showing cached data
        } finally {
            setLoading(false);
        }
    }, [user, getProfiles, feed.length]);

    // Listen for comment updates
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('commentAdded', () => {
            loadFeed(eventId);
        });
        return () => subscription.remove();
    }, [loadFeed, eventId]);

    // OPTIMIZATION 5: Lazy load workout details when needed
    const loadWorkoutDetails = useCallback(async (workoutId: string) => {
        const { data, error } = await supabase
            .from('workouts')
            .select(`
                id,
                name,
                color,
                is_completed,
                workout_exercises(
                    id,
                    order_index,
                    exercise:exercises(name),
                    sets(id, weight, reps, is_completed)
                )
            `)
            .eq('id', workoutId)
            .single();

        if (error) {
            console.error('Error loading workout details:', error);
            return null;
        }

        // Sort exercises by order_index
        if (data?.workout_exercises) {
            data.workout_exercises.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
        }

        // Update the feed item with full workout data
        setFeed(prev => prev.map(p =>
            p.workout_id === workoutId
                ? { ...p, workout: data }
                : p
        ));

        return data;
    }, []);

    // Create a new post
    const createPost = useCallback(async (
        input: CreatePostInput
    ): Promise<{ post: FeedPost | null; error: string | null }> => {
        if (!user) return { post: null, error: 'Not authenticated' };

        try {
            const { data, error: insertError } = await supabase
                .from('activity_feed')
                .insert({
                    user_id: user.id,
                    event_id: input.event_id || null,
                    completion_id: input.completion_id || null,
                    workout_id: input.workout_id || null,
                    caption: input.caption || null,
                    photo_urls: input.photo_urls || [],
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Refresh feed
            await loadFeed(input.event_id || undefined);

            return { post: data, error: null };
        } catch (err: any) {
            console.error('Error creating post:', err);
            return { post: null, error: err.message };
        }
    }, [user, loadFeed]);

    // Delete a post
    const deletePost = useCallback(async (postId: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const { error: deleteError } = await supabase
                .from('activity_feed')
                .delete()
                .eq('id', postId)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            setFeed(prev => prev.filter(p => p.id !== postId));
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting post:', err);
            return { error: err.message };
        }
    }, [user]);

    // Toggle LFG reaction
    const toggleLfg = useCallback(async (postId: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const post = feed.find(p => p.id === postId);

            if (post?.has_lfg) {
                // Remove LFG
                const { error: deleteError } = await supabase
                    .from('feed_reactions')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', user.id)
                    .eq('reaction_type', 'lfg');

                if (deleteError) throw deleteError;

                setFeed(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, has_lfg: false, lfg_count: Math.max(0, p.lfg_count - 1) }
                        : p
                ));
            } else {
                // Add LFG
                const { error: insertError } = await supabase
                    .from('feed_reactions')
                    .insert({
                        post_id: postId,
                        user_id: user.id,
                        reaction_type: 'lfg',
                    });

                if (insertError) throw insertError;

                setFeed(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, has_lfg: true, lfg_count: p.lfg_count + 1 }
                        : p
                ));
            }

            return { error: null };
        } catch (err: any) {
            console.error('Error toggling LFG:', err);
            return { error: err.message };
        }
    }, [user, feed]);

    // Get comments for a post
    const getComments = useCallback(async (postId: string): Promise<FeedComment[]> => {
        try {
            const { data, error: fetchError } = await supabase
                .from('feed_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Get user profiles (use cache)
            const userIds = (data || []).map(c => c.user_id);
            const profileMap = await getProfiles(userIds);

            return (data || []).map(comment => ({
                ...comment,
                user: profileMap.get(comment.user_id),
            }));
        } catch (err: any) {
            console.error('Error getting comments:', err);
            return [];
        }
    }, [getProfiles]);

    // Add a comment
    const addComment = useCallback(async (
        postId: string,
        content: string
    ): Promise<{ comment: FeedComment | null; error: string | null }> => {
        if (!user) return { comment: null, error: 'Not authenticated' };

        try {
            const { data, error: insertError } = await supabase
                .from('feed_comments')
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    content,
                })
                .select('*')
                .single();

            if (insertError) throw insertError;

            // Get user profile from cache
            const profileMap = await getProfiles([user.id]);
            const commentWithUser = { ...data, user: profileMap.get(user.id) };

            // Update comment count in local state
            setFeed(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, comment_count: p.comment_count + 1 }
                    : p
            ));

            return { comment: commentWithUser, error: null };
        } catch (err: any) {
            console.error('Error adding comment:', err);
            return { comment: null, error: err.message };
        }
    }, [user, getProfiles]);

    // Delete a comment
    const deleteComment = useCallback(async (
        commentId: string,
        postId: string
    ): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const { error: deleteError } = await supabase
                .from('feed_comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // Update comment count in local state
            setFeed(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                    : p
            ));

            return { error: null };
        } catch (err: any) {
            console.error('Error deleting comment:', err);
            return { error: err.message };
        }
    }, [user]);

    // Get users who LFG'd a post
    const getLfgUsers = useCallback(async (postId: string): Promise<{ display_name: string; avatar_url: string }[]> => {
        try {
            const { data, error: fetchError } = await supabase
                .from('feed_reactions')
                .select('user_id')
                .eq('post_id', postId)
                .eq('reaction_type', 'lfg');

            if (fetchError) throw fetchError;

            // Get user profiles (use cache)
            const userIds = (data || []).map(r => r.user_id);
            const profileMap = await getProfiles(userIds);

            return Array.from(profileMap.values());
        } catch (err: any) {
            console.error('Error getting LFG users:', err);
            return [];
        }
    }, [getProfiles]);

    // OPTIMIZATION 6: Realtime subscription with user filter
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel('activity_feed_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_feed',
                    // Only subscribe to posts from allowed users (reduces realtime load)
                    filter: allowedIdsRef.current.length > 0
                        ? `user_id=in.(${allowedIdsRef.current.join(',')})`
                        : undefined,
                },
                (payload) => {
                    // Refresh feed when new post is added
                    loadFeed();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, loadFeed]);

    return {
        feed,
        loading,
        error,
        loadFeed,
        loadWorkoutDetails, // NEW: Lazy load workout details
        createPost,
        deletePost,
        toggleLfg,
        getComments,
        addComment,
        deleteComment,
        getLfgUsers,
    };
}

// Upload photos to Supabase Storage
export async function uploadFeedPhotos(
    userId: string,
    photos: { uri: string; type?: string }[]
): Promise<{ urls: string[]; error: string | null }> {
    try {
        const urls: string[] = [];

        for (const photo of photos) {
            const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

            const formData = new FormData();
            formData.append('files', {
                uri: photo.uri,
                name: fileName,
                type: photo.type || 'image/jpeg',
            } as any);

            const { data, error: uploadError } = await supabase.storage
                .from('activity-photos')
                .upload(fileName, formData, {
                    contentType: photo.type || 'image/jpeg',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('activity-photos')
                .getPublicUrl(fileName);

            urls.push(publicUrl);
        }

        return { urls, error: null };
    } catch (err: any) {
        console.error('Error uploading photos:', err);
        return { urls: [], error: err.message };
    }
}

// Format duration for display
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}
