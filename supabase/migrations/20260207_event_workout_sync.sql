-- Add event sync columns to workouts table
-- Run this in Supabase SQL Editor

-- Add columns to link workouts to event training workouts
ALTER TABLE public.workouts
ADD COLUMN IF NOT EXISTS source_training_workout_id UUID REFERENCES public.event_training_workouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES public.squad_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_event_name TEXT,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workouts_source_training_workout ON public.workouts(source_training_workout_id);
CREATE INDEX IF NOT EXISTS idx_workouts_source_event ON public.workouts(source_event_id);

-- Create junction table for event workout exercises (optional - for multi-exercise support)
CREATE TABLE IF NOT EXISTS public.event_workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_workout_id UUID NOT NULL REFERENCES public.event_training_workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    target_sets INTEGER,
    target_reps INTEGER,
    target_weight NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE public.event_workout_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies - anyone can read event workout exercises
CREATE POLICY "Anyone can read event workout exercises"
ON public.event_workout_exercises FOR SELECT
USING (true);

-- Only event creators can modify exercises
CREATE POLICY "Event creators can manage workout exercises"
ON public.event_workout_exercises FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.event_training_workouts etw
        JOIN public.squad_events se ON se.id = etw.event_id
        WHERE etw.id = event_workout_exercises.training_workout_id
        AND se.creator_id = auth.uid()
    )
);
