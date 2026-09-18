-- Demo requests: the leads that come in from /demo on the marketing site.
--
-- Until now the landing's only call to action was a `mailto:` link, which
-- asks a phone visitor to have a mail app configured and asks Bruno to
-- keep his inbox as a CRM. This table is the actual record; the email
-- notification is a convenience on top of it, not the source of truth.
--
-- Same access pattern as `platform_admins` and `resellers`: RLS on with
-- ZERO policies, so `anon` and `authenticated` can neither read nor
-- write it. The public form reaches it only through a Server Action that
-- uses the `service_role` client — identical to how the public booking
-- flow writes `customers`/`bookings`. That matters here: these rows hold
-- a real person's name, phone and email.

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),

  -- Length limits live in the database, not only in the form: this is
  -- reachable without authentication, and a Server Action is a real POST
  -- endpoint that can be called without ever loading the page.
  name text not null check (char_length(name) between 2 and 120),
  business text not null check (char_length(business) between 2 and 160),
  email text not null check (char_length(email) between 5 and 200),
  phone text not null check (char_length(phone) between 7 and 30),

  -- Which kind of business, so the first call isn't a discovery call.
  -- Free text rather than an enum: the list on the form will grow, and a
  -- lead whose giro isn't on the list should still land here.
  vertical text check (char_length(vertical) <= 60),
  city text check (char_length(city) <= 120),
  -- Set when the visitor arrives from a pricing card (/demo?plan=…).
  plan text check (char_length(plan) <= 60),
  message text check (char_length(message) <= 2000),

  -- Bruno's pipeline. Deliberately small: a status nobody updates is
  -- worse than no status, so this is the shortest list that still
  -- answers "who have I not called yet".
  status text not null default 'new'
    check (status in ('new', 'contacted', 'won', 'lost')),

  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;

-- Newest first is the only way this is ever read.
create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);
