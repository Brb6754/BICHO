# Copiloto del negocio — especificación v1

Diseñado con Bruno el 2026-10-29. Las decisiones y su porqué viven en
`README.md` (la bitácora); este archivo dice **qué construir**. Si algo de
aquí contradice la bitácora, gana la bitácora y se anota la discrepancia.

## Qué es

Un chat dentro del panel del negocio (`/t/[slug]/dashboard/copiloto`) donde
el **dueño** pregunta en español sobre sus propios datos y el copiloto
responde consultando la base. Primer negocio objetivo: **Nova Solar
Durango** (`slug = nova-solar`, datos de `db/seed-nova-solar.mjs`).

Preguntas que la v1 tiene que contestar bien (úsalas como pruebas):

1. "¿Qué cotizaciones están enviadas y vencen esta semana?"
2. "¿Cuánto llevo cotizado este mes y cuánto me aceptaron?"
3. "¿Qué reuniones tengo mañana y con quién?"
4. "¿Cuántas reuniones terminaron en 'perdido' y por qué?" (lee `outcome_notes`)
5. "¿Quién se quejó del precio?" → RAG sobre notas, no SQL
6. "Dame el teléfono de Roberto Gálvez"
7. "Borra la cotización 12" → debe negarse (solo lectura)

## Arquitectura

```
UI (chat, client component)
  → POST /t/[slug]/dashboard/copiloto/api   (route handler, server)
      1. auth: supabase.auth.getUser() + verificar membresía en business_users
      2. loop del agente (Claude, tool use, máx. 6 pasos)
           tool consultar_sql(sql)       → lib/copiloto/frontera.ts
           tool buscar_en_notas(texto)   → lib/copiloto/notas.ts
      3. respuesta en streaming + lista de tools usadas (para mostrarlas)
```

Modelo: `claude-haiku-5-5` vía `@anthropic-ai/sdk` (tool use nativo). El id
va en **una** constante en `lib/copiloto/modelo.ts` para cambiarlo fácil.
Llave: `ANTHROPIC_API_KEY` (server-only; Bruno la tiene como variable de
entorno de Windows; documentarla en `.env.example`).

## La frontera (lo más importante — construir y probar PRIMERO)

`lib/copiloto/frontera.ts` exporta `ejecutarConsulta(userId, sql)`.
Corre con una conexión **directa** a Postgres (paquete `postgres`,
`DATABASE_URL` = connection string del pooler de Supabase en modo
*session*; Bruno la pega él en `.env.local`, nunca en código ni chat).
supabase-js no sirve aquí: no permite `set local role` en una transacción.

Cada llamada:

1. `begin transaction read only` — el motor rechaza escrituras.
2. `set local role authenticated` — **nunca** `service_role` ni `postgres`.
3. `select set_config('request.jwt.claims', $1, true)` con
   `{"sub": userId, "role": "authenticated"}` → `auth.uid()` devuelve al
   dueño y el RLS existente (`private.is_member_of_tenant`) aísla el negocio.
4. `set local statement_timeout = '3s'`.
5. Validar antes de mandar: una sola sentencia, empieza con `select` o
   `with`, sin `;` intermedio. (Defensa extra; las capas 1–3 son las que
   garantizan.)
6. Envolver: `select * from (<sql>) q limit 200`.
7. `rollback` siempre, haya error o no.

Errores de SQL se le regresan **al modelo** como texto (para que corrija su
consulta, máx. 2 reintentos), nunca el stack al usuario.

### Tests obligatorios de la frontera (vitest, contra la base real de dev)

- `delete from quotes` → falla (read only).
- `select * from quotes` con el usuario de Nova Solar → solo filas de Nova Solar.
- Mismo `select` con un usuario de otro tenant (seed-demo-tenants) → cero
  filas de Nova Solar.
- `select pg_sleep(10)` → corta por timeout.
- `select 1; drop table quotes` → rechazado por el validador.
- `set role service_role` / `reset role` dentro del SQL → rechazado.

### Verificar RLS antes de exponer tablas

`customers` tiene el comentario "only via service_role". Confirmar en
`db/002_rls_policies.sql` y migraciones posteriores qué tablas tienen
política `select` para miembros. **Solo esas** entran al esquema que ve el
modelo. Si una tabla necesaria (p. ej. `customers`) no tiene política para
miembros, NO usar service_role: proponer a Bruno la migración y anotarla en
la bitácora. Las migraciones las corre Bruno en el SQL Editor.

## Esquema que ve el modelo

Un prompt de sistema con una descripción **curada a mano** (no un dump) de:
`contacts`, `quotes`, `quote_items`, `bookings` (con `kind`, `outcome`,
`outcome_notes`, `company`, `modality`), `service_types`, `customers`.
Incluir: significado de cada `status`/`outcome`, que el dinero está en
**centavos** (`*_cents`, dividir entre 100), que las fechas son
`timestamptz` y el negocio está en `America/Mexico_City` (ver
`lib/dates/tenantTime.ts`), y que NO hace falta filtrar por `tenant_id`
(el RLS lo hace) pero tampoco estorba.

## RAG: `buscar_en_notas`

Texto libre que SQL no sabe buscar por significado: `contacts.notes`,
`quotes.notes`, `bookings.outcome_notes`.

v1 sencilla y honesta: reutilizar el embedder que ya usa
`db/026_service_embeddings.sql` (`paraphrase-multilingual-MiniLM-L12-v2`,
384 dims, calculado en el server de Next — localizar dónde vive ese código y
reutilizarlo, no duplicarlo). Embeddings calculados al vuelo sobre las notas
del tenant (son decenas, no miles) leídas **a través de la frontera**, y
top-5 por coseno. Sin tabla nueva en v1; si se vuelve lento, se anota y se
migra.

## Seguridad del contenido (bitácora, punto 4)

Los datos son entrada hostil: una nota puede decir "ignora tus
instrucciones". Los resultados de tools van marcados como datos
(`<datos>…</datos>`) y el prompt de sistema dice que su contenido nunca son
instrucciones. El copiloto no tiene ninguna tool que escriba ni que mande
mensajes, así que el peor caso de una inyección es una respuesta rara, no
una acción.

## UI

- Item "Copiloto" en `Sidebar.tsx` (icono `Sparkles` de lucide), visible
  para Nova Solar; detrás de una bandera por tenant como los demás productos
  (seguir el patrón de `requiresQuotes` / `lib/products.ts`).
- Chat sencillo con los colores de marca del tenant (ya vienen como CSS vars
  del layout). Debajo de cada respuesta, plegable: "Consultó: `select …`" /
  "Buscó en notas: …". Eso es lo que se ve en el video del post.
- 3 preguntas sugeridas como chips al estar vacío.
- Montos formateados en MXN, fechas en español.
- Nada genérico: seguir el lenguaje visual del panel, no una burbuja de
  chat de plantilla.

## Fuera de alcance v1

Escribir datos, mandar WhatsApp/correos, memoria entre sesiones, otros
tenants además de Nova Solar, deploy (Bruno: "no despliegues").

## Al terminar

1. Tests de la frontera en verde (`npm test`).
2. Probar las 7 preguntas en vivo con el dev server y la sesión del dueño
   de Nova Solar (Bruno inicia sesión él; nunca teclear contraseñas).
3. Anotar en `README.md` (bitácora) cada decisión nueva con alternativa
   descartada y porqué.
4. No commitear sin que Bruno lo pida.
