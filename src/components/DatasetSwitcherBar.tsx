import { useState } from 'react';
import { Check, Database, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { DatasetWorkspace } from '../types/data';
import { formatCOInt } from '../utils/formatters';
import { sanitizeRObjectName } from '../utils/rCodeGenerator';

interface DatasetSwitcherBarProps {
  workspaces: DatasetWorkspace[];
  activeId: string | null;
  onSelectWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, shortName: string) => void;
  onRemoveWorkspace: (id: string) => void;
  onAddNewClick: () => void;
}

export function DatasetSwitcherBar({
  workspaces,
  activeId,
  onSelectWorkspace,
  onRenameWorkspace,
  onRemoveWorkspace,
  onAddNewClick,
}: DatasetSwitcherBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  if (workspaces.length === 0) return null;

  const startEdit = (ws: DatasetWorkspace) => {
    setEditingId(ws.id);
    setDraftName(ws.shortName);
  };

  const commitEdit = (id: string) => {
    onRenameWorkspace(id, sanitizeRObjectName(draftName));
    setEditingId(null);
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-1">
            <Database className="h-3.5 w-3.5 text-blue-700" />
            <span>Bases cargadas ({formatCOInt(workspaces.length)}):</span>
          </span>

          {workspaces.map((ws) => {
            const isActive = ws.id === activeId;
            const isEditing = editingId === ws.id;

            if (isEditing) {
              return (
                <div
                  key={ws.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-400 bg-white px-2 py-1 shadow-xs"
                >
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(ws.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    aria-label="Nombre corto de la base"
                    className="w-24 font-mono text-xs font-semibold text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => commitEdit(ws.id)}
                    aria-label="Guardar nombre"
                    className="rounded p-0.5 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancelar"
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={ws.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-700 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectWorkspace(ws.id)}
                  className="inline-flex items-center gap-1.5 font-medium"
                >
                  <span className="font-mono font-bold">{ws.shortName}</span>
                  <span className={isActive ? 'text-blue-100' : 'text-slate-400'}>
                    ({formatCOInt(ws.rawRows.length)} f)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => startEdit(ws)}
                  title="Cambiar nombre corto (objeto R)"
                  aria-label={`Renombrar ${ws.shortName}`}
                  className={`rounded p-0.5 ${
                    isActive
                      ? 'text-blue-200 hover:bg-blue-600 hover:text-white'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  <Pencil className="h-3 w-3" />
                </button>

                {workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveWorkspace(ws.id)}
                    title="Cerrar esta base"
                    aria-label={`Quitar ${ws.shortName}`}
                    className={`rounded p-0.5 ${
                      isActive
                        ? 'text-blue-200 hover:bg-blue-600 hover:text-white'
                        : 'text-slate-400 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddNewClick}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 text-blue-700" />
          <span>Cargar otra base</span>
        </button>
      </div>
    </div>
  );
}
