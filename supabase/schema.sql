create extension if not exists "pgcrypto";

create table if not exists public.saved_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon_library text not null,
  icon_name text not null,
  icon_id text not null,
  icon_data jsonb not null,
  color text not null default '#ffffff',
  sequences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_projects_user_updated_idx
  on public.saved_projects (user_id, updated_at desc);

alter table public.saved_projects enable row level security;

create policy "Users can read their projects"
  on public.saved_projects
  for select
  using (auth.uid() = user_id);

create policy "Users can create their projects"
  on public.saved_projects
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their projects"
  on public.saved_projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their projects"
  on public.saved_projects
  for delete
  using (auth.uid() = user_id);
