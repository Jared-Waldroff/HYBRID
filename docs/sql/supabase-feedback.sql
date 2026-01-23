-- Create feedback table
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  device_info text,
  app_version text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Policies

-- 1. Insert Policy
drop policy if exists "Users can insert feedback" on public.feedback;
create policy "Users can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id OR user_id is null);

-- 2. Select Policy (Admin only)
drop policy if exists "Jared can view feedback" on public.feedback;
create policy "Jared can view feedback"
  on public.feedback for select
  using (auth.jwt() ->> 'email' = 'jared.waldroff@gmail.com');
  
-- Grant access
grant insert, select on public.feedback to authenticated;
