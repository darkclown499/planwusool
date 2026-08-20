import React, { useMemo } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { LayoutGrid, Plus } from 'lucide-react';
import { getAllSectionMetas } from '@/builder';
import type { BuilderSectionMeta } from '@/builder/types';
import { SECTION_ICONS } from './controls';

type Props = {
  onAdd: (type: string) => void;
};

const GROUPS: Array<{ key: string; name: string }> = [
  { key: 'أساسيات', name: 'أساسيات المتجر' },
  { key: 'منتجات', name: 'المنتجات' },
  { key: 'تسويق', name: 'التسويق' },
  { key: 'تواصل اجتماعي', name: 'التواصل الاجتماعي' },
];

export const SectionLibrary: React.FC<Props> = ({ onAdd }) => {
  const metas = useMemo(() => getAllSectionMetas(), []);

  return (
    <div className="flex h-full flex-col overflow-hidden border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
          <LayoutGrid className="h-4 w-4 text-emerald-600" />
          مكتبة السيكشنات
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-400">اسحب سيكشن إلى اللوحة أو اضغط لإضافته</p>
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
                    <div className="space-y-2">
                      {items.map((meta: BuilderSectionMeta, index: number) => (
                        <Draggable key={meta.type} draggableId={`lib:${meta.type}`} index={index}>
                          {(provided, snapshot) => {
                            const Icon = SECTION_ICONS[meta.icon] || Plus;
                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group flex cursor-grab items-center gap-3 rounded-xl border p-3 transition ${
                                  snapshot.isDragging ? 'border-emerald-400 bg-emerald-50 shadow-lg' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                                }`}
                              >
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    snapshot.isDragging ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  <Icon className="h-[18px] w-[18px]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-bold text-slate-800">{meta.name}</p>
                                  <p className="truncate text-[11px] text-slate-400">{meta.description}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd(meta.type);
                                  }}
                                  aria-label={`إضافة ${meta.name}`}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:border-emerald-400 hover:text-emerald-600"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          }}
                        </Draggable>
                      ))}
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