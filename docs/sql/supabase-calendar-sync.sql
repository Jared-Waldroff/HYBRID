-- =============================================
-- Calendar Sync Preferences Migration
-- Adds columns to user_preferences for Google Calendar sync
-- Run this in Supabase SQL Editor
-- =============================================

-- Add calendar sync related columns to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS preferred_workout_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS preferred_workout_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS synced_workout_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS calendar_sync_calendar_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.preferred_workout_time IS 'User preferred workout start time for calendar sync';
COMMENT ON COLUMN user_preferences.preferred_workout_duration IS 'User preferred workout duration in minutes';
COMMENT ON COLUMN user_preferences.synced_workout_ids IS 'Array of workout IDs that have been synced to calendar';
COMMENT ON COLUMN user_preferences.calendar_sync_calendar_id IS 'Device calendar ID used for syncing workouts';

-- =============================================
-- Success! Calendar sync preferences are ready.
-- =============================================
