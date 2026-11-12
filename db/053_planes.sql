-- ============================================================
-- 053 · Planes Esencial / Negocio / Pro
--
-- Reemplaza "$299 base + $200 por módulo" (decisión de Bruno, 2026-11-11).
-- La tabla de planes (precio, módulos, topes) vive en código:
-- lib/billing/planes.ts. Aquí solo lo que tiene que guardarse por negocio.
--
-- 1. tenants.plan (ya existía desde db/006, siempre 'standard') pasa a
--    'esencial' | 'negocio' | 'pro'. Backfill: demos → pro; el resto, el
--    plan más chico que cubre los módulos que ya tiene prendidos (nadie
--    pierde nada).
-- 2. tenants.precio_fundador_mxn: precio congelado de los primeros 20 que
--    pagan Negocio. Lo escribe solo el webhook de Mercado Pago.
-- 3. copiloto_preguntas: una fila por pregunta, para el tope de 500/mes.
--    (El tope de 100 timbres/mes se cuenta sobre `invoices`, no necesita
--    tabla.)
--
-- El código funciona antes de correr esto: un plan desconocido se trata
-- como "sin plan" (nada bloqueado, $299), y sin la tabla el Copiloto no
-- tiene tope.
-- PENDIENTE DE CORRER A MANO en el SQL Editor. Idempotente.
-- ============================================================

-- 1 · Backfill del plan (solo filas que aún no tienen uno de los tres).
update tenants set plan = case
    when slug in ('dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena', 'hierro-monte',
                  'clinica-alameda', 'don-ramon', 'lima-laca', 'burbujas-bigotes', 'casa-norte', 'nova-solar')
      then 'pro'
    when quotes_enabled or facturacion_enabled or reuniones_enabled or copiloto_enabled
      then 'pro'
    when caja_enabled or lealtad_enabled or regresan_enabled or inventario_enabled or comisiones_enabled
      then 'negocio'
    else 'esencial'
  end
where plan not in ('esencial', 'negocio', 'pro');

alter table tenants alter column plan set default 'esencial';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_plan_check') then
    alter table tenants add constraint tenants_plan_check check (plan in ('esencial', 'negocio', 'pro'));
  end if;
end $$;

comment on column tenants.plan is
  'esencial | negocio | pro. Precio y módulos incluidos: lib/billing/planes.ts.';

-- Resico es gratis en todos los planes: se prende para quien no lo tenga.
update tenants set resico_enabled = true where resico_enabled = false;

-- 2 · Precio fundador.
alter table tenants
  add column if not exists precio_fundador_mxn integer
    check (precio_fundador_mxn is null or precio_fundador_mxn > 0);

comment on column tenants.precio_fundador_mxn is
  'Precio fundador congelado (MXN/mes) de Negocio. Lo pone el webhook de MP al primer cobro autorizado; null = precio de lista.';

-- 3 · Uso del Copiloto.
create table if not exists copiloto_preguntas (
  id         bigint generated always as identity primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid,
  created_at timestamptz not null default now()
);

create index if not exists copiloto_preguntas_tenant_mes_idx on copiloto_preguntas(tenant_id, created_at);

-- Sin policies: solo service_role (la ruta del Copiloto) lee y escribe.
alter table copiloto_preguntas enable row level security;
