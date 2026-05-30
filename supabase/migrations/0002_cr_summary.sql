-- AI summary of a change request's proposed edits. Generated once on first
-- view (behind a Suspense boundary) and stored here so it never regenerates.
alter table public.change_requests
  add column if not exists ai_summary text;
