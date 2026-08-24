import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Eye, EyeOff, GripVertical, Trash2, Plus } from 'lucide-react';
import { getSectionMeta } from '@/builder';
import type { BuilderSectionConfig, TemplateFamily } from '@/builder/types';
import { getFamilySectionComponent } from '@/themes/registry';
import '@/themes/load-families';
import { SECTION_ICONS } from './controls';

type Props = {
  sections: BuilderSectionConfig[];
  storeData?: any;
  /** The active template's design family — resolves each section to that
   *  family's bespoke component so the canvas preview matches the live
   *  storefront exactly, instead of always falling back to the generic one. */
  family?: TemplateFamily | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
};

export const Canvas: React.FC<Props> = ({ sections, storeData, family, selectedId, onSelect, onToggleEnabled, onDelete }) => {
  return (
    <Droppable droppableId="canvas">
      {(droppableProvided, snapshot) => (
        <div
          ref={droppableProvided.innerRef}
          {...droppableProvided.droppableProps}
          className={`h-full overflow-y-auto px-5 py-6 ${snapshot.isDraggingOver ? 'bg-emerald-50/50' : ''}`}
        >
          {sections.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <Plus className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">اللوحة فارغة</p>
              <p className="text-xs text-slate-400">اسحب سيكشن من المكتبة أو اضغط على «+» لإضافته</p>
            </div>
          )}

          {sections.map((section, index) => {
            const Component = getFamilySectionComponent(family, section.type);
            const meta = getSectionMeta(section.type);
            const Icon = meta ? SECTION_ICONS[meta.icon] || Plus : Plus;
            if (!Component) return null;
            const selected = selectedId === section.id;

            return (
              <Draggable key={section.id} draggableId={section.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    onClick={() => onSelect(section.id)}
                    className={`group relative mb-5 overflow-hidden rounded-2xl border-2 transition ${
                      selected
                        ? 'border-emerald-500 shadow-xl shadow-emerald-100'
                        : 'border-slate-200 hover:border-emerald-200'
                    } ${snapshot.isDragging ? 'opacity-90 shadow-2xl' : ''}`}
                  >
                    {/* Toolbar */}
                    <div
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between gap-2 border-b px-3 py-1.5 ${
                        selected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 cursor-grab text-slate-300" />
                        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
                        <span className="text-xs font-bold text-slate-600">
                          {meta?.name || section.type}
                          <span className="ms-2 text-[10px] font-medium text-slate-400">#{index + 1}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEnabled(section.id, !section.enabled);
                          }}
                          aria-label={section.enabled ? 'إخفاء' : 'إظهار'}
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                            section.enabled ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(section.id);
                          }}
                          aria-label="حذف"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live section preview */}
                    <div className="pointer-events-none relative">
                      <div className="pointer-events-auto">
                        <Component section={section} storeData={storeData} mode="edit" />
                      </div>
                    </div>

                    {!section.enabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100/60 backdrop-blur-[1px]">
                        <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-500 shadow">
                          السيكشن مخفي مؤقتاً
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            );
          })}
          {droppableProvided.placeholder}
        </div>
      )}
    </Droppable>
  );
};