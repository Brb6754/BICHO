'use client';

import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check } from 'lucide-react';
import {
  type Block,
  type BlockType,
  type BlockStyle,
  type Padding,
  type MaxWidth,
  type SocialLink,
  BLOCK_LABELS,
  ADDABLE_BLOCK_TYPES,
  PADDING_LABELS,
  MAX_WIDTH_LABELS,
  createDefaultBlock,
  normalizeBlock,
} from '@/lib/templates/blocks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

const TEXTAREA_CLASS =
  'w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'whatsapp', 'tiktok'] as const;

export function TemplateBuilder({
  initialBlocks,
  onSave,
}: {
  initialBlocks: Block[];
  onSave: (blocks: Block[]) => Promise<void>;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => initialBlocks.map(normalizeBlock));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function addBlock(type: BlockType) {
    setBlocks((items) => [...items, createDefaultBlock(type)]);
  }

  function updateBlock(id: string, updater: (b: Block) => Block) {
    setBlocks((items) => items.map((b) => (b.id === id ? updater(b) : b)));
  }

  function removeBlock(id: string) {
    setBlocks((items) => items.filter((b) => b.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(blocks);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {ADDABLE_BLOCK_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => addBlock(type)}
            >
              + {BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {blocks.map((block) => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  onChange={(updater) => updateBlock(block.id, updater)}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button type="button" onClick={handleSave} isLoading={saving} className="mt-4">
          {saving ? (
            'Guardando...'
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Guardado
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Vista previa</p>
        <div className="overflow-hidden rounded-3xl border border-border shadow-card">
          <div className="max-h-[600px] overflow-y-auto">
            <BlockRenderer blocks={blocks} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableBlockCard({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (updater: (b: Block) => Block) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isBooking = block.type === 'booking';

  function updateStyle(updater: (s: BlockStyle) => BlockStyle) {
    onChange((b) => ({ ...b, style: updater(b.style) }));
  }

  return (
    <Card ref={setNodeRef} style={style} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-ink">{BLOCK_LABELS[block.type]}</span>
        </div>
        {!isBooking && (
          <button type="button" onClick={onRemove} className="text-xs text-error hover:underline">
            Borrar
          </button>
        )}
      </div>

      <BlockFields block={block} onChange={onChange} />

      {!isBooking && <StyleControls style={block.style} onChange={updateStyle} />}
    </Card>
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

function BlockFields({ block, onChange }: { block: Block; onChange: (updater: (b: Block) => Block) => void }) {
  if (block.type === 'hero') {
    return (
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={block.props.title}
          onChange={(e) => onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, title: e.target.value } } : b))}
          placeholder="Título"
          className="w-full"
        />
        <Input
          type="text"
          value={block.props.subtitle}
          onChange={(e) =>
            onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, subtitle: e.target.value } } : b))
          }
          placeholder="Subtítulo"
          className="w-full"
        />
        <Input
          type="url"
          value={block.props.backgroundImageUrl}
          onChange={(e) =>
            onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, backgroundImageUrl: e.target.value } } : b))
          }
          placeholder="Imagen de fondo (URL, opcional)"
          className="w-full"
        />
        <div className="flex gap-2">
          <Input
            type="text"
            value={block.props.ctaText}
            onChange={(e) =>
              onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, ctaText: e.target.value } } : b))
            }
            placeholder="Texto del botón (opcional)"
            className="flex-1"
          />
          <Input
            type="url"
            value={block.props.ctaLink}
            onChange={(e) =>
              onChange((b) => (b.type === 'hero' ? { ...b, props: { ...b.props, ctaLink: e.target.value } } : b))
            }
            placeholder="Link del botón"
            className="flex-1"
          />
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

  if (block.type === 'text') {
    return (
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'text' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        />
        <textarea
          value={block.props.body}
          onChange={(e) => onChange((b) => (b.type === 'text' ? { ...b, props: { ...b.props, body: e.target.value } } : b))}
          rows={2}
          placeholder="Texto"
          className={TEXTAREA_CLASS}
        />
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
        <Input
          type="text"
          value={block.props.heading}
          onChange={(e) =>
            onChange((b) => (b.type === 'features' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))
          }
          placeholder="Encabezado"
          className="w-full"
        />
        <textarea
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
        />
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
        <textarea
          value={block.props.quote}
          onChange={(e) =>
            onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, quote: e.target.value } } : b))
          }
          rows={2}
          placeholder="Cita"
          className={TEXTAREA_CLASS}
        />
        <div className="flex gap-2">
          <Input
            type="text"
            value={block.props.author}
            onChange={(e) =>
              onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, author: e.target.value } } : b))
            }
            placeholder="Autor"
            className="flex-1"
          />
          <Input
            type="url"
            value={block.props.avatarUrl}
            onChange={(e) =>
              onChange((b) => (b.type === 'testimonial' ? { ...b, props: { ...b.props, avatarUrl: e.target.value } } : b))
            }
            placeholder="Foto (URL, opcional)"
            className="flex-1"
          />
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
        <textarea
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
        />
      </div>
    );
  }

  if (block.type === 'location') {
    return (
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={block.props.heading}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))
          }
          placeholder="Encabezado"
          className="w-full"
        />
        <Input
          type="text"
          value={block.props.address}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, address: e.target.value } } : b))
          }
          placeholder="Dirección"
          className="w-full"
        />
        <Input
          type="url"
          value={block.props.mapUrl}
          onChange={(e) =>
            onChange((b) => (b.type === 'location' ? { ...b, props: { ...b.props, mapUrl: e.target.value } } : b))
          }
          placeholder="Link de Google Maps (opcional)"
          className="w-full"
        />
      </div>
    );
  }

  if (block.type === 'hours') {
    return (
      <div className="flex flex-col gap-2">
        <Input
          type="text"
          value={block.props.heading}
          onChange={(e) => onChange((b) => (b.type === 'hours' ? { ...b, props: { ...b.props, heading: e.target.value } } : b))}
          placeholder="Encabezado"
          className="w-full"
        />
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
        <Input
          type="text"
          value={block.props.label}
          onChange={(e) =>
            onChange((b) => (b.type === 'contact_button' ? { ...b, props: { ...b.props, label: e.target.value } } : b))
          }
          placeholder="Texto del botón"
          className="w-full"
        />
        <Input
          type="tel"
          value={block.props.phone}
          onChange={(e) =>
            onChange((b) => (b.type === 'contact_button' ? { ...b, props: { ...b.props, phone: e.target.value } } : b))
          }
          placeholder="Teléfono"
          className="w-full"
        />
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
