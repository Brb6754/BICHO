-- 017_reseller_pricing.sql
-- ONLY needed if you already ran the FIRST version of db/016 (the one
-- with `commission_mxn`). If you are running 016 now, it already has
-- everything here and you can skip this file — running it anyway is
-- harmless, every statement is idempotent.
--
-- Why: the model was built backwards. It assumed bicho PAYS the rep a
-- commission. It's the opposite — the rep sets their own price to each
-- business, charges them directly, and pays bicho a fixed wholesale
-- price per active business. Same number shape, opposite direction, and
-- a second price (the rep's own) that had nowhere to live.

-- commission_mxn → wholesale_price_mxn (what the rep OWES bicho)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resellers' and column_name = 'commission_mxn'
  ) then
    alter table resellers rename column commission_mxn to wholesale_price_mxn;
  end if;
end $$;

alter table resellers
  add column if not exists default_retail_price_mxn integer not null default 0,
  add column if not exists billing_day smallint not null default 1;

-- Constraints added separately so re-running never fails on a duplicate.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'resellers_default_retail_price_range') then
    alter table resellers add constraint resellers_default_retail_price_range
      check (default_retail_price_mxn between 0 and 100000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resellers_billing_day_range') then
    alter table resellers add constraint resellers_billing_day_range check (billing_day between 1 and 28);
  end if;
end $$;

-- What the rep charges each business. Null = came in directly, no rep.
alter table tenants
  add column if not exists retail_price_mxn integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_retail_price_range') then
    alter table tenants add constraint tenants_retail_price_range
      check (retail_price_mxn between 0 and 100000);
  end if;
end $$;

comment on column resellers.wholesale_price_mxn is 'MXN per month per ACTIVE tenant that this rep OWES bicho.';
comment on column tenants.retail_price_mxn is 'The price the rep charges this business per month. Set by the rep.';
