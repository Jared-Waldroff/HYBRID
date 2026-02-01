import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FeedPost } from './useActivityFeed';

export function useUserPosts(userId: string | undefined, pageSize = 3) {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const loadPosts = useCallback(async (reset = false) => {
        if (!userId) return;
        if (loading) return;

        setLoading(true);
        const currentPage = reset ? 0 : page;

        try {
            // Updated to use 'activity_feed' instead of 'feed_posts' (which doesn't exist or isn't exposed)
            // Removed 'user' join as we know the user (and gallery doesn't show avatar per post)
            // Updated columns to match 'activity_feed' schema (caption vs content)
            const { data, error } = await supabase
                .from('activity_feed')
                .select(`
                    id,
                    user_id,
                    event_id,
                    workout_id,
                    caption, 
                    photo_urls,
                    created_at,
                    updated_at,
                    event:squad_events(name, event_type),
                    workout:workouts(
                        id,
                        name,
                        color,
                        is_completed
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

            if (error) throw error;

            const newPosts = data || [];
            if (newPosts.length < pageSize) {
                setHasMore(false);
            }

            const postsWithStructure = newPosts.map((post: any) => {
                // Normalize event (Supabase returns array for 1:1 join sometimes)
                const event = Array.isArray(post.event) ? post.event[0] : post.event;

                // Normalize workout
                let workout = Array.isArray(post.workout) ? post.workout[0] : post.workout;

                return {
                    ...post,
                    event,
                    workout,
                    comment_count: 0,
                    lfg_count: 0,
                    preview_comments: []
                };
            });

            if (reset) {
                setPosts(postsWithStructure);
                setPage(1);
            } else {
                setPosts(prev => [...prev, ...postsWithStructure]);
                setPage(p => p + 1);
            }
        } catch (err) {
            console.error('Error fetching user posts:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, page, loading, pageSize]);

    return { posts, loading, hasMore, loadPosts };
}
