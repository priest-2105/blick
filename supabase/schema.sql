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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_name_length_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_name_length_check
      check (char_length(name) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_icon_name_length_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_icon_name_length_check
      check (char_length(icon_name) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_color_length_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_color_length_check
      check (char_length(color) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_sequences_length_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_sequences_length_check
      check (jsonb_typeof(sequences) = 'array' and jsonb_array_length(sequences) <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_icon_data_size_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_icon_data_size_check
      check (pg_column_size(icon_data) <= 500000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'saved_projects_sequences_size_check'
  ) then
    alter table public.saved_projects
      add constraint saved_projects_sequences_size_check
      check (pg_column_size(sequences) <= 500000);
  end if;
end $$;

create index if not exists saved_projects_user_updated_idx
  on public.saved_projects (user_id, updated_at desc);

alter table public.saved_projects enable row level security;
alter table public.saved_projects force row level security;

revoke all on public.saved_projects from anon;
grant select, insert, update, delete on public.saved_projects to authenticated;

drop policy if exists "Users can read their projects" on public.saved_projects;
create policy "Users can read their projects"
  on public.saved_projects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their projects" on public.saved_projects;
create policy "Users can create their projects"
  on public.saved_projects
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their projects" on public.saved_projects;
create policy "Users can update their projects"
  on public.saved_projects
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their projects" on public.saved_projects;
create policy "Users can delete their projects"
  on public.saved_projects
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  4194304,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read avatars" on storage.objects;
create policy "Users can read avatars"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their avatar" on storage.objects;
create policy "Users can upload their avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their avatar" on storage.objects;
create policy "Users can update their avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their avatar" on storage.objects;
create policy "Users can delete their avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
