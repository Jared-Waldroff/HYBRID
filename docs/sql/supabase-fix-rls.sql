-- DEFINITIVE FIX for infinite recursion in RLS policies
-- The trick: use SECURITY DEFINER functions to bypass RLS when checking access
-- Run this in Supabase SQL Editor

-- First, create helper functions that bypass RLS (SECURITY DEFINER)
-- These functions check access without triggering other RLS policies

CREATE OR REPLACE FUNCTION user_participates_in_event(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM event_participants 
        WHERE event_id = p_event_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_event(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_private BOOLEAN;
    v_creator_id UUID;
BEGIN
    SELECT is_private, creator_id INTO v_is_private, v_creator_id
    FROM squad_events WHERE id = p_event_id;
    
    -- Public event = everyone can access
    IF v_is_private = false THEN
        RETURN true;
    END IF;
    
    -- Creator can always access
    IF v_creator_id = p_user_id THEN
        RETURN true;
    END IF;
    
    -- Participants can access
    RETURN EXISTS (
        SELECT 1 FROM event_participants 
        WHERE event_id = p_event_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL existing policies on these tables to start fresh
DROP POLICY IF EXISTS "Anyone can view public events" ON squad_events;
DROP POLICY IF EXISTS "Participants can view private events" ON squad_events;
DROP POLICY IF EXISTS "Users can create events" ON squad_events;
DROP POLICY IF EXISTS "Creators can update their events" ON squad_events;
DROP POLICY IF EXISTS "Creators can delete their events" ON squad_events;

DROP POLICY IF EXISTS "View participants of accessible events" ON event_participants;
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON event_participants;
DROP POLICY IF EXISTS "Users can leave events" ON event_participants;

DROP POLICY IF EXISTS "View training workouts of accessible events" ON event_training_workouts;
DROP POLICY IF EXISTS "Creators can manage training workouts" ON event_training_workouts;

DROP POLICY IF EXISTS "View completions of accessible events" ON event_workout_completions;
DROP POLICY IF EXISTS "Users can complete their own workouts" ON event_workout_completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON event_workout_completions;
DROP POLICY IF EXISTS "Users can delete their own completions" ON event_workout_completions;

DROP POLICY IF EXISTS "View feed of accessible events" ON activity_feed;
DROP POLICY IF EXISTS "Users can create their own posts" ON activity_feed;
DROP POLICY IF EXISTS "Users can update their own posts" ON activity_feed;
DROP POLICY IF EXISTS "Users can delete their own posts" ON activity_feed;

-- SQUAD EVENTS policies
CREATE POLICY "select_squad_events" ON squad_events
    FOR SELECT USING (
        is_private = false 
        OR creator_id = auth.uid() 
        OR user_participates_in_event(id, auth.uid())
    );

CREATE POLICY "insert_squad_events" ON squad_events
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "update_squad_events" ON squad_events
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "delete_squad_events" ON squad_events
    FOR DELETE USING (creator_id = auth.uid());

-- EVENT PARTICIPANTS policies (uses SECURITY DEFINER function)
CREATE POLICY "select_event_participants" ON event_participants
    FOR SELECT USING (
        can_access_event(event_id, auth.uid())
    );

CREATE POLICY "insert_event_participants" ON event_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_event_participants" ON event_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_event_participants" ON event_participants
    FOR DELETE USING (user_id = auth.uid());

-- TRAINING WORKOUTS policies
CREATE POLICY "select_training_workouts" ON event_training_workouts
    FOR SELECT USING (
        can_access_event(event_id, auth.uid())
    );

CREATE POLICY "manage_training_workouts" ON event_training_workouts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM squad_events WHERE id = event_training_workouts.event_id AND creator_id = auth.uid())
    );

-- WORKOUT COMPLETIONS policies
CREATE POLICY "select_completions" ON event_workout_completions
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM event_training_workouts tw 
            WHERE tw.id = event_workout_completions.training_workout_id 
            AND can_access_event(tw.event_id, auth.uid())
        )
    );

CREATE POLICY "insert_completions" ON event_workout_completions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_completions" ON event_workout_completions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_completions" ON event_workout_completions
    FOR DELETE USING (user_id = auth.uid());

-- ACTIVITY FEED policies
CREATE POLICY "select_activity_feed" ON activity_feed
    FOR SELECT USING (
        can_access_event(event_id, auth.uid())
    );

CREATE POLICY "insert_activity_feed" ON activity_feed
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_activity_feed" ON activity_feed
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_activity_feed" ON activity_feed
    FOR DELETE USING (user_id = auth.uid());

-- Done! The SECURITY DEFINER functions bypass RLS checks, breaking the recursion.
