-- Migration to add notification support columns to athlete_profiles
-- Run this in Supabase SQL Editor after running supabase-squad-events.sql

-- Add push_token column for storing Expo push notification tokens
ALTER TABLE public.athlete_profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add notification_preferences column for user notification settings
ALTER TABLE public.athlete_profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "workoutReminders": true,
    "checkInReminders": true,
    "squadActivity": true,
    "reminderTime": "08:00"
}'::jsonb;

-- Create index for push_token lookups
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_push_token 
ON public.athlete_profiles(push_token) 
WHERE push_token IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.athlete_profiles.push_token IS 'Expo push notification token for this device';
COMMENT ON COLUMN public.athlete_profiles.notification_preferences IS 'User notification preferences (workout reminders, check-ins, squad activity)';
