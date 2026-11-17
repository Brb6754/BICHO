# UX del panel del dueño — auditoría, reglas y plan (fase 1)

Noviembre 2026. Objetivo de Bruno: que ninguna dueña de salón, barbería o
consultorio en Durango rechace bicho "por complicado". Ella usa el
celular, tiene poco tiempo entre clientas y desconfía de los "sistemas".

Este documento tiene tres partes:
1. **Auditoría** vista por vista, con prioridad.
2. **Reglas del panel**: lo que toda pantalla debe cumplir. Son verificables.
3. **Plan de la fase 2**: tres grupos en paralelo, cada uno con sus archivos.

Al final está el **inventario de cimientos** (fase 1, ya en `master`).

---

## 0. Cómo se auditó

- La demo pública (`/t/casa-luma/panel/*`) se recorrió en un worktree con
  `next dev --webpack`, a 375 px (teléfono), 820 px (tablet) y 1280 px.
- Las vistas que solo existen detrás del login se revisaron leyendo el
  código: encabezado, formularios, estados vacíos, confirmaciones y textos
  visibles. Las marcadas **(código)** no se vieron en un navegador.
- Referencias del skill `impeccable`: critique (heurísticas de Nielsen y
  carga cognitiva), onboard, clarify y distill. Se corrió en un solo hilo,
  sin los dos subagentes que pide critique. El detector automático no
  encontró nada en `app/t/[slug]/dashboard` ni en `components/tenant-dash`.
- Prioridades:
  - **P0**: por esto nos rechazan, porque ella no puede terminar la tarea o deja de confiar.
  - **P1**: confunde o cuesta trabajo de más; ella lo resuelve, pero de mala gana.
  - **P2**: pulido.

---

## 1. Auditoría

### 1.1 Hallazgos que cruzan todo el panel

| # | P | Hallazgo | Estado |
|---|---|---|---|
| G1 | **P0** | Cualquier error de una server action (validación incluida: "Falta el nombre del servicio") sube a `error.tsx`. La página entera se vuelve "Algo salió mal" y **se pierde lo que escribió**. En producción Next además cambia el mensaje por uno genérico **en inglés** ("An error occurred in the Server Components render…"). | `error.tsx` ya muestra el aviso en español. Falta pasar cada formulario a `ActionForm`: **tarea de la fase 2**. |
| G2 | **P0** | Ninguna acción confirma que se guardó. Al agregar un servicio o un horario solo "aparece" la fila; el interruptor de activo no dice nada. Para alguien que desconfía, sin "listo" no pasó nada. | Ya existen el `Toaster` (montado) y `ActionForm`. Migrar los formularios es **fase 2**. |
| G3 | **P0** | Arranque sin guía. El inicio solo enseñaba 3 pasos cuando faltaba algo, en este orden: servicio → quién atiende → horario. Nunca llevaba a compartir el link ni a la primera cita, que es donde se ve el valor. | **Hecho**: `PrimerosPasos` ("Tu agenda en 5 minutos"). |
| G4 | **P0** | En tablet (768–1023 px) salían a la vez las barras del teléfono y el tablero de escritorio: el inicio cambiaba en `md` y el menú en `lg`. | **Hecho**: el inicio también cambia en `lg`. |
| G5 | P1 | Compartir el link, la acción #1 de valor, estaba al fondo del inicio en el teléfono, debajo de toda la cuadrícula. No había opción de WhatsApp. | **Hecho**: botón "Compartir mi link" en la barra de arriba del teléfono, bloque "Tu link de reservas" (Copiar / WhatsApp) en el menú de escritorio y botones en el inicio. |
| G6 | P1 | Menú agrupado como "Dinero / Clientes / Tu negocio". Servicios, Horario y Quién atiende quedaban en "Tu negocio" y Reuniones sin grupo. "Mi plan" solo se alcanzaba en el estilo Suave. Boost salía con candado en medio de lo que sí tiene. | **Hecho**: Agenda / Clientes / Dinero / Crecer / Ajustes. "Mi plan" entra a Ajustes. Lo que el plan no incluye va al final, plegado, con candado. |
| G7 | P1 | Botones de menos de 44 px en el teléfono: borrar servicio o quién atiende (`h-8`, 32 px), quitar un rango de horario (`h-6`, 24 px), algunas pastillas. | Fase 2, grupo A. `Button` ya mide 44 px en teléfono desde la base. |
| G8 | P1 | En "Cancelar cita" el modal muestra **"Cancelar"** junto a **"Cancelar cita"**: la salida segura y la destructiva dicen casi lo mismo. Falta `dismissLabel`. | Fase 2, grupo A. |
| G9 | P1 | El placeholder hace de etiqueta: en Quién atiende la etiqueta es `sr-only` y solo se ve "Ej. Renata, Silla 2…". Las etiquetas visibles son de 12 px y gris tenue. | `FormField` ya existe. Aplicarlo es fase 2. |
| G10 | P1 | Jerga a la vista: "Borrar recurso", "Timbrar", "CFDI", "Uso del CFDI", "Régimen fiscal", "ISR", "RESICO", "Boost", "Sin timbrar". | Glosario en §2.1. Cada grupo aplica el suyo. |
| G11 | P2 | Los botones principales no son iguales entre sí: Cotizaciones y Facturas usan degradado `from-primary to-secondary` y el resto usa primario plano. | Fase 2, grupo B. |
| G12 | P2 | Demo: el selector de estilos flotante tapa el final de cada página en el teléfono. La agenda de la demo empieza con días pasados, cuando la real empieza hoy. Una estilista tiene 21 citas y las otras dos 0, y eso delata la demo. Inventario dice "(2 tubo)" en vez de "(2 tubos)". Lealtad tiene campos editables en una demo "solo lectura". | Fase 2, en el grupo de cada vista. |
| G13 | P2 | Solo en local (`/t/casa-luma/panel`): la pestaña activa no se marca y "Más" sale siempre activo, porque `pathname` incluye `/t/{slug}`. En el subdominio de producción sí funciona. | No se toca. |

### 1.2 Grupo A — Agenda

| Vista | ¿Se entiende en 3 s? | Acción principal | Hallazgos |
|---|---|---|---|
| **Inicio** (`dashboard/page.tsx`, `ResumenHoy`, `resumen/*`) | Sí: "Buenas noches + tus citas de hoy". | Antes ninguna; ahora "Compartir mi link" y los primeros pasos. | P0 G3 y G4 (hechos). P1: la cuadrícula del teléfono pone en el mismo plano Agenda y Guía RESICO; ordenar por uso (hoy sigue el orden de `TILES`). P2: la tarjeta de "hoy" dice "Comparte tu página para recibir citas" sin botón para hacerlo. |
| **Agenda** (`calendar`) | Sí. | "Nueva cita" (modal). | P1 G8. P1: cada renglón muestra Mover/Cancelar o Asistió/No vino, sin explicar qué pasa al marcar "no vino". P2: el subtítulo es un conteo; debería decir para qué sirve. Tarea frecuente "ver lo de hoy": 1 toque. |
| **Servicios** (`services`) | Sí. | El formulario de agregar está siempre abierto arriba, con 3 campos y 2 casillas largas. | P0 G1/G2: un nombre vacío tira la página. P1: casillas con explicación entre paréntesis ("desmárcalo para una pista o un espacio"). Mejor un default y una ayuda (`HelpTip`). P1 G7 (borrar, 32 px). P1: el precio arranca en 0 y la lista dice "Sin costo". Debería pedir precio o dejar elegir "sin precio público". Estado vacío: solo texto, sin ejemplo. |
| **Quién atiende** (`resources`) | Más o menos: el subtítulo mezcla "personas, sillas, consultorios o pistas". | Campo único "Agregar". | P1 G9 (placeholder como etiqueta). P2 G10 ("Borrar recurso"). P1: la lista de "qué servicios da" bajo cada persona no se explica; sin filas hace de todo, y nadie lo sabe. La demo titula "Estilista" en singular. |
| **Horario** (`schedule`) | Sí. | Formulario Quién/Desde/Hasta/Días. | P0 G1/G2. P1 G7 (quitar rango, 24 px). P1: los bloqueos (vacaciones) viven al fondo de la misma página sin separación clara. P2: "Todos" en el selector es el default correcto, pero no se ve como tal. |
| **Clientes** (`customers`, `customers/[id]`) | Sí: secciones por estado de la relación. | Ninguna (es para consultar). | P1: en el teléfono el renglón corta el teléfono y "última…" en una sola línea truncada. P2: "Frecuente" con 2 visitas suena inflado. P2: la ficha dice "Sin timbrar" (jerga). |

### 1.3 Grupo B — Dinero

| Vista | ¿Se entiende en 3 s? | Acción principal | Hallazgos |
|---|---|---|---|
| **Caja** (`caja`, `CajaBoard`) | Sí: "Te quedó $9,755". | Registrar gasto / corte de caja. | P1: "Corte de caja" mezcla el campo "con qué abriste (cambio)" con el resumen; confunde a quien no hace cortes. P1: la comparación "156% más que ayer" con días chicos asusta o miente; poner el monto. P0 G2 al guardar un gasto. |
| **Comisiones** | Sí. | Marcar pagado. | P1: Semana/Quincena/Mes/Rango sin default explicado. "Falta pagar $140. El periodo todavía no termina…" es largo. P2: renglones de personas en $0 sin atenuar. |
| **Inventario** | Sí. | Agregar producto / ajustar existencia. | P2: plural "(2 tubo)". P1: "Mínimo 3 · Costo $140" son números sin unidad clara; "Avisarme cuando queden 3". |
| **Facturas** (código) | No: "Los CFDI emitidos desde bicho. El SAT es la copia buena". | "Nueva factura" (solo si está conectado). | P1 G10: CFDI, Timbrar, Régimen fiscal, Uso del CFDI. Las etiquetas del formulario fiscal necesitan `HelpTip` con ejemplos. P1 G11 (degradado). Estado "Todavía no puedes emitir" sin un paso a paso. |
| **Guía RESICO** | Regular: el título es una sigla. | Calculadora. | P1: título → "Impuestos (RESICO)" o "¿Cuánto pagaría de impuestos?". P2: muro de texto; plegar por pregunta. |
| **Cotizaciones** (código) | Sí. | "Nueva cotización". | P1 G11. P2: "si necesita CFDI, se lo timbras aparte". |
| **Reuniones** (código) | Sí. | Nueva reunión. | P1: el embudo usa "interesado/cotizado/ganado/perdido" sin una línea de qué hacer. P2: "Tipos de reunión" es una pantalla aparte a la que solo se llega con un enlace. |

### 1.4 Grupo C — Crecer y ajustes

| Vista | ¿Se entiende en 3 s? | Acción principal | Hallazgos |
|---|---|---|---|
| **Clientes que regresan** | Sí. | "Escribirle" por clienta. | Bien resuelta. P2: "Hace 7 semanas · Bala…" truncado. |
| **Lealtad** | Regular: abre con un formulario de configuración y no con las tarjetas. | Configurar sellos. | P1: el orden debe ser 1) cómo va tu tarjeta / quién está cerca del premio, 2) configurar. P2 G12 (editable en la demo). |
| **Boost de clientes** | No: "Boost" es jerga; el subtítulo sí lo explica. | Prender lista VIP / horas flojas. | P1 G10: el título humano sería "Llena tus huecos". P1: la página abre con métricas ("Mensajes usados 5/300") antes de decir qué hace. |
| **Posts con IA** | Sí. | Generar post. | P2: chips "Un servicio / Promoción / Horarios libres / Fecha especial / Tema libre" en dos filas; está bien. "Diseño" (plantilla) sin vista previa. |
| **WhatsApp** | Sí: "Recepcionista de WhatsApp". | Prender recepcionista. | P1: "Cotiza, cobra y factura por WhatsApp" en la misma página la vuelve larguísima; separar con pestañas o anclas. P1 G10 (Timbrar, Uso CFDI, Régimen). |
| **Copiloto** (código) | Sí: "Pregúntale a tu negocio". | Escribir pregunta. | P2: la acción del encabezado "Documentos" es un enlace de texto, no un botón. Faltan preguntas de ejemplo como estado vacío. |
| **Mi marca** (código) | Sí. | Guardar. | P0 G2 (sin "Guardado"). P1: la elección de estilo del panel vive aquí junto a logo y colores; está bien, pero sin vista previa del cambio. |
| **Mi plan** (código) | Sí. | Activar / cambiar plan. | P1: antes no tenía entrada en el menú (ya la tiene). |
| **Gana meses gratis** (Referidos, código) | Sí. | Copiar link de referido. | P2: el estado vacío solo dice "Aún nadie se registra con tu link". |

---

## 2. Reglas del panel

Toda pantalla nueva o rediseñada las cumple. Cada regla se puede revisar
con un sí o un no.

### 2.1 Vocabulario: palabras de ella, no del sistema

| Prohibido en pantalla | Se dice |
|---|---|
| recurso, resource | quién atiende (persona) · lugar (silla, cabina, consultorio) |
| tenant, negocio_id, slug | tu negocio · tu link |
| booking, reserva (como sustantivo técnico) | cita |
| servicio_tipo, catálogo | servicios |
| slot, hueco disponible | horario libre · hora libre |
| inactivo / activo (interruptor) | se ofrece en tu página / oculto de tu página |
| CFDI | factura (y "factura del SAT" cuando haga falta) |
| timbrar, timbrado, timbre | hacer la factura · factura hecha |
| uso del CFDI | ¿para qué la usa tu cliente? (con `HelpTip` y ejemplos) |
| régimen fiscal | tipo de contribuyente (con `HelpTip`) |
| RFC (sin explicar) | RFC + `HelpTip` "la clave del SAT de quien recibe la factura" |
| ISR, IVA (sin explicar) | impuesto sobre lo que ganas · IVA, con `HelpTip` |
| RESICO (como título) | Impuestos (RESICO) |
| churn, inactivas, retención | clientas que no han vuelto |
| embudo, pipeline, lead | en qué quedó · prospecto |
| Boost (como título) | Llena tus huecos (Boost puede quedar de apellido) |
| add-on, módulo, feature | (el nombre de la función) · "con otro plan" |
| plantilla, template | diseño |
| token, webhook, API | nunca en el panel del dueño |
| error 23P01, 42703, cualquier código | qué pasó y qué hacer, en una frase |

Además:
- El nombre en el menú **es exactamente** el título de la página.
- Femenino genérico donde el giro lo pide ("clientas") solo si ya se usa
  en esa sección. No se mezcla en una misma pantalla.
- Números con unidad: "45 min", "$450", "quedan 3".

### 2.2 Anatomía de una página

Siempre `PageHeader` (`components/tenant-dash/PageHeader.tsx`):

1. **Título humano**: 1 a 3 palabras, el mismo del menú.
2. **Una frase de para qué le sirve** (`description`): máximo unos 90
   caracteres. Beneficio, no función ("Cuánto vendiste y cuánto te quedó",
   no "Registro de movimientos").
3. **Una sola acción principal** (`action`). Botón primario plano
   (`bg-primary`, sin degradado). En el teléfono se estira a lo ancho.
4. Secundarias (`actions`): contorno o texto, nunca otro primario.
5. Ayuda opcional (`help`): un `HelpTip` junto al título si la sección
   tiene un concepto nuevo para ella.

Debajo: primero lo que ella viene a ver o hacer hoy, luego la
configuración. La configuración que se toca una vez va plegada o al final.

### 2.3 Estados vacíos

Usar `EmptyState` (`components/ui/EmptyState.tsx`) con:
- `title`: qué va a aparecer aquí ("Todavía no tienes servicios").
- `description`: qué es, en una frase.
- `why`: por qué le sirve ("Sin al menos uno, tu página no puede ofrecer citas").
- `action`: botón que lleva a hacerlo. Si el formulario está en la misma
  página, que haga foco en él.
- `example` (opcional): "Ver un ejemplo" que lleve a la vista de la demo.

Hay que distinguir **primera vez** (enseña), **sin resultados** (ofrece
quitar el filtro) y **error** (qué pasó + Reintentar). Prohibido el
"No hay datos" pelón.

### 2.4 Formularios

- Etiqueta siempre visible con `FormField`. El placeholder es un ejemplo, nunca la etiqueta.
- Solo los campos sin los que no se puede guardar. Lo demás va en "Más
  opciones" plegado o en la ficha del elemento.
- Default inteligente en todo lo que se pueda: duración 30, horario
  9–18 L–V, "Todos" en quién atiende, precio vacío (no 0).
- Validación en el navegador (`required`, `min`, `type`) y en el servidor.
  El error se dice **junto al campo o en el aviso**, sin borrar lo escrito
  (`ActionForm`).
- Mensaje de error = qué pasó + cómo arreglarlo: "Pon cuántos minutos
  dura, por ejemplo 45". Nunca culpa ni código.
- El botón de enviar dice el resultado ("Agregar servicio"), no
  "Enviar". Mientras corre: `SubmitButton` ("Guardando…").

### 2.5 Feedback y confirmaciones

- **Toda acción que escribe avisa** con `toast()` o con `ActionForm success="…"`,
  en pasado y con el objeto: "Servicio agregado", "Horario guardado", "Cita
  cancelada". Errores con `toast(msg, 'error')`.
- Acciones destructivas con `ConfirmForm`, nombrando el objeto y la
  consecuencia en el mensaje. Los dos botones dicen cosas distintas:
  `confirmLabel="Borrar servicio"` y `dismissLabel="No, conservarlo"`.
  Prohibido "Cancelar" junto a "Cancelar cita".
- Si existe una salida reversible (apagar en vez de borrar), el mensaje la ofrece.

### 2.6 Teléfono

- Todo lo que se toca mide **≥ 44×44 px** (`min-h-[2.75rem]`, `h-11 w-11`).
- Nada que dependa de hover: ni tooltips, ni acciones que solo aparecen
  al pasar el mouse. Ayuda = `HelpTip` (toque).
- Nada cortado: textos largos con `truncate` y el dato completo en la ficha, o en dos líneas.
- Sin scroll horizontal a 375 px. Tablas → listas de renglones.
- El contenido no queda debajo de la barra inferior: el layout ya reserva
  `pb-[calc(7rem+safe-area)]`. No poner elementos `fixed bottom-0` propios
  sin sumar ese espacio.
- Breakpoint del panel: **`lg` (1024 px)** separa teléfono/tablet de
  escritorio. No se usa `md` para cambiar de layout móvil a escritorio.

### 2.7 Ayuda contextual

- `HelpTip` para conceptos (¿qué es el horario?, ¿qué es el RFC?): título
  en pregunta, 1 a 3 frases, ejemplo concreto del giro.
- Un `HelpTip` por concepto nuevo y por pantalla, no en cada campo.
- La guía de arranque es `PrimerosPasos`; no se hacen tours ni modales de bienvenida.

### 2.8 Accesibilidad (piso)

- Foco visible: `focus-visible:ring-2 focus-visible:ring-primary/40` en todo lo interactivo.
- Contraste AA. Ojo con `text-muted` sobre `bg-surface` en textos de 12 px:
  usar 13 px como mínimo para información.
- Íconos sin texto con `aria-label`. Decorativos con `aria-hidden`.
- Animaciones con `motion-reduce:transition-none` o `.animate-fade-in`, que ya respeta `prefers-reduced-motion`.
- Colores del negocio solo por tokens (`bg-primary`, `--color-cta-fg`).
  Nunca hex de marca fijos. Funciona en los 4 estilos (`data-estilo`).

---

## 3. Plan de la fase 2: tres grupos en paralelo

Regla de oro: **cada grupo toca solo sus archivos.** Lo compartido es de
solo lectura. Si un grupo necesita cambiar algo compartido, lo anota al
final de este archivo, en "Pedidos a cimientos", y no lo edita.

### Compartido (nadie lo edita en la fase 2)

- `app/t/[slug]/dashboard/layout.tsx`, `app/t/[slug]/panel/layout.tsx`
- `app/t/[slug]/dashboard/Sidebar.tsx`, `error.tsx`, `loading.tsx`
- `components/tenant-dash/ui/*` (Toast, ActionForm, FormField, HelpTip, ShareLink, PrimerosPasos)
- `components/tenant-dash/PageHeader.tsx`, `components/ui/*`
- `app/globals.css`, `tailwind.config.ts`, `lib/branding/*`, `lib/products.ts`
- `lib/demo/panelData.ts` (los tres lo leen)
- Server actions (`actions.ts`): solo se tocan para devolver mensajes en
  español o validar mejor, **sin cambiar lógica, permisos ni queries**.

### Grupo A — Agenda (inicio, agenda, servicios, quién atiende, horario, clientes)

Puede tocar:
- `app/t/[slug]/dashboard/page.tsx`, `ResumenCotizaciones.tsx`
- `app/t/[slug]/dashboard/{calendar,services,resources,schedule,customers}/**`
- `components/tenant-dash/{ResumenHoy,AgendaList,ContactDirectory,ItemList,SlotPicker,BlocksSection,CopyLinkButton}.tsx`
- `components/tenant-dash/resumen/**` (los 4 estilos + InicioMovil)
- `app/t/[slug]/panel/{page,calendar,services,resources,schedule,customers}/page.tsx`
- `app/plataforma/panel/{page,calendar,services,resources}/**`, solo si cambia la API de `ItemList` o `AgendaList`. Mejor mantenerla compatible.

Prioridades: G1/G2 en servicios, quién atiende y horario (pasar a
`ActionForm` + `FormField`); G7 (44 px); G8; estados vacíos con
`EmptyState`; ayuda en "qué servicios da cada quien" y en bloqueos; agenda
de la demo desde hoy; cuadrícula del inicio por uso. `SlotPicker` es de A:
B lo usa en Reuniones sin cambiarle la API.

### Grupo B — Dinero (caja, comisiones, inventario, facturas, RESICO, cotizaciones, reuniones)

Puede tocar:
- `app/t/[slug]/dashboard/{caja,comisiones,inventario,facturas,resico,cotizaciones,reuniones}/**`
- `components/tenant-dash/{CajaBoard,ComisionesBoard,InventarioBoard,AvisoInventario,ResicoGuia,ReunionesBoard}.tsx`
- `app/t/[slug]/panel/{caja,comisiones,inventario,resico}/page.tsx`
- `lib/inventario/demo.ts`, `lib/caja/demo.ts` (solo textos o datos de ejemplo)

Prioridades: vocabulario fiscal (§2.1) con `HelpTip` en RFC, régimen y
uso; G11 (botón primario plano); corte de caja más claro; comparaciones
en monto; plural de unidades; "Guía RESICO" → "Impuestos (RESICO)" (y avisar
a cimientos para cambiar la etiqueta en el menú y en `TILES`).

### Grupo C — Crecer (regresan, lealtad, boost, referidos, posts, WhatsApp, copiloto, marca, plan)

Puede tocar:
- `app/t/[slug]/dashboard/{regresan,lealtad,boost,referidos,posts,whatsapp,copiloto,marca,plan}/**`
- `components/tenant-dash/{RegresanBoard,LealtadVista,BoostVista,PostsVista,CopilotoChat,DocumentosCopiloto,EstiloDemo,TrialBanner}.tsx`
- `app/t/[slug]/panel/{regresan,lealtad,boost,posts,whatsapp}/page.tsx`
- `lib/demo/regresanFixtures.ts` (solo textos o datos de ejemplo)

Prioridades: Boost → "Llena tus huecos" (explicar antes de mostrar
métricas); Lealtad con las tarjetas primero; WhatsApp separado en
recepcionista / cotiza; "Guardado" en Mi marca; preguntas de ejemplo en
Copiloto; estado vacío de Referidos con el mensaje para mandar.

**Cambios de nombre en el menú**: los define cada grupo en su página
(título) y los pide en "Pedidos a cimientos" para `Sidebar.tsx` y
`lib/branding/moduloColores.ts` (`TILES`). Así título, menú y cuadrícula
nunca difieren.

### Cómo verifica cada grupo

- `npx tsc --noEmit` y `npx vitest run lib app components --exclude ".claude/**"`.
- Una pasada visual a 375 y 1280 px de cada vista suya (demo o ruta QA
  temporal, borrada al terminar), en al menos 2 estilos de panel.
- Checklist §2 por pantalla.

---

## 4. Cimientos construidos en la fase 1

| Pieza | Archivo | Uso |
|---|---|---|
| `toast()` + `<Toaster/>` | `components/tenant-dash/ui/Toast.tsx` | Ya montado en los layouts de `dashboard` y `panel`. `toast('Servicio agregado')`, `toast('No se pudo', 'error')`. En el teléfono sale bajo la barra de arriba; en escritorio, abajo al centro. Región `aria-live`. |
| `ActionForm`, `SubmitButton` | `components/tenant-dash/ui/ActionForm.tsx` | `<ActionForm action={crear.bind(null, slug)} success="Servicio agregado">…<SubmitButton>Agregar</SubmitButton></ActionForm>`. Atrapa el error y lo avisa sin tirar la página, conserva lo escrito y deja pasar `redirect()`. |
| `FormField` | `components/tenant-dash/ui/FormField.tsx` | Etiqueta visible, ayuda y error, amarrados con `aria-describedby` y `aria-invalid`. |
| `HelpTip` | `components/tenant-dash/ui/HelpTip.tsx` | "¿Qué es esto?" por toque, con `popover` nativo (Esc, tocar afuera, foco). En el teléfono es una hoja abajo. Funciona en server components. |
| `PageHeader` (ampliado) | `components/tenant-dash/PageHeader.tsx` | Nuevos `help` y `actions`. La acción principal se estira en el teléfono. Compatible con lo existente. |
| `EmptyState` (ampliado) | `components/ui/EmptyState.tsx` | Nuevos `why` y `example`. Compatible. |
| `ShareLink`, `ShareLinkCompact` | `components/tenant-dash/ui/ShareLink.tsx` | Copiar link + mandar por WhatsApp (`wa.me` con mensaje listo). La versión compacta usa la hoja de compartir del sistema. Deja la seña "link compartido" para los primeros pasos. |
| `PrimerosPasos` | `components/tenant-dash/ui/PrimerosPasos.tsx` | "Tu agenda en 5 minutos": servicios → quién atiende → horario → compartir link → primera cita. Estado real (lo cuenta `dashboard/page.tsx`). Se puede ocultar, pero si la página aún no recibe citas queda un aviso de una línea. |
| `ConfirmForm` | `components/ui/ConfirmForm.tsx` | El patrón de confirmación. Usar siempre `dismissLabel`, y `success` en el panel para el toast. |
| Menú por intención | `app/t/[slug]/dashboard/Sidebar.tsx` | Agenda / Clientes / Dinero / Crecer / Ajustes. "Mi plan" en Ajustes. Lo que el plan no incluye va al final, plegado, con candado (`bloqueados`, misma cuenta que `tilesDe`). Link de reservas siempre a la mano. |
| Tablet | `ResumenHoy.tsx`, `resumen/InicioMovil.tsx` | El inicio cambia de teléfono a escritorio en `lg`, igual que el menú. |
| Error en español | `app/t/[slug]/dashboard/error.tsx` | Nunca enseña el genérico en inglés de producción. |

Decisión anotada: el pedido decía "servicios → horario → quién atiende".
Se invirtió a "quién atiende → horario" porque la pantalla de horario
exige tener a alguien dado de alta. Con el orden pedido, el paso 2 la
mandaba a una pantalla que dice "Primero agrega quién atiende".

---

## Pedidos a cimientos

(Los grupos de la fase 2 anotan aquí lo que necesitan cambiar en archivos compartidos.)

**Estado (17 nov 2026):** cimientos atendió todo. Solo quedan dos decisiones de Bruno: el texto de Esencial en `lib/billing/planes.ts` (grupo C, 2) y el número de `WHATSAPP_CONTACTO` (grupo C, 4).

### Grupo A (Agenda)

1. **P0 — `ActionForm` borra lo escrito cuando la action falla** (`components/tenant-dash/ui/ActionForm.tsx`).
   El envoltorio atrapa el error, así que React 19 ve la action como exitosa y
   resetea el formulario. Probado en el navegador: se escribe "Corte", la action
   avienta "Pon cuántos minutos dura…", el toast sale bien y el campo queda vacío.
   Arreglo sugerido: guardar el `FormData` y, en el `catch`, volver a poner los
   valores en `form.elements` (o usar `onSubmit` + `startTransition` en vez de
   `action`). Mientras tanto, los formularios del grupo A validan en el navegador
   (`required`, `min`) para que el caso común no llegue al servidor.
   **Resuelto (cimientos):** `ActionForm` envía con `onSubmit` + `useTransition` en vez de `<form action>`, y solo pide `requestFormReset` cuando la action salió bien. `SubmitButton` sigue diciendo "Guardando…" (contexto propio, con `useFormStatus` de respaldo). Test en `ActionForm.test.ts`.
2. **`ConfirmForm` con `success`** (`components/ui/ConfirmForm.tsx`): que avise con
   toast y atrape el error como `ActionForm`. Hoy lo hace
   `components/tenant-dash/AccionesFila.tsx` (`ConfirmarConAviso`, archivo nuevo del
   grupo A); con el cambio se borra.
   **Resuelto:** `ConfirmForm` acepta `success` (toast + atrapa el error con `correrConAviso`). Sin `success` se porta igual que antes (fuera del panel no hay `<Toaster/>`). `ConfirmarConAviso` se borró y sus 5 usos pasan a `ConfirmForm success=…`.
3. **`Button` mide 40 px de alto** (`py-2.5 text-sm`). Pedido: `min-h-[2.75rem]`
   en la base. El grupo A lo pone a mano en sus botones.
   **Resuelto:** `Button` trae `min-h-11 lg:min-h-0`: 44 px en teléfono y tablet, 40 px en escritorio como antes.
4. **`Modal`**: el botón de cerrar mide 24 px (`p-1`) y el diálogo no hace scroll.
   En el teléfono, "Mover la cita" (con la lista de horas) puede quedar más alto
   que la pantalla. Pedido: `max-h-[90dvh] overflow-y-auto`, hoja abajo en `< sm`
   y cerrar en `h-11 w-11`.
   **Resuelto:** `Modal` con `max-h-[90dvh]`; el cuerpo hace scroll y el título con "cerrar" (`h-11 w-11`) quedan fijos. Debajo de `sm` es hoja abajo (esquinas solo arriba, respeta safe-area).
5. **`FormField` / `Label`**: la etiqueta sale en `text-xs text-muted` y el
   `text-[13px]` que agrega FormField no gana de forma confiable (la trampa de
   className de CLAUDE.md). Pedido: prop o variante con 13 px y `text-ink`.
   **Resuelto:** `Label` mide 13 px en todas partes y gana la prop `tone` (`muted` | `ink`). `FormField` usa `tone="ink"`.
6. **Demo (`lib/demo/panelFixtures.ts`)**: el teléfono no va amarrado al nombre
   (`NOMBRES[(base+n*5)%…]` y `TELEFONOS[(base+n)%…]`), así que dos clientas
   distintas comparten número; además casi todas las citas caen con la misma
   estilista (G12). La demo de Clientes agrupa por nombre para no fusionarlas.
   Pedido: teléfono derivado del nombre y repartir las citas entre quienes atienden.
   **Resuelto:** cada nombre tiene su propio teléfono (mismo índice) y las citas van de una en una entre quienes atienden (`n*3` con 3 personas caía siempre en la misma).
7. **Menú del teléfono**: la barra de abajo dice "Citas" y la página se llama
   "Agenda" (§2.1: menú = título). Pedido: "Agenda" en `BOTTOM_LABEL` de `Sidebar.tsx`.
   **Resuelto:** la barra de abajo usa el nombre del menú, "Agenda" (el alias "Citas" se quitó).
8. Los atajos del inicio usan `?nueva=1#agendar` (abre "Agendar una cita"),
   `/schedule#bloquear` y `/customers#buscar` (pone el cursor en el buscador). Si
   cimientos agrega atajos al menú, que usen esas mismas URLs.
   **Revisado:** el inicio (los 4 estilos + `InicioMovil`) ya usa esas URLs con `base` sin `/t/{slug}`, y los destinos existen (`#agendar`, `#bloquear`, `#buscar`). Cimientos no agregó atajos al menú, así que no hay nada más que alinear.

### Grupo C (Crecer)

1. **Nombre de Boost en el menú**: la página ahora se llama "Llena tus huecos"
   (§2.1: menú = título). Pedido: cambiar 'Boost de clientes' en
   `app/t/[slug]/dashboard/Sidebar.tsx` y la etiqueta 'Boost' de `TILES` en
   `lib/branding/moduloColores.ts`.
   **Resuelto:** "Llena tus huecos" en el menú y en `TILES`.
2. **`lib/planes.ts`, plan Esencial**: el `resumen` promete "recordatorios por
   correo" y el plan no los incluye. Mi plan ya no lo dice; falta corregir el texto
   de origen (lo usan la landing y el checkout).
   **Pendiente de Bruno** (decisión de negocio, no se tocó).
3. **`lib/whatsapp/cotiza/estado.ts`**: `ETIQUETA_FACTURA.error` dice "Error al
   timbrar" (jerga). `CotizacionesWhatsapp.tsx` lo pisa con "No se pudo hacer la
   factura"; si se cambia en el origen, se borra el mapa local.
   **Resuelto:** `ETIQUETA_FACTURA.error` = "No se pudo hacer la factura" y se borró el mapa local.
4. **"Escríbenos" sin canal**: los avisos de módulo bloqueado o sin activar dicen
   "Escríbenos y te lo prendemos", pero `WHATSAPP_CONTACTO` (`lib/seo/sitio.ts`)
   es `null`. Pedido: un número de soporte y un botón compartido que lo abra.
   **Pendiente de Bruno:** falta el número de soporte (no se tocó).
5. Me afecta el P0 del grupo A (`ActionForm` borra lo escrito si falla): los
   formularios de Regresan, Lealtad, Llena tus huecos y WhatsApp usan `ActionForm`,
   así que se arreglan solos cuando se corrija el envoltorio.
   **Resuelto** con el arreglo de `ActionForm` (pedido 1 del grupo A).

### Grupo B (Dinero)

1. **Nombre del menú de impuestos**: la página ahora se llama "Impuestos (RESICO)"
   (la dueña busca "impuestos", no "RESICO"). Pedido: cambiar `'Guía RESICO'` por
   `'Impuestos (RESICO)'` en `components/tenant-dash/Sidebar.tsx` (~línea 139) y en
   `TILES` de `lib/branding/moduloColores.ts` (~línea 63), para que menú = título (§2.1).
   **Resuelto:** el archivo real es `app/t/[slug]/dashboard/Sidebar.tsx`; menú y `TILES` dicen "Impuestos (RESICO)".
2. **`Button` a 44 px**: se suma al pedido 3 del grupo A. El grupo B también pone
   `min-h-11` a mano en todos sus botones.
   **Resuelto** (ver pedido 3 del grupo A). El `min-h-11` a mano queda redundante en teléfono; en escritorio gana `lg:min-h-0` y miden 40 px como el resto.
3. **`ConfirmForm` con toast de éxito**: se suma al pedido 2 del grupo A. Cotizaciones
   lo resuelve hoy con un `try/catch` + `toast` dentro de la action que le pasa.
   **Resuelto:** `ConfirmForm success=…`. Lo de Cotizaciones sigue funcionando igual; puede pasarse a `success` cuando se toque.
4. **Sin pedido de ActionForm**: los formularios del grupo B guardan con estado del
   cliente (`onClick` / `onSubmit`), así que el P0 del grupo A no les borra lo escrito.
   **Sin acción.**
