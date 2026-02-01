-- =========================================================================================
-- HYBRID SQUAD SEED SCRIPT (FIXED FOR FK CONSTRAINTS)
-- =========================================================================================
-- Use this script to populate your database with diverse dummy athletes and add them to your squad.
--
-- INSTRUCTIONS:
-- 1. This script has been pre-filled with User ID: 01af9da0-939d-4144-bd2e-d48dfa4358b4
-- 2. Run the script in Supabase SQL Editor.
-- =========================================================================================

-- =========================================================================================
-- 0. INSERT DUMMY AUTH USERS (REQUIRED FOR FK CONSTRAINT)
-- =========================================================================================
-- We must insert into auth.users first because athlete_profiles references it.
-- These users cannot log in (dummy password), but they satisfy the database constraint.

-- NOTE: This block inserts into the 'auth' schema. Requires appropriate privileges (SQL Editor has them).

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
VALUES 
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex@example.com', '$2a$10$dummy_hash_alex', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah@example.com', '$2a$10$dummy_hash_sarah', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mike@example.com', '$2a$10$dummy_hash_mike', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jenny@example.com', '$2a$10$dummy_hash_jenny', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carl@example.com', '$2a$10$dummy_hash_carl', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rachel@example.com', '$2a$10$dummy_hash_rachel', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jim@example.com', '$2a$10$dummy_hash_jim', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nate@example.com', '$2a$10$dummy_hash_nate', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cathy@example.com', '$2a$10$dummy_hash_cathy', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coach@example.com', '$2a$10$dummy_hash_coach', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zack@example.com', '$2a$10$dummy_hash_zack', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('d0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bella@example.com', '$2a$10$dummy_hash_bella', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false)

ON CONFLICT (id) DO NOTHING;

-- =========================================================================================
-- 1. INSERT DUMMY ATHLETES
-- =========================================================================================
-- We use fixed UUIDs for these dummy users so we can reference them later.
-- FIXED: Badges are JSONB, so we use to_jsonb(ARRAY[...])

INSERT INTO athlete_profiles (user_id, display_name, username, badges, avatar_url)
VALUES 
  -- ELITE ATHLETES
  ('d0000000-0000-0000-0000-000000000001', 'Alex Strong', 'alex_strong', to_jsonb(ARRAY['1000lb_club', 'morning_warrior', 'early_riser', 'heavy_lifter', 'elite_status']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'Sarah Power', 'sarah_p', to_jsonb(ARRAY['1500lb_club', 'bodyweight_bench', 'gym_rat', 'community_legend']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'Mike Endurance', 'iron_mike', to_jsonb(ARRAY['100_workouts', 'speed_demon', 'marathon_master', 'cardio_king']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000003'),
  
  -- SQUAD REGULARS
  ('d0000000-0000-0000-0000-000000000004', 'Jenny Yoga', 'jenny_flows', to_jsonb(ARRAY['consistency_king', 'early_riser', '365_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000005', 'Crossfit Carl', 'carl_amrap', to_jsonb(ARRAY['high_intensity', 'gym_rat', '50_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000005'),
  ('d0000000-0000-0000-0000-000000000006', 'Runner Rachel', 'rachel_runs', to_jsonb(ARRAY['speed_demon', 'morning_warrior', '100_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000006'),
  ('d0000000-0000-0000-0000-000000000007', 'Big Jim', 'big_jim_lifts', to_jsonb(ARRAY['heavy_lifter', '1000lb_club']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000007'),
  
  -- NEWBIES / CASUALS
  ('d0000000-0000-0000-0000-000000000008', 'Newbie Nate', 'nate_trains', to_jsonb(ARRAY['first_workout', 'fresh_start']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000008'),
  ('d0000000-0000-0000-0000-000000000009', 'Casual Cathy', 'cathy_c', to_jsonb(ARRAY['social_butterfly', '10_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000009'),
  
  -- SPECIALISTS
  ('d0000000-0000-0000-0000-000000000010', 'Coach Carter', 'coach_c', to_jsonb(ARRAY['mentor', 'technique_master', 'community_legend', '365_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000010'),
  ('d0000000-0000-0000-0000-000000000011', 'Zack Zoneres', 'zone_zack', to_jsonb(ARRAY['data_nerd', 'consistency_king', '100_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000011'),
  ('d0000000-0000-0000-0000-000000000012', 'Bella Barre', 'bella_b', to_jsonb(ARRAY['flexible', 'early_riser', '50_workouts']), 'https://i.pravatar.cc/150?u=d0000000-0000-0000-0000-000000000012')

ON CONFLICT (user_id) DO UPDATE 
SET 
  badges = EXCLUDED.badges,
  avatar_url = EXCLUDED.avatar_url,
  display_name = EXCLUDED.display_name;

-- =========================================================================================
-- 2. CONNECT TO YOUR SQUAD
-- =========================================================================================
-- Using User ID: 01af9da0-939d-4144-bd2e-d48dfa4358b4

INSERT INTO squad_members (requester_id, receiver_id, status)
VALUES
  -- You accepted them into your squad (Friends)
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000001', 'accepted'), -- Alex Strong
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000002', 'accepted'), -- Sarah Power
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000003', 'accepted'), -- Mike Endurance
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000004', 'accepted'), -- Jenny Yoga
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000005', 'pending'),  -- Carl (Invited)
  
  -- They requested to join you (Status: pending, Requester: Them)
  ('d0000000-0000-0000-0000-000000000006', '01af9da0-939d-4144-bd2e-d48dfa4358b4', 'pending'), -- Rachel wants to follow you
  ('d0000000-0000-0000-0000-000000000008', '01af9da0-939d-4144-bd2e-d48dfa4358b4', 'pending'), -- Newbie Nate wants to follow you
  
  -- More friends
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000007', 'accepted'), -- Big Jim
  ('01af9da0-939d-4144-bd2e-d48dfa4358b4', 'd0000000-0000-0000-0000-000000000010', 'accepted')  -- Coach Carter

ON CONFLICT (requester_id, receiver_id) DO NOTHING;
