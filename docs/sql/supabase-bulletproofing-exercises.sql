-- =============================================
-- Bulletproofing & Longevity Exercises
-- Add these to your Supabase database
-- Run this AFTER running supabase-schema.sql
-- =============================================

INSERT INTO exercises (name, muscle_group, is_default, user_id) VALUES
  -- ATG / Knees Over Toes (Ben Patrick) - Knee Health
  ('Tibialis Raises', 'Legs', true, null),
  ('Reverse Nordics', 'Legs', true, null),
  ('ATG Split Squat', 'Legs', true, null),
  ('Poliquin Step-up', 'Legs', true, null),
  ('Patrick Step', 'Legs', true, null),
  ('Nordic Curl', 'Legs', true, null),
  ('Sissy Squat', 'Legs', true, null),
  
  -- ATG - Hip & Back Health
  ('ATG Hip Flexor Stretch', 'Mobility', true, null),
  ('Elephant Walk', 'Mobility', true, null),
  ('Jefferson Curl', 'Back', true, null),
  ('Hip 90/90 Stretch', 'Mobility', true, null),
  ('Couch Stretch', 'Mobility', true, null),
  ('Pigeon Stretch', 'Mobility', true, null),
  
  -- Ankle Health
  ('Soleus Raises', 'Legs', true, null),
  ('Ankle CARs', 'Mobility', true, null),
  ('Single Leg Calf Raise', 'Legs', true, null),
  
  -- Longevity Exercises (Peter Attia / Andy Galpin)
  ('Farmers Carry', 'Functional', true, null),
  ('Dead Hang', 'Back', true, null),
  ('Deep Squat Hold', 'Mobility', true, null),
  ('Single Leg Balance', 'Functional', true, null),
  ('Get-ups', 'Functional', true, null),
  ('Turkish Get-up', 'Functional', true, null),
  
  -- Zone 2 / VO2 Max Cardio Variations
  ('Zone 2 Run', 'Cardio', true, null),
  ('Zone 2 Bike', 'Cardio', true, null),
  ('Zone 2 Row', 'Cardio', true, null),
  ('VO2 Max Intervals', 'Cardio', true, null),
  ('4x4 Norwegian Intervals', 'Cardio', true, null),
  ('30/30 Intervals', 'Cardio', true, null),
  ('Tempo Run', 'Cardio', true, null),
  ('Long Slow Distance', 'Cardio', true, null),
  
  -- Hyrox Specific
  ('SkiErg', 'Cardio', true, null),
  ('Sled Push', 'Functional', true, null),
  ('Sled Pull', 'Functional', true, null),
  ('Burpee Broad Jump', 'Cardio', true, null),
  ('Wall Balls', 'Functional', true, null),
  ('Sandbag Lunges', 'Legs', true, null),
  
  -- Kettlebell (Pavel / StrongFirst)
  ('Kettlebell Swing', 'Functional', true, null),
  ('Kettlebell Snatch', 'Functional', true, null),
  ('Kettlebell Clean', 'Functional', true, null),
  ('Kettlebell Press', 'Shoulders', true, null),
  ('Kettlebell Goblet Squat', 'Legs', true, null),
  ('Kettlebell Row', 'Back', true, null),
  
  -- Mobility & Recovery
  ('Foam Rolling', 'Mobility', true, null),
  ('Cat-Cow Stretch', 'Mobility', true, null),
  ('World Greatest Stretch', 'Mobility', true, null),
  ('Shoulder CARs', 'Mobility', true, null),
  ('Hip CARs', 'Mobility', true, null),
  ('Spine CARs', 'Mobility', true, null),
  ('Banded Distractions', 'Mobility', true, null),
  
  -- Stability & Balance
  ('Single Leg Deadlift', 'Legs', true, null),
  ('Pallof Press', 'Core', true, null),
  ('Bird Dog', 'Core', true, null),
  ('Side Plank', 'Core', true, null),
  ('Copenhagen Plank', 'Core', true, null),
  ('Yoga', 'Mobility', true, null),
  
  -- CrossFit Movements
  ('Thrusters', 'Functional', true, null),
  ('Power Clean', 'Functional', true, null),
  ('Clean and Jerk', 'Functional', true, null),
  ('Snatch', 'Functional', true, null),
  ('Muscle-ups', 'Back', true, null),
  ('Toes to Bar', 'Core', true, null),
  ('Handstand Push-ups', 'Shoulders', true, null),
  ('Double Unders', 'Cardio', true, null),
  ('Assault Bike', 'Cardio', true, null),
  ('Air Squat', 'Legs', true, null),
  ('Pistol Squat', 'Legs', true, null)
ON CONFLICT DO NOTHING;

-- =============================================
-- Success! Bulletproofing exercises added.
-- =============================================
