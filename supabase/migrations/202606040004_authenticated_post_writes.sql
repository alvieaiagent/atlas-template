-- Phase 2.5: the initial schema only let service_role write posts, but Mark and the paste
-- Library upsert posts using the logged-in (authenticated) client. Allow authenticated
-- inserts/updates so persistence works. Idempotent via drop-if-exists.
drop policy if exists "Authenticated users can insert posts" on public.posts;
create policy "Authenticated users can insert posts"
  on public.posts for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update posts" on public.posts;
create policy "Authenticated users can update posts"
  on public.posts for update
  to authenticated
  using (true)
  with check (true);
