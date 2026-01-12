-- =============================================
-- FIX: Allow viewing workout details for posts in activity feed
-- Problem: RLS policies on workouts, workout_exercises, and sets 
-- only allow viewing your own data, blocking Squad feed workout display
-- 
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. HELPER FUNCTION: Check if a workout is linked to an accessible activity feed post
-- This checks if the workout appears in a post that the current user can see
CREATE OR REPLACE FUNCTION workout_is_in_accessible_feed(p_workout_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM activity_feed af
        WHERE af.workout_id = p_workout_id
        AND (
            -- User is the post owner
            af.user_id = p_user_id
            -- OR user is in the poster's squad
            OR EXISTS (
                SELECT 1 FROM squad_members sm
                WHERE sm.status = 'accepted'
                AND (
                    (sm.requester_id = p_user_id AND sm.receiver_id = af.user_id)
                    OR (sm.receiver_id = p_user_id AND sm.requester_id = af.user_id)
                )
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. UPDATE WORKOUTS RLS POLICY
-- Add policy to allow viewing workouts linked to accessible feed posts

-- First drop the existing select policy (will be recreated with combined logic)
DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;
DROP POLICY IF EXISTS "View workouts in accessible feed" ON workouts;

-- Recreate with combined logic: own workouts OR in accessible feed
CREATE POLICY "Users can view workouts" ON workouts
    FOR SELECT USING (
        user_id = auth.uid()
        OR workout_is_in_accessible_feed(id, auth.uid())
    );

-- 3. UPDATE WORKOUT_EXERCISES RLS POLICY
-- Add policy to allow viewing exercises for workouts in accessible feed posts

DROP POLICY IF EXISTS "Users can view workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "View exercises in accessible feed" ON workout_exercises;

CREATE POLICY "Users can view workout exercises" ON workout_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workouts 
            WHERE workouts.id = workout_exercises.workout_id 
            AND (
                workouts.user_id = auth.uid()
                OR workout_is_in_accessible_feed(workouts.id, auth.uid())
            )
        )
    );

-- 4. UPDATE SETS RLS POLICY
-- Add policy to allow viewing sets for workouts in accessible feed posts

DROP POLICY IF EXISTS "Users can view sets" ON sets;
DROP POLICY IF EXISTS "View sets in accessible feed" ON sets;

CREATE POLICY "Users can view sets" ON sets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.id = sets.workout_exercise_id 
            AND (
                w.user_id = auth.uid()
                OR workout_is_in_accessible_feed(w.id, auth.uid())
            )
        )
    );

-- 5. UPDATE EXERCISES RLS POLICY
-- Exercises table also needs to be viewable if part of a workout in the feed
-- (This one might already work since is_default exercises are visible to all)

DROP POLICY IF EXISTS "Users can view default exercises and their own" ON exercises;
DROP POLICY IF EXISTS "View exercises in accessible feed workouts" ON exercises;

CREATE POLICY "Users can view exercises" ON exercises
    FOR SELECT USING (
        is_default = true 
        OR user_id = auth.uid()
        -- Also allow viewing exercises used in accessible feed workouts
        OR EXISTS (
            SELECT 1 FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            WHERE we.exercise_id = exercises.id
            AND workout_is_in_accessible_feed(w.id, auth.uid())
        )
    );

-- =============================================
-- Success! Workout details in feed posts are now viewable
-- =============================================
