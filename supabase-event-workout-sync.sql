-- Event Workout Sync Migration
-- This migration adds columns to track workouts that are synced from event training plans
-- Run this in your Supabase SQL Editor

-- 1. Add source tracking columns to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES squad_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_training_workout_id uuid REFERENCES event_training_workouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_event_name text;

-- 2. Create index for efficient lookup of event-synced workouts
CREATE INDEX IF NOT EXISTS idx_workouts_source_event 
ON workouts(source_event_id) 
WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_source_training 
ON workouts(source_training_workout_id) 
WHERE source_training_workout_id IS NOT NULL;

-- 3. Function to sync a single training workout to a user's schedule
CREATE OR REPLACE FUNCTION sync_training_workout_to_user(
    p_training_workout_id uuid,
    p_user_id uuid,
    p_event_id uuid,
    p_event_name text,
    p_event_date date
) RETURNS uuid AS $$
DECLARE
    v_training_workout event_training_workouts%ROWTYPE;
    v_workout_id uuid;
    v_scheduled_date date;
BEGIN
    -- Get the training workout
    SELECT * INTO v_training_workout 
    FROM event_training_workouts 
    WHERE id = p_training_workout_id;
    
    IF v_training_workout IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate scheduled date from days_before_event
    v_scheduled_date := p_event_date - v_training_workout.days_before_event;
    
    -- Check if workout already synced (avoid duplicates)
    SELECT id INTO v_workout_id 
    FROM workouts 
    WHERE user_id = p_user_id 
    AND source_training_workout_id = p_training_workout_id;
    
    IF v_workout_id IS NOT NULL THEN
        -- Already synced, just return existing ID
        RETURN v_workout_id;
    END IF;
    
    -- Create the workout in user's schedule
    INSERT INTO workouts (
        user_id,
        name,
        scheduled_date,
        color,
        is_completed,
        source_event_id,
        source_training_workout_id,
        source_event_name
    ) VALUES (
        p_user_id,
        v_training_workout.name,
        v_scheduled_date,
        v_training_workout.color,
        false,
        p_event_id,
        p_training_workout_id,
        p_event_name
    )
    RETURNING id INTO v_workout_id;
    
    RETURN v_workout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to sync all training workouts for an event to a user
CREATE OR REPLACE FUNCTION sync_event_workouts_to_user(
    p_event_id uuid,
    p_user_id uuid
) RETURNS integer AS $$
DECLARE
    v_event squad_events%ROWTYPE;
    v_training_workout event_training_workouts%ROWTYPE;
    v_count integer := 0;
BEGIN
    -- Get event details
    SELECT * INTO v_event FROM squad_events WHERE id = p_event_id;
    
    IF v_event IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Loop through all training workouts and sync them
    FOR v_training_workout IN 
        SELECT * FROM event_training_workouts 
        WHERE event_id = p_event_id
        ORDER BY days_before_event DESC
    LOOP
        PERFORM sync_training_workout_to_user(
            v_training_workout.id,
            p_user_id,
            p_event_id,
            v_event.name,
            v_event.event_date::date
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to remove all synced workouts when user leaves event
CREATE OR REPLACE FUNCTION remove_synced_workouts_for_user(
    p_event_id uuid,
    p_user_id uuid
) RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM workouts 
    WHERE user_id = p_user_id 
    AND source_event_id = p_event_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to sync a new training workout to ALL participants
CREATE OR REPLACE FUNCTION sync_new_training_workout_to_participants(
    p_training_workout_id uuid
) RETURNS integer AS $$
DECLARE
    v_training_workout event_training_workouts%ROWTYPE;
    v_event squad_events%ROWTYPE;
    v_participant RECORD;
    v_count integer := 0;
BEGIN
    -- Get training workout
    SELECT * INTO v_training_workout 
    FROM event_training_workouts 
    WHERE id = p_training_workout_id;
    
    IF v_training_workout IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get event
    SELECT * INTO v_event 
    FROM squad_events 
    WHERE id = v_training_workout.event_id;
    
    IF v_event IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Sync to all participants
    FOR v_participant IN 
        SELECT user_id FROM event_participants 
        WHERE event_id = v_training_workout.event_id
    LOOP
        PERFORM sync_training_workout_to_user(
            p_training_workout_id,
            v_participant.user_id,
            v_event.id,
            v_event.name,
            v_event.event_date::date
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION sync_training_workout_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION sync_event_workouts_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION remove_synced_workouts_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION sync_new_training_workout_to_participants TO authenticated;

-- 8. Trigger to auto-sync new training workouts to participants
CREATE OR REPLACE FUNCTION trigger_sync_training_workout()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync to all participants when a new training workout is added
    PERFORM sync_new_training_workout_to_participants(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_training_workout_insert ON event_training_workouts;
CREATE TRIGGER on_training_workout_insert
    AFTER INSERT ON event_training_workouts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_training_workout();

-- 9. Trigger to auto-sync when user joins event
CREATE OR REPLACE FUNCTION trigger_sync_on_join()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_event_workouts_to_user(NEW.event_id, NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_participant_join ON event_participants;
CREATE TRIGGER on_participant_join
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_on_join();

-- 10. Trigger to remove synced workouts when user leaves event
CREATE OR REPLACE FUNCTION trigger_remove_on_leave()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM remove_synced_workouts_for_user(OLD.event_id, OLD.user_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_participant_leave ON event_participants;
CREATE TRIGGER on_participant_leave
    BEFORE DELETE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_remove_on_leave();

-- Done! The sync is now automatic via triggers.
