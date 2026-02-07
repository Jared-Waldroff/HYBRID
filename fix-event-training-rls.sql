-- =============================================
-- FIX: event_training_workouts INSERT RLS Policy
-- 
-- Problem: Event creators cannot add training workouts to their events
-- Solution: Add INSERT policy that checks if user is event creator
-- 
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Event creators can add training workouts" ON event_training_workouts;
DROP POLICY IF EXISTS "insert_event_training_workouts" ON event_training_workouts;

-- Create new INSERT policy that allows event creators to add workouts
CREATE POLICY "Event creators can add training workouts" ON event_training_workouts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM squad_events
            WHERE squad_events.id = event_training_workouts.event_id
            AND squad_events.creator_id = auth.uid()
        )
    );

-- Also ensure UPDATE and DELETE policies exist for creators
DROP POLICY IF EXISTS "Event creators can update training workouts" ON event_training_workouts;
CREATE POLICY "Event creators can update training workouts" ON event_training_workouts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM squad_events
            WHERE squad_events.id = event_training_workouts.event_id
            AND squad_events.creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Event creators can delete training workouts" ON event_training_workouts;
CREATE POLICY "Event creators can delete training workouts" ON event_training_workouts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM squad_events
            WHERE squad_events.id = event_training_workouts.event_id
            AND squad_events.creator_id = auth.uid()
        )
    );

-- Verify RLS is enabled
ALTER TABLE event_training_workouts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Done! Event creators can now add/edit/delete training workouts
-- =============================================
