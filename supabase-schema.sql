-- =============================================
-- Workout Tracker Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Exercises table (master list of all exercises)
-- is_default = true means it's a standard exercise visible to all
-- user_id = null for standard exercises, otherwise only visible to that user
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table (scheduled workout sessions)
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout exercises (exercises in a workout)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0
);

-- Sets table (individual sets within a workout exercise)
CREATE TABLE IF NOT EXISTS sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
  weight DECIMAL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences (theme, colors, customization)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#c9a227',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Exercises: Users can see default exercises + their own
CREATE POLICY "Users can view default exercises and their own" ON exercises
  FOR SELECT USING (is_default = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own exercises" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exercises" ON exercises
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exercises" ON exercises
  FOR DELETE USING (user_id = auth.uid());

-- Workouts: Users can only see their own
CREATE POLICY "Users can view their own workouts" ON workouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workouts" ON workouts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workouts" ON workouts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workouts" ON workouts
  FOR DELETE USING (user_id = auth.uid());

-- Workout exercises: Through workout ownership
CREATE POLICY "Users can view workout exercises" ON workout_exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "Users can insert workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "Users can update workout exercises" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "Users can delete workout exercises" ON workout_exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

-- Sets: Through workout ownership
CREATE POLICY "Users can view sets" ON sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sets" ON sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sets" ON sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sets" ON sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

-- User preferences: Users can only manage their own
CREATE POLICY "Users can view their preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their preferences" ON user_preferences
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- SEED STANDARD EXERCISES
-- =============================================

INSERT INTO exercises (name, muscle_group, is_default, user_id) VALUES
  -- Chest
  ('Bench Press', 'Chest', true, null),
  ('Incline Bench Press', 'Chest', true, null),
  ('Decline Bench Press', 'Chest', true, null),
  ('Dumbbell Fly', 'Chest', true, null),
  ('Dumbbell Press', 'Chest', true, null),
  ('Push-ups', 'Chest', true, null),
  ('Cable Crossover', 'Chest', true, null),
  ('Chest Dips', 'Chest', true, null),
  
  -- Back
  ('Deadlift', 'Back', true, null),
  ('Pull-ups', 'Back', true, null),
  ('Chin-ups', 'Back', true, null),
  ('Lat Pulldown', 'Back', true, null),
  ('Barbell Row', 'Back', true, null),
  ('Dumbbell Row', 'Back', true, null),
  ('Seated Cable Row', 'Back', true, null),
  ('T-Bar Row', 'Back', true, null),
  ('Face Pulls', 'Back', true, null),
  ('Hyperextensions', 'Back', true, null),
  
  -- Shoulders
  ('Overhead Press', 'Shoulders', true, null),
  ('Military Press', 'Shoulders', true, null),
  ('Dumbbell Shoulder Press', 'Shoulders', true, null),
  ('Lateral Raises', 'Shoulders', true, null),
  ('Front Raises', 'Shoulders', true, null),
  ('Rear Delt Fly', 'Shoulders', true, null),
  ('Arnold Press', 'Shoulders', true, null),
  ('Upright Row', 'Shoulders', true, null),
  ('Shrugs', 'Shoulders', true, null),
  
  -- Arms
  ('Bicep Curl', 'Arms', true, null),
  ('Hammer Curl', 'Arms', true, null),
  ('Preacher Curl', 'Arms', true, null),
  ('Concentration Curl', 'Arms', true, null),
  ('Tricep Pushdown', 'Arms', true, null),
  ('Tricep Dips', 'Arms', true, null),
  ('Skull Crushers', 'Arms', true, null),
  ('Overhead Tricep Extension', 'Arms', true, null),
  ('Close Grip Bench Press', 'Arms', true, null),
  ('Cable Curl', 'Arms', true, null),
  
  -- Legs
  ('Squat', 'Legs', true, null),
  ('Front Squat', 'Legs', true, null),
  ('Leg Press', 'Legs', true, null),
  ('Lunges', 'Legs', true, null),
  ('Bulgarian Split Squat', 'Legs', true, null),
  ('Leg Curl', 'Legs', true, null),
  ('Leg Extension', 'Legs', true, null),
  ('Calf Raises', 'Legs', true, null),
  ('Seated Calf Raises', 'Legs', true, null),
  ('Romanian Deadlift', 'Legs', true, null),
  ('Hip Thrust', 'Legs', true, null),
  ('Goblet Squat', 'Legs', true, null),
  ('Hack Squat', 'Legs', true, null),
  
  -- Core
  ('Plank', 'Core', true, null),
  ('Crunches', 'Core', true, null),
  ('Russian Twists', 'Core', true, null),
  ('Leg Raises', 'Core', true, null),
  ('Hanging Leg Raises', 'Core', true, null),
  ('Ab Wheel Rollout', 'Core', true, null),
  ('Cable Woodchop', 'Core', true, null),
  ('Dead Bug', 'Core', true, null),
  ('Mountain Climbers', 'Core', true, null),
  ('Bicycle Crunches', 'Core', true, null),
  
  -- Cardio
  ('Running', 'Cardio', true, null),
  ('Cycling', 'Cardio', true, null),
  ('Rowing Machine', 'Cardio', true, null),
  ('Jump Rope', 'Cardio', true, null),
  ('Burpees', 'Cardio', true, null),
  ('Box Jumps', 'Cardio', true, null),
  ('Stair Climber', 'Cardio', true, null),
  ('Elliptical', 'Cardio', true, null),
  ('Swimming', 'Cardio', true, null),
  ('Treadmill Walk', 'Cardio', true, null)
ON CONFLICT DO NOTHING;
