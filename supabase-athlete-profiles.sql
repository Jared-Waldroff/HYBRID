-- =============================================
-- AI Coach: Athlete Profiles Table
-- Run this in your Supabase SQL Editor
-- =============================================

-- Athlete profiles table for storing lifestyle and training context
CREATE TABLE IF NOT EXISTS athlete_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Training background
  fitness_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
  primary_goal TEXT, -- e.g., 'hybrid performance', 'hyrox prep', 'general fitness'
  secondary_goals TEXT[], -- array of additional goals
  injuries_limitations TEXT, -- any injuries or physical limitations
  equipment_access TEXT DEFAULT 'full_gym', -- home, minimal, full_gym
  
  -- Lifestyle factors
  sleep_hours_avg DECIMAL DEFAULT 7,
  sleep_quality TEXT DEFAULT 'good', -- poor, fair, good, excellent
  nutrition_approach TEXT, -- e.g., 'balanced', 'high protein', 'calorie deficit'
  daily_calories_target INTEGER,
  protein_target_grams INTEGER,
  
  -- Work and stress
  work_physical_demand TEXT DEFAULT 'sedentary', -- sedentary, light, moderate, heavy
  work_hours_per_day INTEGER DEFAULT 8,
  stress_level TEXT DEFAULT 'moderate', -- low, moderate, high, very_high
  
  -- Training preferences
  preferred_training_days TEXT[], -- e.g., ['Monday', 'Wednesday', 'Friday']
  session_duration_minutes INTEGER DEFAULT 60,
  training_experience_years INTEGER,
  
  -- Training modalities experience (1-5 scale)
  strength_experience INTEGER DEFAULT 3,
  running_experience INTEGER DEFAULT 3,
  cycling_experience INTEGER DEFAULT 2,
  swimming_experience INTEGER DEFAULT 1,
  hyrox_experience INTEGER DEFAULT 1,
  crossfit_experience INTEGER DEFAULT 2,
  kettlebell_experience INTEGER DEFAULT 2,
  mobility_experience INTEGER DEFAULT 2,
  
  -- Coach conversation context
  last_coach_summary TEXT, -- AI's summary of recent conversations
  coach_notes TEXT, -- Important notes from coaching sessions
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_user_id ON athlete_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own profile
CREATE POLICY "Users can view their own athlete profile" ON athlete_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own athlete profile" ON athlete_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own athlete profile" ON athlete_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own athlete profile" ON athlete_profiles
  FOR DELETE USING (user_id = auth.uid());

-- Function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_athlete_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on changes
DROP TRIGGER IF EXISTS athlete_profiles_updated_at ON athlete_profiles;
CREATE TRIGGER athlete_profiles_updated_at
  BEFORE UPDATE ON athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_profile_timestamp();

-- =============================================
-- Success! The athlete_profiles table is ready.
-- =============================================
