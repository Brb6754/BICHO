'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Check,
  Plus,
  X,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  MousePointerClick,
} from 'lucide-react';
import {
  type Block,
  type BlockType,
  type BlockStyle,
  type Padding,
  type MaxWidth,
  type SocialLink,
  BLOCK_LABELS,
  BLOCK_HINTS,
  BLOCK_GROUPS,
  ADDABLE_BLOCK_TYPES,
  PADDING_LABELS,
  MAX_WIDTH_LABELS,
  createDefaultBlock,
  normalizeBlock,
  BLOCK_VARIANTS,
} from '@/lib/templates/blocks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

const TEXTAREA_CLASS =
  'w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'whatsapp', 'tiktok'] as const;
// ── Canvas editor ───────────────────────────────────────────────────
// Real drag and drop, in both directions that matter:
//
//   1. REORDER — grab a section by its handle ON THE CANVAS and drag
//      it. The other sections shift to make room as you move, so you
//      see the new order before you commit to it.
//   2. INSERT — drag a section type out of the palette and drop it at
//      an exact position between two existing sections.
//
// The previous version only had drag inside a 32px layers rail, which
// is reordering a list, not building a page.
//
// HOW THE TWO KINDS OF DRAG COEXIST
// One DndContext wraps both the palette and the canvas. Palette chips
// are `useDraggable` with an id of `new:<type>`; canvas sections are
// `useSortable` keyed by the block's own id, so onDragEnd can branch on
// that prefix. The drop slots between sections are `useDroppable` and
// stay DISABLED unless a palette item is actually in flight — enabled
// all the time they would compete with the sortable sections for the
// same pointer position and reordering would stick between two
// collision targets.
//
// WHY A HANDLE INSTEAD OF DRAGGING THE WHOLE SECTION
// The section body has to stay clickable for selection. If the whole
// thing were draggable, every click would be a potential 5px drag and
// selecting would become unreliable. A grip that appears on hover (the
// Notion/Framer pattern) keeps the two gestures unambiguous.

const DEVICES = [
  { id: 'desktop', label: 'Escritorio', width: '100%', icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { id: 'mobile', label: 'Móvil', width: '390px', icon: Smartphone },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];
const NEW_PREFIX = 'new:';
const SLOT_PREFIX = 'slot:';

export function TemplateBuilder({
  initialBlocks,
  onSave,
  accentColor,
}: {
  initialBlocks: Block[];
  onSave: (blocks: Block[]) => Promise<void>;
  // The template's own accent. Without it the canvas previewed every
  // template in the platform's indigo, so a gym template looked like a
  // SaaS dashboard in the one place where you judge how it looks.
  accentColor?: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => initialBlocks.map(normalizeBlock));
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [tab, setTab] = useState<'add' | 'layers'>('add');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // What was last written to the DB. Comparing against it is what
  // makes "Sin guardar" honest — a flag set by mutations would still
  // say "unsaved" after you undo back to the saved state.
  const savedSnapshot = useRef<Block[]>(initialBlocks.map(normalizeBlock));
  const dirty = JSON.stringify(blocks) !== JSON.stringify(savedSnapshot.current);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const draggingNewType = activeId && activeId.startsWith(NEW_PREFIX)
    ? (activeId.slice(NEW_PREFIX.length) as BlockType)
    : null;
  const draggingBlock = activeId && !draggingNewType ? blocks.find((b) => b.id === activeId) : null;

  // Single funnel for every change to the block list. Undo/redo and the
  // "unsaved" state both fall out of this, instead of each mutation
  // having to remember to record itself.
  function commit(next: Block[]) {
    setPast((p) => [...p.slice(-49), blocks]);
    setFuture([]);
    setBlocks(next);
    setSaved(false);
  }

  function undo() {
    if (!past.length) return;
    setFuture((f) => [blocks, ...f]);
    setBlocks(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  }

  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, blocks]);
    setBlocks(future[0]);
    setFuture((f) => f.slice(1));
  }

  function updateBlock(id: string, updater: (b: Block) => Block) {
    commit(blocks.map((b) => (b.id === id ? updater(b) : b)));
  }

  function insertBlock(type: BlockType, index: number) {
    const fresh = createDefaultBlock(type);
    const next = [...blocks];
    next.splice(index, 0, fresh);
    commit(next);
    setSelectedId(fresh.id);
  }

  function duplicateBlock(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    // A duplicate needs its own id or React keys collide and dnd-kit
    // starts dragging both copies at once.
    const copy = { ...blocks[i], id: blocks[i].type + '-' + Math.random().toString(36).slice(2, 10) } as Block;
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    commit(next);
    setSelectedId(copy.id);
  }

  function moveBlock(id: string, delta: number) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    commit(arrayMove(blocks, i, j));
  }

  function toggleHidden(id: string) {
    updateBlock(id, (b) => ({ ...b, hidden: !b.hidden }));
  }

  function removeBlock(id: string) {
    commit(blocks.filter((b) => b.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);

    // Palette → canvas.
    if (activeKey.startsWith(NEW_PREFIX)) {
      const type = activeKey.slice(NEW_PREFIX.length) as BlockType;
      const index = overKey.startsWith(SLOT_PREFIX)
        ? Number(overKey.slice(SLOT_PREFIX.length))
        : Math.max(0, blocks.findIndex((b) => b.id === overKey));
      insertBlock(type, index);
      return;
    }

    // Reorder within the canvas (or the layers rail — same ids).
    if (activeKey !== overKey && !overKey.startsWith(SLOT_PREFIX)) {
      const oldIndex = blocks.findIndex((b) => b.id === activeKey);
      const newIndex = blocks.findIndex((b) => b.id === overKey);
      if (oldIndex >= 0 && newIndex >= 0) commit(arrayMove(blocks, oldIndex, newIndex));
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave(blocks);
    savedSnapshot.current = blocks;
    setSaving(false);
    setSaved(true);
  }

  // Keyboard shortcuts. Deliberately inert while the caret is inside a
  // field or an inline-editable node — otherwise Backspace would delete
  // the whole section you are typing in, which is exactly the kind of
  // data loss that makes people distrust an editor.
  useEffect(() => {
    function isTyping(t: EventTarget | null) {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return (
        el.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
      );
    }

    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        if (isTyping(e.target)) return; // let the browser undo the text
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
        return;
      }
      if (isTyping(e.target)) return;

      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (!selectedId) return;
      const current = blocks.find((b) => b.id === selectedId);
      if (!current) return;

      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateBlock(selectedId);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && current.type !== 'booking') {
        e.preventDefault();
        removeBlock(selectedId);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Browsers only honour this if the user has interacted with the page,
  // which by definition they have if there is anything unsaved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const deviceWidth = DEVICES.find((d) => d.id === device)!.width;

  return (
    <DndContext
      // Explicit id: without one dnd-kit derives an incrementing one
      // that differs between the server and client renders, which trips
      // a real hydration mismatch on every aria-describedby it writes.
      id="template-canvas"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-border bg-surface">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-0.5 rounded-full bg-ink/[0.05] p-0.5">
            {DEVICES.map((d) => {
              const Icon = d.icon;
              const active = device === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDevice(d.id)}
                  aria-pressed={active}
                  title={d.label}
                  className={
                    'flex h-8 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
                    (active ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink')
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{d.label}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-1 flex items-center gap-0.5">
            <IconButton label="Deshacer" onClick={undo} disabled={!past.length}>
              <Undo2 className="h-4 w-4" />
            </IconButton>
            <IconButton label="Rehacer" onClick={redo} disabled={!future.length}>
              <Redo2 className="h-4 w-4" />
            </IconButton>
          </div>

          <p className="ml-2 hidden text-xs text-muted sm:block">
            {blocks.length} {blocks.length === 1 ? 'sección' : 'secciones'}
          </p>

          <div className="ml-auto flex items-center gap-2">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                Sin guardar
              </span>
            ) : (
              saved && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <Check className="h-3.5 w-3.5" />
                  Guardado
                </span>
              )
            )}
            <Button
              type="button"
              onClick={handleSave}
              isLoading={saving}
              disabled={!dirty}
              title="Guardar cambios (Ctrl+S)"
              className="px-4 py-2 text-xs"
            >
              Guardar cambios
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left rail: the palette you drag FROM, and the layer list. */}
          <aside className="hidden w-56 shrink-0 flex-col overflow-hidden border-r border-border md:flex">
            <div className="flex shrink-0 gap-1 border-b border-border p-2">
              {(['add', 'layers'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={
                    'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
                    (tab === t ? 'bg-primary/10 text-ink' : 'text-muted hover:text-ink')
                  }
                >
                  {t === 'add' ? 'Agregar' : 'Capas'}
                </button>
              ))}
            </div>

            {tab === 'add' ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <p className="px-1 pb-3 text-[11px] leading-snug text-muted">
                  Haz clic en una sección para agregarla al final de la página, o arrástrala al
                  lugar donde la quieras.
                </p>
                {/* Grouped by what you are trying to do. Fifteen options in
                    one flat column meant reading all fifteen to find the
                    one that holds the prices. */}
                {BLOCK_GROUPS.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="px-1 text-[11px] font-semibold text-ink">{group.label}</p>
                    <p className="px-1 pb-1.5 text-[10px] leading-snug text-muted">{group.hint}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.types.map((type) => (
                        <PaletteChip
                          key={type}
                          type={type}
                          onClick={() => insertBlock(type, blocks.length)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-0.5">
                    {blocks.map((b) => (
                      <LayerRow
                        key={b.id}
                        block={b}
                        selected={b.id === selectedId}
                        onSelect={() => setSelectedId(b.id)}
                        onToggleHidden={() => toggleHidden(b.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}
          </aside>

          {/* Canvas */}
          <div className="min-w-0 flex-1 overflow-y-auto bg-paper p-4 sm:p-6" onClick={() => setSelectedId(null)}>
            <div
              className="mx-auto overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-[width] duration-300"
              style={{ width: deviceWidth, maxWidth: '100%' }}
            >
              <div className="force-light">
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <DropSlot index={0} armed={Boolean(draggingNewType)} />
                  {blocks.map((block, i) => (
                    <div key={block.id}>
                      <CanvasSection
                        block={block}
                        selected={block.id === selectedId}
                        isFirst={i === 0}
                        isLast={i === blocks.length - 1}
                        accentColor={accentColor}
                        onSelect={() => setSelectedId(block.id)}
                        onMove={(d) => moveBlock(block.id, d)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onToggleHidden={() => toggleHidden(block.id)}
                        onRemove={() => removeBlock(block.id)}
                        onEditText={(key, value) =>
                          updateBlock(block.id, (b) =>
                            (b.props as Record<string, unknown>)[key] === value
                              ? b
                              : ({ ...b, props: { ...b.props, [key]: value } } as Block)
                          )
                        }
                      />
                      <DropSlot index={i + 1} armed={Boolean(draggingNewType)} />
                    </div>
                  ))}
                </SortableContext>

                {blocks.length === 0 && <EmptyCanvas armed={Boolean(draggingNewType)} />}
              </div>
            </div>
          </div>

          {/* Inspector */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border lg:block">
            {selected ? (
              <Inspector
                key={selected.id}
                block={selected}
                onChange={(updater) => updateBlock(selected.id, updater)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                <MousePointerClick className="h-5 w-5 text-muted" />
                <p className="text-sm font-medium text-ink">Nada seleccionado</p>
                <p className="text-xs leading-relaxed text-muted">
                  Haz clic en una sección del lienzo para editarla, o arrastra una nueva desde el panel de la
                  izquierda.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* What follows the cursor while dragging. Without it the gesture
          has nothing to look at and reads as broken. */}
      <DragOverlay dropAnimation={null}>
        {draggingNewType && (
          <div className="w-40 rounded-xl border border-primary bg-surface p-2 shadow-lg">
            <SectionGlyph type={draggingNewType} />
            <span className="mt-1.5 block text-xs font-medium text-ink">{BLOCK_LABELS[draggingNewType]}</span>
          </div>
        )}
        {draggingBlock && (
          <div className="flex items-center gap-2 rounded-xl border border-primary bg-surface px-3 py-2 shadow-lg">
            <GripVertical className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-ink">{BLOCK_LABELS[draggingBlock.type]}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children}
    </button>
  );
}

// A section type you can drag onto the canvas. Clicking it appends
// instead — dragging is the expressive gesture, clicking is the fast
// one, and a builder shouldn't force you into the slow one.
function PaletteChip({ type, onClick }: { type: BlockType; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: NEW_PREFIX + type });
  return (
    <div
      ref={setNodeRef}
      className={
        'rounded-xl border border-border p-1.5 transition-colors hover:border-primary ' +
        (isDragging ? 'opacity-40' : '')
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onClick}
        title={BLOCK_LABELS[type] + ' — ' + BLOCK_HINTS[type]}
        className="w-full cursor-grab touch-none text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <SectionGlyph type={type} />
        <span className="mt-1 block text-[10px] font-medium leading-tight text-ink">
          {BLOCK_LABELS[type]}
        </span>
        {/* Not truncated any more: the name is the whole point of the
            chip, and "Botón de WhatsApp o lla…" is not a name. */}
        <span className="mt-0.5 line-clamp-2 block text-[9px] leading-tight text-muted">
          {BLOCK_HINTS[type]}
        </span>
      </button>
    </div>
  );
}

// The gap between two sections. Collapsed to nothing normally; when a
// palette item is in flight it becomes a real, obvious drop target.
// Disabled as a droppable unless armed, so it never competes with the
// sortable sections during a reorder.
function DropSlot({ index, armed }: { index: number; armed: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: SLOT_PREFIX + index, disabled: !armed });
  if (!armed) return <div className="h-0" />;
  return (
    <div
      ref={setNodeRef}
      className={
        'mx-4 my-1 flex items-center justify-center rounded-xl border-2 border-dashed transition-all ' +
        (isOver ? 'h-20 border-primary bg-primary/10' : 'h-10 border-primary/30')
      }
    >
      {isOver && <span className="text-[11px] font-semibold text-primary">Soltar aquí</span>}
    </div>
  );
}

function EmptyCanvas({ armed }: { armed: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: SLOT_PREFIX + '0', disabled: !armed });
  return (
    <div
      ref={setNodeRef}
      className={
        'm-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-colors ' +
        (isOver ? 'border-primary bg-primary/10' : 'border-border')
      }
    >
      <p className="text-sm font-medium text-ink">Esta plantilla está vacía.</p>
      <p className="text-xs text-muted">Arrastra una sección desde la izquierda para empezar.</p>
    </div>
  );
}

function LayerRow({
  block,
  selected,
  onSelect,
  onToggleHidden,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={
        'group flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-xs transition-colors ' +
        (selected ? 'bg-primary/10 text-ink' : 'text-muted hover:bg-ink/[0.04]')
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
        className="cursor-grab touch-none text-muted/60 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {BLOCK_LABELS[block.type]}
      </button>
      {block.type !== 'booking' && (
        <button
          type="button"
          onClick={onToggleHidden}
          aria-label={block.hidden ? 'Mostrar sección' : 'Ocultar sección'}
          className="shrink-0 text-muted/60 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
        >
          {block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

function CanvasSection({
  block,
  selected,
  isFirst,
  isLast,
  accentColor,
  onSelect,
  onMove,
  onDuplicate,
  onToggleHidden,
  onRemove,
  onEditText,
}: {
  block: Block;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  accentColor?: string;
  onEditText: (key: string, value: string) => void;
  onSelect: () => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const isBooking = block.type === 'booking';
  const contentRef = useRef<HTMLDivElement>(null);

  // INLINE TEXT EDITING.
  // The renderer marks its own text nodes with data-edit="<propKey>"
  // (see Sections.tsx), so the editor never needs a parallel map of
  // "which text lives where" — it just walks the rendered DOM of the
  // selected section and makes those nodes editable in place.
  //
  // Committing happens on BLUR, never on keystroke. Writing to state on
  // every character would re-render this subtree from React state while
  // the caret is inside it, which resets the caret to position 0 on
  // every letter — the classic contentEditable bug. Blur-only means the
  // DOM owns the text while you type and React owns it the rest of the
  // time.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-edit]'));

    if (!selected) {
      nodes.forEach((el) => {
        el.removeAttribute('contenteditable');
        el.classList.remove('tpl-editable');
        el.style.pointerEvents = '';
      });
      return;
    }

    const cleanups = nodes.map((el) => {
      const key = el.dataset.edit;
      if (!key) return () => {};
      el.setAttribute('contenteditable', 'plaintext-only');
      el.classList.add('tpl-editable');
      // The rendered block sits under pointer-events-none so clicks
      // select the section; editable nodes have to opt back in.
      el.style.pointerEvents = 'auto';

      const commit = () => {
        const next = (el.innerText ?? '').replace(/ /g, ' ').trim();
        onEditText(key, next);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          el.blur();
        }
        // Enter commits on single-line fields; Shift+Enter always
        // inserts a break for the multi-line ones.
        if (e.key === 'Enter' && !e.shiftKey && key !== 'body') {
          e.preventDefault();
          el.blur();
        }
      };
      el.addEventListener('blur', commit);
      el.addEventListener('keydown', onKeyDown);
      return () => {
        el.removeEventListener('blur', commit);
        el.removeEventListener('keydown', onKeyDown);
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, [selected, block, onEditText]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className="group/section relative"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={'Editar sección: ' + BLOCK_LABELS[block.type]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className={
          'relative block w-full cursor-pointer outline-none transition-[box-shadow] ' +
          (selected
            ? 'shadow-[inset_0_0_0_2px_rgb(var(--color-primary))]'
            : 'hover:shadow-[inset_0_0_0_2px_rgb(var(--color-primary)/0.35)] focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--color-primary))]')
        }
      >
        {/* pointer-events-none is what makes this a canvas: a click on a
            button or link inside the rendered section selects the
            section instead of navigating away from the editor. */}
        <div ref={contentRef} className={'pointer-events-none ' + (block.hidden ? 'opacity-30 grayscale' : '')}>
          <BlockRenderer
            blocks={[block]}
            branding={accentColor ? { primaryColor: '#1F2937', accentColor } : undefined}
          />
        </div>

        {block.hidden && (
          <span className="absolute left-2 top-11 z-20 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">
            Oculta
          </span>
        )}

        {/* Drag handle. Appears on hover so the canvas stays clean while
            you read it, and carries the drag listeners so the section
            body stays a plain click target for selection. */}
        <div
          className={
            'absolute left-2 top-2 z-30 transition-opacity ' +
            (selected ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100')
          }
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={'Arrastrar sección: ' + BLOCK_LABELS[block.type]}
            title="Arrastrar para mover"
            className="flex h-7 cursor-grab touch-none items-center gap-1 rounded-full bg-primary px-2.5 text-[10px] font-semibold text-[rgb(var(--color-cta-fg))] shadow-md active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <GripVertical className="h-3.5 w-3.5" />
            {BLOCK_LABELS[block.type]}
          </button>
        </div>

        {selected && (
          <div
            className="absolute right-2 top-2 z-30 flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ToolButton label="Subir" onClick={() => onMove(-1)} disabled={isFirst}>
              <ChevronUp className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Bajar" onClick={() => onMove(1)} disabled={isLast}>
              <ChevronDown className="h-3.5 w-3.5" />
            </ToolButton>
            {!isBooking && (
              <>
                <ToolButton label="Duplicar" onClick={onDuplicate}>
                  <Copy className="h-3.5 w-3.5" />
                </ToolButton>
                <ToolButton label={block.hidden ? 'Mostrar' : 'Ocultar'} onClick={onToggleHidden}>
                  {block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </ToolButton>
                <ToolButton label="Borrar" onClick={onRemove} danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </ToolButton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={
        'flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
        (danger ? 'text-error hover:bg-error-soft' : 'text-muted hover:bg-ink/[0.06] hover:text-ink')
      }
    >
      {children}
    </button>
  );
}

// A schematic of each layout instead of a list of words — picking a
// section is a visual decision, so the palette should be visual.
function SectionGlyph({ type }: { type: BlockType }) {
  const bar = (w: string) => <span className={'block h-1 rounded-sm bg-primary/30 ' + w} />;
  const shapes: Partial<Record<BlockType, React.ReactNode>> = {
    hero: (
      <div className="flex h-full w-full gap-1 p-1.5">
        <div className="flex flex-1 flex-col justify-center gap-1">
          {bar('w-full')}
          {bar('w-2/3')}
        </div>
        <span className="block w-1/3 rounded-sm bg-primary/20" />
      </div>
    ),
    split: (
      <div className="flex h-full w-full items-center gap-1 p-1.5">
        <span className="block h-full w-1/2 rounded-sm bg-primary/20" />
        <div className="flex flex-1 flex-col gap-1">
          {bar('w-full')}
          {bar('w-3/4')}
        </div>
      </div>
    ),
    services: (
      <div className="flex h-full w-full flex-col justify-center gap-1.5 p-1.5">
        {bar('w-full')}
        {bar('w-full')}
        {bar('w-2/3')}
      </div>
    ),
    team: (
      <div className="flex h-full w-full items-center gap-1 p-1.5">
        <span className="block h-2/3 flex-1 rounded-sm bg-primary/20" />
        <span className="block h-2/3 flex-1 rounded-sm bg-primary/20" />
        <span className="block h-2/3 flex-1 rounded-sm bg-primary/20" />
      </div>
    ),
    gallery: (
      <div className="grid h-full w-full grid-cols-3 gap-1 p-1.5">
        <span className="rounded-sm bg-primary/20" />
        <span className="rounded-sm bg-primary/20" />
        <span className="rounded-sm bg-primary/20" />
        <span className="rounded-sm bg-primary/20" />
        <span className="col-span-2 rounded-sm bg-primary/20" />
      </div>
    ),
    faq: (
      <div className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
        {bar('w-full')}
        <span className="block h-px w-full bg-primary/20" />
        {bar('w-5/6')}
        <span className="block h-px w-full bg-primary/20" />
        {bar('w-3/4')}
      </div>
    ),
    cta: (
      <div className="flex h-full w-full items-center justify-center p-1.5">
        <span className="block h-2/3 w-full rounded-sm bg-primary/30" />
      </div>
    ),
    testimonial: (
      <div className="flex h-full w-full flex-col justify-center gap-1 p-2">
        {bar('w-full')}
        {bar('w-4/5')}
        {bar('w-1/3')}
      </div>
    ),
  };
  return (
    <div className="h-9 w-full overflow-hidden rounded-md bg-ink/[0.04]">
      {shapes[type] ?? (
        <div className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
          {bar('w-full')}
          {bar('w-1/2')}
        </div>
      )}
    </div>
  );
}

// The contextual panel. Grouped Composición / Contenido / Estilo so a
// long block (services with eight items) doesn't bury its variant
// picker under a wall of inputs.
function Inspector({
  block,
  onChange,
  onClose,
}: {
  block: Block;
  onChange: (updater: (b: Block) => Block) => void;
  onClose: () => void;
}) {
  const isBooking = block.type === 'booking';
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <p className="truncate text-sm font-semibold text-ink">{BLOCK_LABELS[block.type]}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/[0.06] hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isBooking ? (
        <p className="px-4 py-4 text-xs leading-relaxed text-muted">
          Esta sección es el formulario de reserva real. No tiene contenido editable — se llena solo con los
          servicios y horarios del negocio. Puedes moverla de lugar, pero no borrarla.
        </p>
      ) : (
        <div className="flex flex-col gap-5 px-4 py-4">
          <VariantPicker block={block} onChange={onChange} />
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Contenido</p>
            <BlockFields block={block} onChange={onChange} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Estilo</p>
            <StyleControls style={block.style} onChange={(u) => onChange((b) => ({ ...b, style: u(b.style) }))} />
          </div>
        </div>
      )}
    </div>
  );
}

function StyleControls({ style, onChange }: { style: BlockStyle; onChange: (updater: (s: BlockStyle) => BlockStyle) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-black/[0.02] p-3 sm:grid-cols-5">
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase text-muted">Fondo</p>
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={style.backgroundColor ?? '#ffffff'}
            onChange={(e) => onChange((s) => ({ ...s, backgroundColor: e.target.value }))}
            className="h-8 w-8 cursor-pointer rounded border border-border"
          />
          <button
            type="button"
            onClick={() => onChange((s) => ({ ...s, backgroundColor: null }))}
            className="text-[10px] text-muted underline"
          >
            quitar
          </button>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase text-muted">Espaciado</p>
        <select
          value={style.padding}
          onChange={(e) => onChange((s) => ({ ...s, padding: e.target.value as Padding }))}
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
        >
          {(Object.keys(PADDING_LABELS) as Padding[]).map((k) => (
            <option key={k} value={k}>
              {PADDING_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase text-muted">Ancho</p>
        <select
          value={style.maxWidth}
          onChange={(e) => onChange((s) => ({ ...s, maxWidth: e.target.value as MaxWidth }))}
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
        >
          {(Object.keys(MAX_WIDTH_LABELS) as MaxWidth[]).map((k) => (
            <option key={k} value={k}>
              {MAX_WIDTH_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-end gap-1.5 pb-1.5 text-xs text-ink">
        <input
          type="checkbox"
          checked={style.rounded}
          onChange={(e) => onChange((s) => ({ ...s, rounded: e.target.checked }))}
          className="accent-primary"
        />
        Bordes redondeados
      </label>
      <label className="flex items-end gap-1.5 pb-1.5 text-xs text-ink">
        <input
          type="checkbox"
          checked={style.shadow}
          onChange={(e) => onChange((s) => ({ ...s, shadow: e.target.checked }))}
          className="accent-primary"
        />
        Sombra
      </label>
    </div>
  );
}

// The variant is the axis that makes two templates using the same
// block types look like different products, so it gets the most
// prominent control on the card — above the content fields, not buried
// with the box styling.
function VariantPicker({ block, onChange }: { block: Block; onChange: (updater: (b: Block) => Block) => void }) {
  const options = BLOCK_VARIANTS[block.type];
  if (!options) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase text-muted">Composición</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = block.variant === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange((b) => ({ ...b, variant: o.value }))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                active
                  ? 'bg-primary text-[rgb(var(--color-cta-fg))]'
                  : 'border border-border text-muted hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Repeated items (services, team, FAQ) are edited as one line per
// entry with pipe-separated fields, matching the existing convention
// for features/gallery/social above. It keeps the editor compact and
// paste-friendly — a salon owner can paste their price list straight
// from a document — instead of a stack of per-item field groups.
function LineEditor({
  label,
  hint,
  value,
  onCommit,
  rows = 5,
}: {
  label: string;
  hint: string;
  value: string;
  onCommit: (text: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase text-muted">{label}</span>
      <textarea
        defaultValue={value}
        onBlur={(e) => onCommit(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <span className="mt-1 block text-[10px] leading-snug text-muted">{hint}</span>
    </label>
  );
}

const splitLines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// A persistent name above every box. A placeholder tells you what a
// field is only until you type in it — which is exactly the moment you
// stop being able to tell one box from another.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (updater: (b: Block) => Block) => void }) {
  if (block.type === 'hero') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Título"><Input
          type="text"
          value={block.props.title}
          onChange={(e) => onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, title: e.target.value } } : b))}
          placeholder="Título"
          className="w-full"
        /></Field>
        <Field label="Subtítulo"><Input
          type="text"
          value={block.props.subtitle}
          onChange={(e) =>
            onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, subtitle: e.target.value } } : b))
          }
          placeholder="Subtítulo"
          className="w-full"
        /></Field>
        <Field label="Imagen de fondo (URL, opcional)"><Input
          type="url"
          value={block.props.backgroundImageUrl}
          onChange={(e) =>
            onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, backgroundImageUrl: e.target.value } } : b))
          }
          placeholder="Imagen de fondo (URL, opcional)"
          className="w-full"
        /></Field>
        <div className="flex gap-2">
          <Field label="Texto del botón (opcional)"><Input
            type="text"
            value={block.props.ctaText}
            onChange={(e) =>
              onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, ctaText: e.target.value } } : b))
            }
            placeholder="Texto del botón (opcional)"
            className="flex-1"
          /></Field>
          <Field label="Link del botón"><Input
            type="url"
            value={block.props.ctaLink}
            onChange={(e) =>
              onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, ctaLink: e.target.value } } : b))
            }
            placeholder="Link del botón"
            className="flex-1"
          /></Field>
        </div>
        <Select
          value={block.props.align}
          onChange={(e) =>
            onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, align: e.target.value as 'left' | 'center' } } : b))
          }
          className="w-40"
        >
          <option value="center">Centrado</option>
          <option value="left">Izquierda</option>
        </Select>
      </div>
    );
  }

  if (block.type === 'services') {
    const text = block.props.items
      .map((i) => [i.name, i.price, i.duration, i.description].join(' | '))
      .join('\n');
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'services' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Intro (opcional)"><Input
          type="text"
          value={block.props.intro}
          onChange={(e) => onChange((b) => (b.type === 'services' ? { ...b, props: { ...b.props, intro: e.target.value } } : b))}
          placeholder="Intro (opcional)"
          className="w-full"
        /></Field>
        <LineEditor
          label="Servicios"
          hint="Un servicio por línea: Nombre | Precio | Duración | Descripción"
          value={text}
          rows={6}
          onCommit={(t) =>
            onChange((b) =>
              b.type === 'services'
                ? {
                    ...b,
                    props: {
                      ...b.props,
                      items: splitLines(t).map((line) => {
                        const [name = '', price = '', duration = '', description = ''] = line.split('|').map((x) => x.trim());
                        return { name, price, duration, description };
                      }),
                    },
                  }
                : b
            )
          }
        />
      </div>
    );
  }

  if (block.type === 'team') {
    const text = block.props.members.map((m) => [m.name, m.role, m.photoUrl, m.note].join(' | ')).join('\n');
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'team' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Intro (opcional)"><Input
          type="text"
          value={block.props.intro}
          onChange={(e) => onChange((b) => (b.type === 'team' ? { ...b, props: { ...b.props, intro: e.target.value } } : b))}
          placeholder="Intro (opcional)"
          className="w-full"
        /></Field>
        <LineEditor
          label="Personas"
          hint="Una por línea: Nombre | Puesto | URL de foto | Nota"
          value={text}
          rows={4}
          onCommit={(t) =>
            onChange((b) =>
              b.type === 'team'
                ? {
                    ...b,
                    props: {
                      ...b.props,
                      members: splitLines(t).map((line) => {
                        const [name = '', role = '', photoUrl = '', note = ''] = line.split('|').map((x) => x.trim());
                        return { name, role, photoUrl, note };
                      }),
                    },
                  }
                : b
            )
          }
        />
      </div>
    );
  }

  if (block.type === 'split') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Etiqueta pequeña (opcional)"><Input
          type="text"
          value={block.props.eyebrow}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, eyebrow: e.target.value } } : b))}
          placeholder="Etiqueta pequeña (opcional)"
          className="w-full"
        /></Field>
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Texto"><textarea
          value={block.props.body}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, body: e.target.value } } : b))}
          placeholder="Texto"
          rows={4}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
        /></Field>
        <Field label="URL de la imagen"><Input
          type="text"
          value={block.props.imageUrl}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, imageUrl: e.target.value } } : b))}
          placeholder="URL de la imagen"
          className="w-full"
        /></Field>
        <div className="grid grid-cols-2 gap-2">
        <Field label="Texto del botón"><Input
          type="text"
          value={block.props.ctaText}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, ctaText: e.target.value } } : b))}
          placeholder="Texto del botón"
          className="w-full"
        /></Field>
        <Field label="Link"><Input
          type="text"
          value={block.props.ctaLink}
          onChange={(e) => onChange((b) => (b.type === 'split' ? { ...b, props: { ...b.props, ctaLink: e.target.value } } : b))}
          placeholder="Link"
          className="w-full"
        /></Field>
        </div>
      </div>
    );
  }

  if (block.type === 'faq') {
    const text = block.props.items.map((i) => [i.question, i.answer].join(' | ')).join('\n');
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'faq' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <LineEditor
          label="Preguntas"
          hint="Una por línea: Pregunta | Respuesta"
          value={text}
          rows={5}
          onCommit={(t) =>
            onChange((b) =>
              b.type === 'faq'
                ? {
                    ...b,
                    props: {
                      ...b.props,
                      items: splitLines(t).map((line) => {
                        const [question = '', answer = ''] = line.split('|').map((x) => x.trim());
                        return { question, answer };
                      }),
                    },
                  }
                : b
            )
          }
        />
      </div>
    );
  }

  if (block.type === 'cta') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'cta' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Texto (opcional)"><Input
          type="text"
          value={block.props.body}
          onChange={(e) => onChange((b) => (b.type === 'cta' ? { ...b, props: { ...b.props, body: e.target.value } } : b))}
          placeholder="Texto (opcional)"
          className="w-full"
        /></Field>
        <div className="grid grid-cols-2 gap-2">
        <Field label="Texto del botón"><Input
          type="text"
          value={block.props.ctaText}
          onChange={(e) => onChange((b) => (b.type === 'cta' ? { ...b, props: { ...b.props, ctaText: e.target.value } } : b))}
          placeholder="Texto del botón"
          className="w-full"
        /></Field>
        <Field label="Link"><Input
          type="text"
          value={block.props.ctaLink}
          onChange={(e) => onChange((b) => (b.type === 'cta' ? { ...b, props: { ...b.props, ctaLink: e.target.value } } : b))}
          placeholder="Link"
          className="w-full"
        /></Field>
        </div>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'text' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Texto"><textarea
          value={block.props.body}
          onChange={(e) => onChange((b) => (b.type === 'text' ? { ...b, props: { ...b.props, body: e.target.value } } : b))}
          rows={2}
          placeholder="Texto"
          className={TEXTAREA_CLASS}
        /></Field>
        <div className="flex gap-2">
          <Select
            value={block.props.align}
            onChange={(e) =>
              onChange((b) =>
                b.type === 'text' ? { ...b, props: { ...b.props, align: e.target.value as 'left' | 'center' | 'right' } } : b
              )
            }
            className="flex-1"
          >
            <option value="center">Centrado</option>
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
          </Select>
          <Select
            value={block.props.size}
            onChange={(e) =>
              onChange((b) => (b.type === 'text' ? { ...b, props: { ...b.props, size: e.target.value as 'sm' | 'md' | 'lg' } } : b))
            }
            className="flex-1"
          >
            <option value="sm">Texto chico</option>
            <option value="md">Texto medio</option>
            <option value="lg">Texto grande</option>
          </Select>
        </div>
      </div>
    );
  }

  if (block.type === 'features') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) =>
            onChange((b) => (b.type === 'features' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))
          }
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Una característica por línea"><textarea
          defaultValue={block.props.items.join('\n')}
          onBlur={(e) =>
            onChange((b) =>
              b.type === 'features'
                ? { ...b, props: { ...b.props, items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } }
                : b
            )
          }
          rows={3}
          placeholder="Una característica por línea"
          className={TEXTAREA_CLASS}
        /></Field>
        <Select
          value={block.props.layout}
          onChange={(e) =>
            onChange((b) => (b.type === 'features' ? { ...b, props: { ...b.props, layout: e.target.value as 'list' | 'grid' } } : b))
          }
          className="w-40"
        >
          <option value="list">Lista</option>
          <option value="grid">Cuadrícula</option>
        </Select>
      </div>
    );
  }

  if (block.type === 'testimonial') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Cita"><textarea
          value={block.props.quote}
          onChange={(e) =>
            onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, quote: e.target.value } } : b))
          }
          rows={2}
          placeholder="Cita"
          className={TEXTAREA_CLASS}
        /></Field>
        <div className="flex gap-2">
          <Field label="Autor"><Input
            type="text"
            value={block.props.author}
            onChange={(e) =>
              onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, author: e.target.value } } : b))
            }
            placeholder="Autor"
            className="flex-1"
          /></Field>
          <Field label="Foto (URL, opcional)"><Input
            type="url"
            value={block.props.avatarUrl}
            onChange={(e) =>
              onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, avatarUrl: e.target.value } } : b))
            }
            placeholder="Foto (URL, opcional)"
            className="flex-1"
          /></Field>
        </div>
        <Select
          value={String(block.props.rating)}
          onChange={(e) =>
            onChange((b) =>
              b.type === 'testimonial' ? { ...b, props: { ...b.props, rating: Number(e.target.value) } } : b
            )
          }
          className="w-40"
        >
          <option value="0">Sin estrellas</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (block.type === 'gallery') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Una URL de imagen por línea"><textarea
          defaultValue={block.props.images.join('\n')}
          onBlur={(e) =>
            onChange((b) =>
              b.type === 'gallery'
                ? { ...b, props: { ...b.props, images: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } }
                : b
            )
          }
          rows={3}
          placeholder="Una URL de imagen por línea"
          className={TEXTAREA_CLASS}
        /></Field>
      </div>
    );
  }

  if (block.type === 'location') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))
          }
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <Field label="Dirección"><Input
          type="text"
          value={block.props.address}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, address: e.target.value } } : b))
          }
          placeholder="Dirección"
          className="w-full"
        /></Field>
        <Field label="Link de Google Maps (opcional)"><Input
          type="url"
          value={block.props.mapUrl}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, mapUrl: e.target.value } } : b))
          }
          placeholder="Link de Google Maps (opcional)"
          className="w-full"
        /></Field>
      </div>
    );
  }

  if (block.type === 'hours') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Encabezado"><Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'hours' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        /></Field>
        <textarea
          defaultValue={block.props.lines.join('\n')}
          onBlur={(e) =>
            onChange((b) =>
              b.type === 'hours'
                ? { ...b, props: { ...b.props, lines: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } }
                : b
            )
          }
          rows={3}
          placeholder={'Una línea por renglón, ej.\nLunes a viernes: 9:00–18:00'}
          className={TEXTAREA_CLASS}
        />
      </div>
    );
  }

  if (block.type === 'social') {
    const linesText = block.props.links.map((l) => `${l.platform}|${l.url}`).join('\n');
    return (
      <div className="flex flex-col gap-2">
        <textarea
          defaultValue={linesText}
          onBlur={(e) =>
            onChange((b) => {
              if (b.type !== 'social') return b;
              const links: SocialLink[] = e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [platform, url] = line.split('|').map((p) => p.trim());
                  return { platform: platform as SocialLink['platform'], url: url ?? '' };
                })
                .filter((l) => (SOCIAL_PLATFORMS as readonly string[]).includes(l.platform));
              return { ...b, props: { ...b.props, links } };
            })
          }
          rows={3}
          placeholder={'Una red por línea: plataforma|url\nej. instagram|https://instagram.com/tu-negocio'}
          className={TEXTAREA_CLASS}
        />
        <p className="text-[10px] text-muted">Plataformas válidas: {SOCIAL_PLATFORMS.join(', ')}</p>
      </div>
    );
  }

  if (block.type === 'contact_button') {
    return (
      <div className="flex flex-col gap-2">
        <Field label="Texto del botón"><Input
          type="text"
          value={block.props.label}
          onChange={(e) =>
            onChange((b) => (b.type === 'contact_button' ? { ...b, props: { ...b.props, label: e.target.value } } : b))
          }
          placeholder="Texto del botón"
          className="w-full"
        /></Field>
        <Field label="Teléfono"><Input
          type="tel"
          value={block.props.phone}
          onChange={(e) =>
            onChange((b) => (b.type === 'contact_button' ? { ...b, props: { ...b.props, phone: e.target.value } } : b))
          }
          placeholder="Teléfono"
          className="w-full"
        /></Field>
        <Select
          value={block.props.kind}
          onChange={(e) =>
            onChange((b) =>
              b.type === 'contact_button' ? { ...b, props: { ...b.props, kind: e.target.value as 'call' | 'whatsapp' } } : b
            )
          }
          className="w-40"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="call">Llamada</option>
        </Select>
      </div>
    );
  }

  if (block.type === 'spacer') {
    return (
      <Select
        value={block.props.height}
        onChange={(e) =>
          onChange((b) => (b.type === 'spacer' ? { ...b, props: { ...b.props, height: e.target.value as 'sm' | 'md' | 'lg' } } : b))
        }
        className="w-40"
      >
        <option value="sm">Chico</option>
        <option value="md">Medio</option>
        <option value="lg">Grande</option>
      </Select>
    );
  }

  return (
    <p className="text-xs text-muted">Este bloque siempre está presente — es el formulario de reserva real.</p>
  );
}
