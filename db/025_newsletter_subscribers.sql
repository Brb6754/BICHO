-- 025_newsletter_subscribers.sql
-- The subscribe box on /ia, the campaign landing.
--
-- Why this table lives in the reservas-saas project and not in the NOTI
-- one: NOTI's Supabase project does not exist yet (it is still a pending
-- item), and a landing whose only call to action silently drops the
-- email is worse than a landing with no form. This table is where the
-- campaign's subscribers land TODAY. When NOTI's project is up, these
-- rows get exported into it — which is a one-off migration of a few
-- columns, not an architecture decision we have to live with.
--
-- Same access pattern as demo_requests, platform_admins and resellers:
-- RLS on with ZERO policies, so `anon` and `authenticated` can neither
-- read nor write it. The form reaches it only through a Server Action
-- using the service_role client. That matters: these rows are a real
-- person's email address, which is personal data under the LFPDPPP.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),

  -- Length limits live in the database and not only in the form. A
  -- Server Action is a real POST endpoint that can be called without
  -- ever loading the page, so the form's validation is a courtesy and
  -- this one is the guarantee.
  email text not null check (char_length(email) between 5 and 200),

  -- Where the person came from, so a post can be judged by whether it
  -- actually brought anyone. Free text rather than an enum: the list of
  -- posts grows, and a subscriber whose source is not on the list should
  -- still land here rather than be rejected.
  source text check (char_length(source) <= 80),

  -- Double opt-in is how NOTI is designed to work (see noti-bicho), and
  -- it is also what keeps a list out of spam folders. Until NOTI's own
  -- project sends the confirmation, a row sits at 'pending' — honest
  -- about the fact that nobody has confirmed anything yet.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),

  created_at timestamptz not null default now(),

  -- One row per address. A person who submits twice is not two
  -- subscribers, and without this the list quietly fills with duplicates
  -- that then get mailed twice.
  unique (email)
);

alter table public.newsletter_subscribers enable row level security;

comment on table public.newsletter_subscribers is
  'Emails captured by /ia, the campaign landing. PII: never exposed to anon — RLS on with no policies, reachable only via service_role in a Server Action. Temporary home until NOTI has its own Supabase project.';
