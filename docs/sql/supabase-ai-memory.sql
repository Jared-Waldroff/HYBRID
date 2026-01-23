-- Add ai_preferences column to athlete_profiles
-- This stores unstructured learned facts about the user (e.g. "prefers morning workouts", "recovering from injury")
alter table public.athlete_profiles 
add column if not exists ai_preferences text;

-- No new RLS needed as athlete_profiles already has policies (Users can view/update own profile)

