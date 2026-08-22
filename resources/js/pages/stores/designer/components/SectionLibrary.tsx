import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { getAllSectionMetas } from '@/builder';
import type { BuilderSectionMeta } from '@/builder/types';

type Props = {
  onAdd: (type: string) => void;
};

const GROUPS: Array<{ key: string; name: string }> = [
  { key: 'أساسيات', name: 'أساسيات المتجر' },
  { key: 'منتجات', name: 'المنتجات' },
  { key: 'تسويق', name: 'التسويق' },
  { key: 'تواصل اجتماعي', name: 'التواصل الاجتماعي' },
];

/* ------------------------------------------------------------------ */
/* SectionThumb — a miniature visual mockup of what the section looks   */
/* like on the storefront. Replaces technical names with recognizable   */
/* layout previews so merchants never have to guess.                    */
/* ------------------------------------------------------------------ */

const Bar = ({ w = 'w-full', c = 'bg-slate-300', h = 'h-1' }: { w?: string; c?: string; h?: string }) => (
  <span className={`block rounded-full ${h} ${w} ${c}`} />
);

const MiniCard = ({ c = 'bg-slate-200' }: { c?: string }) => (
  <span className="flex flex-col gap-0.5 overflow-hidden rounded-sm bg-white ring-1 ring-slate-200">
    <span className={`h-4 w-full ${c}`} />
    <span className="mx-0.5 h-0.5 w-3/4 self-start rounded-full bg-slate-200" />
    <span className="mx-0.5 mb-0.5 h-0.5 w-1/2 self-start rounded-full bg-emerald-300" />
  </span>
);

export const SECTION_THUMBS: Record<string, React.FC> = {
  announcement: () => (
    <div className="flex h-full w-full items-center justify-center gap-1 bg-slate-700 px-2">
      <Bar w="w-8" c="bg-white/80" />
      <Bar w="w-12" c="bg-white/50" />
    </div>
  ),
  header: () => (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
        <span className="flex gap-0.5">
          <span className="h-2 w-2 rounded-sm bg-slate-200" />
          <span className="h-2 w-2 rounded-sm bg-emerald-400" />
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 py-1">
        {[0, 1, 2].map((i) => (
          <Bar key={i} w="w-6" c="bg-slate-200" />
        ))}
      </div>
    </div>
  ),
  hero: () => (
    <div className="relative h-full w-full bg-gradient-to-l from-emerald-500 to-teal-600 p-2">
      <span className="absolute right-2 top-2 block h-1.5 w-12 rounded-full bg-white/90" />
      <span className="absolute right-2 top-6 block h-1 w-16 rounded-full bg-white/60" />
      <span className="absolute bottom-2 right-2 block h-2.5 w-8 rounded-sm bg-white/90" />
      <span className="absolute bottom-1 left-2 top-1 w-1/3 rounded-md bg-white/30" />
    </div>
  ),
  categories: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-white px-2">
      <Bar w="w-14" c="bg-slate-300" />
      <div className="flex w-full items-start justify-around">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex flex-col items-center gap-0.5">
            <span className="h-5 w-5 rounded-full bg-emerald-100 ring-1 ring-emerald-300" />
            <Bar w="w-3" h="h-0.5" c="bg-slate-200" />
          </span>
        ))}
      </div>
    </div>
  ),
  products: () => (
    <div className="grid h-full w-full grid-cols-3 content-center gap-1 bg-slate-50 p-2">
      {[0, 1, 2].map((i) => (
        <MiniCard key={i} />
      ))}
    </div>
  ),
  products_by_category: () => (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 bg-white p-2">
      {[0, 1].map((g) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-200" />
          <Bar w="w-8" h="h-0.5" c="bg-slate-300" />
          <div className="ms-auto grid flex-1 max-w-[60%] grid-cols-3 gap-0.5">
            {[0, 1, 2].map((i) => (
              <MiniCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  offers: () => (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-l from-orange-500 to-amber-500">
      <span className="rounded-sm bg-white px-2 py-0.5 text-[7px] font-black text-orange-600">خصم %</span>
      <span className="absolute left-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
    </div>
  ),
  banners: () => (
    <div className="grid h-full w-full grid-cols-2 gap-1 bg-white p-2">
      <span className="rounded-md bg-gradient-to-br from-sky-400 to-blue-500" />
      <span className="rounded-md bg-gradient-to-br from-fuchsia-400 to-purple-500" />
    </div>
  ),
  features: () => (
    <div className="flex h-full w-full items-center justify-around bg-white px-2">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="flex flex-col items-center gap-0.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[6px]">✓</span>
          <Bar w="w-4" h="h-0.5" c="bg-slate-200" />
        </span>
      ))}
    </div>
  ),
  reviews: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-50 p-2">
      <span className="text-[8px] tracking-wider text-amber-400">★★★★★</span>
      <Bar w="w-20" c="bg-slate-200" />
      <Bar w="w-14" c="bg-slate-200" />
    </div>
  ),
  faq: () => (
    <div className="flex h-full w-full flex-col justify-center gap-1 bg-white p-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center justify-between rounded-sm bg-slate-50 px-1.5 py-1 ring-1 ring-slate-100">
          <Bar w="w-10" h="h-0.5" c="bg-slate-300" />
          <span className="text-[7px] leading-none text-slate-400">+</span>
        </span>
      ))}
    </div>
  ),
  video: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[8px] text-slate-800">▶</span>
    </div>
  ),
  newsletter: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-emerald-50 p-2">
      <Bar w="w-16" c="bg-emerald-300" />
      <span className="flex w-full max-w-[80%] overflow-hidden rounded-sm bg-white ring-1 ring-emerald-200">
        <span className="h-3 flex-1" />
        <span className="w-6 bg-emerald-500" />
      </span>
    </div>
  ),
  contact: () => (
    <div className="flex h-full w-full flex-col justify-center gap-1 bg-white p-2">
      <Bar w="w-10" c="bg-slate-300" />
      <span className="h-2 w-full rounded-sm bg-slate-100 ring-1 ring-slate-200" />
      <span className="h-2 w-full rounded-sm bg-slate-100 ring-1 ring-slate-200" />
      <span className="h-2 w-1/3 rounded-sm bg-emerald-400" />
    </div>
  ),
  custom: () => (
    <div className="flex h-full w-full items-center justify-center gap-1 bg-slate-900 font-mono text-[9px] text-emerald-400">
      {'</>'}
    </div>
  ),
};

const FallbackThumb: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-slate-50">
    <span className="h-2 w-10 rounded-full bg-slate-200" />
  </div>
);

export const SectionLibrary: React.FC<Props> = ({ onAdd }) => {
  const metas = React.useMemo(() => getAllSectionMetas(), []);

  return (
    <div className="flex h-full flex-col overflow-hidden border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3.5">
        <h2 className="text-sm font-extrabold text-slate-800">مكتبة الأقسام</h2>
        <p className="mt-0.5 text-[11px] text-slate-400">اسحب القسم إلى اللوحة أو اضغط لإضافته</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <Droppable droppableId="library" isDropDisabled>
          {(droppableProvided) => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {GROUPS.map((group) => {
                const items = metas.filter((m) => m.group === group.key);
                if (!items.length) return null;
                return (
                  <div key={group.key}>
                    <div className="px-1 pt-4 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      {group.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((meta: BuilderSectionMeta, index: number) => {
                        const Thumb = SECTION_THUMBS[meta.type] || FallbackThumb;
                        return (
                          <Draggable key={meta.type} draggableId={`lib:${meta.type}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group relative cursor-grab overflow-hidden rounded-xl border transition ${
                                  snapshot.isDragging
                                    ? 'border-emerald-400 shadow-lg'
                                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                                }`}
                                title={meta.description}
                              >
                                {/* Visual mockup */}
                                <div className="aspect-[16/10] w-full bg-slate-50">
                                  <Thumb />
                                </div>
                                {/* Name strip */}
                                <div className="flex items-center justify-between gap-1 border-t border-slate-100 bg-white px-2 py-1.5">
                                  <p className="truncate text-[11px] font-bold text-slate-700">{meta.name}</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdd(meta.type);
                                    }}
                                    aria-label={`إضافة ${meta.name}`}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:border-emerald-400 hover:text-emerald-600"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};
