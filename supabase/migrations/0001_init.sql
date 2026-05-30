-- DocHub initial schema.
-- RLS is intentionally disabled; this app currently treats documents and
-- change requests as workspace-public. To enable RLS, scope every table by
-- a workspace_id and surface a session JWT through the cookie-bound
-- Supabase client.

create extension if not exists pgcrypto;

-- Documents: the "source of truth" — one (or many) per workspace, with one pinned at a time.
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Exactly one pinned document at a time. Enforced at the database layer.
create unique index if not exists documents_one_pinned
  on public.documents ((pinned)) where pinned = true;

-- Change requests: PRs against a document.
create table if not exists public.change_requests (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  title             text not null,
  description       text,
  author            text not null,
  status            text not null default 'open'
                    check (status in ('open','approved','merged','closed')),
  original_content  text not null,
  proposed_content  text not null,
  ai_metadata       jsonb,
  ai_summary        text,
  created_at        timestamptz not null default now(),
  approved_by       text,
  approved_at       timestamptz
);

create index if not exists change_requests_document_idx
  on public.change_requests (document_id, created_at desc);

-- Comments on a change request.
create table if not exists public.comments (
  id                  uuid primary key default gen_random_uuid(),
  change_request_id   uuid not null references public.change_requests(id) on delete cascade,
  author              text not null,
  content             text not null,
  created_at          timestamptz not null default now()
);

create index if not exists comments_change_request_idx
  on public.comments (change_request_id, created_at asc);

-- Commits: append-only history of merges on a document.
create table if not exists public.commits (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.documents(id) on delete cascade,
  change_request_id   uuid references public.change_requests(id) on delete set null,
  message             text not null,
  author              text not null,
  content_snapshot    text not null,
  created_at          timestamptz not null default now()
);

create index if not exists commits_document_idx
  on public.commits (document_id, created_at desc);

-- updated_at trigger on documents
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
