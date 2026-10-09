-- ============================================================
-- 030 · La pregunta del paso de recurso, escrita por el negocio
--
-- db/024 agregó `resource_label` ("Cabina", "Cancha", "Estilista") y el
-- flujo arma la pregunta con él: «¿Qué cabina prefieres?». Eso resuelve
-- el caso de las COSAS, pero no todos:
--
--   · Con personas, «¿Con quién prefieres reservar?» se lee mucho mejor
--     que «¿Qué estilista prefieres?», y el sustantivo correcto no basta
--     para decidirlo: el código no sabe si "Guía" es alguien o algo.
--   · El género y la preposición cambian con el giro. Un club de pádel
--     dice «¿En qué cancha quieres jugar?», no «¿Qué cancha prefieres?».
--   · Hay negocios que simplemente tienen su forma de decirlo.
--
-- Derivar la frase de un sustantivo es adivinar gramática ajena. Esta
-- columna deja que el negocio la escriba tal cual, y queda NULL para
-- todos los que ya están: sin ella, el comportamiento es exactamente el
-- de hoy.
-- ============================================================

alter table tenants
  add column if not exists resource_question text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_resource_question_len'
  ) then
    alter table tenants add constraint tenants_resource_question_len
      check (resource_question is null or length(resource_question) between 1 and 120);
  end if;
end $$;

comment on column tenants.resource_question is
  'La pregunta exacta del paso "con quién / dónde" en la página de reservas. NULL = se arma a partir de resource_label, y sin label se usa "¿Con quién prefieres reservar?".';
