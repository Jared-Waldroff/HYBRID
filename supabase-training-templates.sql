-- =====================================================
-- Training Templates Schema
-- Stores curated training program templates for AI Coach
-- =====================================================

-- Main templates table
CREATE TABLE IF NOT EXISTS training_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sport TEXT NOT NULL CHECK (sport IN (
        'strength', 'hypertrophy', 'powerlifting', 'olympic_lifting',
        'running', 'marathon', 'triathlon',
        'hyrox', 'crossfit', 'hiit',
        'kettlebell', 'mobility', 'general'
    )),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
    duration_weeks INTEGER NOT NULL,
    days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 7),
    description TEXT NOT NULL,
    target_event TEXT, -- Optional: '5K', 'Marathon', 'HYROX Open', 'CrossFit Open', etc.
    equipment_needed JSONB DEFAULT '["full_gym"]'::JSONB,
    phases JSONB NOT NULL, -- Periodization structure
    weekly_template JSONB NOT NULL, -- Default week structure
    instructions TEXT, -- Additional coaching notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_training_templates_sport ON training_templates(sport);
CREATE INDEX IF NOT EXISTS idx_training_templates_difficulty ON training_templates(difficulty);

-- Enable RLS
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read templates (they're public reference data)
CREATE POLICY "Training templates are viewable by all authenticated users"
ON training_templates FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- SAMPLE TEMPLATES
-- =====================================================

-- 1. HYROX 8-Week Prep (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'HYROX 8-Week Race Prep',
    'hyrox',
    'intermediate',
    8,
    5,
    'Complete 8-week HYROX preparation program building running endurance, station-specific strength, and race simulation.',
    'HYROX Open/Pro',
    '["gym", "skierg", "rower", "sled", "sandbag", "kettlebells", "wall_balls"]'::JSONB,
    '{
        "phases": [
            {"name": "Base", "weeks": [1, 2, 3], "focus": "Build aerobic base and movement patterns"},
            {"name": "Build", "weeks": [4, 5, 6], "focus": "Increase intensity, add station combos"},
            {"name": "Peak", "weeks": [7], "focus": "Race simulations, fine-tune pacing"},
            {"name": "Taper", "weeks": [8], "focus": "Reduce volume, stay sharp"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Strength", "focus": "Lower body + core", "duration_min": 60},
            {"day": "Tuesday", "type": "Running", "focus": "Tempo run 30-40 min", "duration_min": 45},
            {"day": "Wednesday", "type": "Station Work", "focus": "SkiErg/Row intervals + Wall Balls", "duration_min": 50},
            {"day": "Thursday", "type": "Recovery", "focus": "Zone 2 easy run or mobility", "duration_min": 30},
            {"day": "Friday", "type": "Strength", "focus": "Upper body + sled work", "duration_min": 60},
            {"day": "Saturday", "type": "Long Session", "focus": "Race simulation or long run", "duration_min": 75},
            {"day": "Sunday", "type": "Rest", "focus": "Complete rest or light mobility", "duration_min": 0}
        ]
    }'::JSONB,
    'Focus on consistent 1km splits during runs (aim for 4:30-5:00/km for most). Break wall balls into sets of 10-15 from the start. Practice transitions - walk 20m after each station before running.'
);

-- 2. 12-Week Half Marathon (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    '12-Week Half Marathon Plan',
    'running',
    'intermediate',
    12,
    4,
    'Progressive half marathon training plan building from 20 to 35 miles per week with structured speed and tempo work.',
    'Half Marathon',
    '["running_shoes", "gps_watch"]'::JSONB,
    '{
        "phases": [
            {"name": "Base", "weeks": [1, 2, 3, 4], "focus": "Build volume safely, mostly easy running"},
            {"name": "Build", "weeks": [5, 6, 7, 8], "focus": "Add tempo runs, increase long run distance"},
            {"name": "Peak", "weeks": [9, 10], "focus": "Highest volume, race-pace work"},
            {"name": "Taper", "weeks": [11, 12], "focus": "Reduce volume, maintain intensity, rest"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Tuesday", "type": "Speed", "focus": "Intervals or tempo run", "duration_min": 45},
            {"day": "Thursday", "type": "Easy", "focus": "Recovery run, Zone 2", "duration_min": 35},
            {"day": "Saturday", "type": "Long Run", "focus": "Progressive distance build", "duration_min": 75},
            {"day": "Sunday", "type": "Easy", "focus": "Recovery run or cross-train", "duration_min": 30}
        ]
    }'::JSONB,
    'Key sessions: Long run builds to 11-12 miles. Tempo runs at goal pace +15-20 sec/mile. Follow 10% rule for weekly mileage increases. Take an easy week every 4th week.'
);

-- 3. 5/3/1 Strength (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'Wendler 5/3/1 Strength Program',
    'strength',
    'intermediate',
    4,
    4,
    'Classic 5/3/1 strength program focusing on squat, bench, deadlift, and overhead press with submaximal training and AMRAP sets.',
    NULL,
    '["barbell", "squat_rack", "bench", "plates"]'::JSONB,
    '{
        "phases": [
            {"name": "Week 1", "weeks": [1], "focus": "5x5, 5x5, 5+ @ 65%, 75%, 85%"},
            {"name": "Week 2", "weeks": [2], "focus": "5x3, 5x3, 3+ @ 70%, 80%, 90%"},
            {"name": "Week 3", "weeks": [3], "focus": "5, 3, 1+ @ 75%, 85%, 95%"},
            {"name": "Deload", "weeks": [4], "focus": "5x5, 5x5, 5x5 @ 40%, 50%, 60%"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Squat", "focus": "Squat 5/3/1 + accessories", "duration_min": 60},
            {"day": "Tuesday", "type": "Bench", "focus": "Bench Press 5/3/1 + accessories", "duration_min": 55},
            {"day": "Thursday", "type": "Deadlift", "focus": "Deadlift 5/3/1 + accessories", "duration_min": 60},
            {"day": "Friday", "type": "OHP", "focus": "Overhead Press 5/3/1 + accessories", "duration_min": 55}
        ]
    }'::JSONB,
    'Calculate training max at 90% of true 1RM. Always hit minimum reps, push AMRAP sets but leave 1-2 in tank. Add 5 lbs to upper lifts and 10 lbs to lower lifts each cycle. Accessories: 50-100 reps each of push, pull, and single-leg/core.'
);

-- 4. CrossFit GPP (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'CrossFit GPP Base Building',
    'crossfit',
    'intermediate',
    8,
    5,
    'General Physical Preparedness program for CrossFit athletes focusing on building broad work capacity across all modalities.',
    'CrossFit Competition',
    '["full_gym", "pull_up_bar", "rings", "barbell", "kettlebells", "rower", "assault_bike"]'::JSONB,
    '{
        "phases": [
            {"name": "Volume", "weeks": [1, 2, 3, 4], "focus": "Build work capacity, address weaknesses"},
            {"name": "Intensity", "weeks": [5, 6, 7, 8], "focus": "Increase intensity, competition simulation"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Heavy + Short", "focus": "Strength movement + short metcon (<7 min)", "duration_min": 75},
            {"day": "Tuesday", "type": "Skills + Aerobic", "focus": "Gymnastics practice + Zone 2", "duration_min": 60},
            {"day": "Wednesday", "type": "Olympic + Moderate", "focus": "Snatch or Clean work + 10-15 min metcon", "duration_min": 75},
            {"day": "Thursday", "type": "Long Grind", "focus": "20-30 min chipper or AMRAP", "duration_min": 60},
            {"day": "Friday", "type": "Mixed Modal", "focus": "Competition-style workout", "duration_min": 60}
        ]
    }'::JSONB,
    'Track benchmark workout times (Fran, Grace, Helen). Dedicate time to your weakest movement every session. Aim for 80% of training at sustainable pace, 20% redline. Rest weekends or add light active recovery.'
);

-- 5. Simple & Sinister Kettlebell (Beginner)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'Simple & Sinister Kettlebell',
    'kettlebell',
    'beginner',
    12,
    6,
    'Pavel Tsatsouline minimalist kettlebell program. 100 swings + 10 Turkish get-ups daily. Simple but brutally effective.',
    NULL,
    '["kettlebell"]'::JSONB,
    '{
        "phases": [
            {"name": "Learn", "weeks": [1, 2, 3, 4], "focus": "Master technique, start light"},
            {"name": "Build", "weeks": [5, 6, 7, 8], "focus": "Increase weight, maintain form"},
            {"name": "Test", "weeks": [9, 10, 11, 12], "focus": "Work toward Simple standard"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Daily", "type": "Practice", "focus": "100 swings + 10 TGU", "duration_min": 30}
        ]
    }'::JSONB,
    'Swings: 10 sets of 10, one-arm or two-arm. Get-ups: 5 each side, alternating. Rest as needed between sets. Target time: <20 min for Simple, <15 min for Sinister. Simple standard: 32kg men / 24kg women.'
);

-- 6. Daily Mobility Protocol (All Levels)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'Daily Mobility & Joint Health',
    'mobility',
    'beginner',
    4,
    7,
    'Daily mobility protocol using CARs, stretching, and joint prep. Perfect as standalone or supplement to training.',
    NULL,
    '["foam_roller", "lacrosse_ball", "pull_up_bar"]'::JSONB,
    '{
        "phases": [
            {"name": "Foundation", "weeks": [1, 2], "focus": "Learn CARs, establish routine"},
            {"name": "Expand", "weeks": [3, 4], "focus": "Add PAILs/RAILs, increase end-range work"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Daily AM", "type": "Morning Routine", "focus": "CARs + deep squat hold", "duration_min": 10},
            {"day": "Daily PM", "type": "Evening Stretch", "focus": "Targeted stretching + foam roll", "duration_min": 15}
        ]
    }'::JSONB,
    'Morning: Full body CARs (neck, shoulders, spine, hips, knees, ankles), 2-3 rotations each. Add 2 min deep squat hold. Evening: Target your tightest areas with 90-120 sec holds. Dead hang for shoulder health.'
);

-- 7. Push-Pull-Legs Hypertrophy (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'PPL Hypertrophy Program',
    'hypertrophy',
    'intermediate',
    8,
    6,
    'Classic Push/Pull/Legs split run twice per week. High volume approach for muscle growth.',
    NULL,
    '["full_gym", "dumbbells", "cables", "machines"]'::JSONB,
    '{
        "phases": [
            {"name": "Volume", "weeks": [1, 2, 3, 4], "focus": "Progressive overload, add sets"},
            {"name": "Intensity", "weeks": [5, 6], "focus": "Reduce sets, increase weight"},
            {"name": "Deload", "weeks": [7], "focus": "Recovery week, 50% volume"},
            {"name": "Peak", "weeks": [8], "focus": "Test new rep maxes"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Push A", "focus": "Chest emphasis + shoulders + triceps", "duration_min": 60},
            {"day": "Tuesday", "type": "Pull A", "focus": "Back width + biceps + rear delts", "duration_min": 60},
            {"day": "Wednesday", "type": "Legs A", "focus": "Quad emphasis + calves", "duration_min": 65},
            {"day": "Thursday", "type": "Push B", "focus": "Shoulder emphasis + chest + triceps", "duration_min": 60},
            {"day": "Friday", "type": "Pull B", "focus": "Back thickness + biceps + rear delts", "duration_min": 60},
            {"day": "Saturday", "type": "Legs B", "focus": "Hamstring/glute emphasis + calves", "duration_min": 65}
        ]
    }'::JSONB,
    'Rep ranges: Compounds 6-10 reps, isolations 10-15 reps. Rest 90-120 sec between sets. 10-15 sets per muscle per week, progressing to 15-20 in volume phase. Train 1-2 reps from failure on most sets.'
);

-- 8. Powerlifting Meet Prep (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    '12-Week Powerlifting Meet Prep',
    'powerlifting',
    'intermediate',
    12,
    4,
    'Competition-focused powerlifting program peaking for a meet. Block periodization with hypertrophy, strength, and peaking phases.',
    'Powerlifting Meet',
    '["barbell", "squat_rack", "bench", "plates", "belt"]'::JSONB,
    '{
        "phases": [
            {"name": "Hypertrophy", "weeks": [1, 2, 3, 4], "focus": "Volume accumulation, 4x8-10 @ 65-75%"},
            {"name": "Strength", "weeks": [5, 6, 7, 8], "focus": "Intensity increase, 5x5 @ 75-85%"},
            {"name": "Peaking", "weeks": [9, 10, 11], "focus": "Heavy singles and doubles @ 85-95%"},
            {"name": "Meet Week", "weeks": [12], "focus": "Openers only, rest, competition"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Squat", "focus": "Competition squat + accessories", "duration_min": 75},
            {"day": "Tuesday", "type": "Bench", "focus": "Competition bench + upper accessories", "duration_min": 70},
            {"day": "Thursday", "type": "Deadlift", "focus": "Competition deadlift + back work", "duration_min": 70},
            {"day": "Friday", "type": "Volume", "focus": "Secondary bench/squat + weak point work", "duration_min": 60}
        ]
    }'::JSONB,
    'Practice competition commands starting Week 8. Opener attempts (Week 11) should be 90% of goal third attempt. Cut accessories in peaking phase. Last heavy session 10 days before meet.'
);

-- 9. Olympic Weightlifting (Intermediate)
INSERT INTO training_templates (name, sport, difficulty, duration_weeks, days_per_week, description, target_event, equipment_needed, phases, weekly_template, instructions)
VALUES (
    'Olympic Lifting Development',
    'olympic_lifting',
    'intermediate',
    8,
    4,
    'Classic Olympic weightlifting program focused on snatch and clean & jerk development with supporting squat and pull work.',
    'Weightlifting Competition',
    '["barbell", "squat_rack", "bumper_plates", "platform"]'::JSONB,
    '{
        "phases": [
            {"name": "Volume", "weeks": [1, 2, 3, 4], "focus": "Technique work, position strength, higher reps"},
            {"name": "Intensity", "weeks": [5, 6, 7, 8], "focus": "Heavier singles, competition simulation"}
        ]
    }'::JSONB,
    '{
        "days": [
            {"day": "Monday", "type": "Snatch", "focus": "Snatch variations + front squat", "duration_min": 90},
            {"day": "Tuesday", "type": "Clean & Jerk", "focus": "C&J + pulls", "duration_min": 90},
            {"day": "Thursday", "type": "Snatch", "focus": "Power snatch + overhead strength", "duration_min": 75},
            {"day": "Friday", "type": "Clean & Jerk", "focus": "Clean + back squat", "duration_min": 80}
        ]
    }'::JSONB,
    'Work up to daily max on classic lifts, then back off to 80-85% for 2-3 singles. Squats: 3x3 @ 80-85%. Pulls at 90-100% of lift max. Focus on consistent positions over max weight.'
);
