import { useState } from 'react';
import { Table } from 'lucide-react';
import type { DataRow, NumberUnit, VariableConfig } from '../../types/data';
import { formatCellForDisplay, formatCOInt, UNIT_LABELS } from '../../utils/formatters';

interface Step03PreviewProps {
  rows: DataRow[];
  configs: VariableConfig[];
  datasetName: string;
  unit: NumberUnit;
  timeCol: string | null;
}

export function Step03Preview({
  rows,
  configs,
  datasetName,
  unit,
  timeCol,
}: Step03PreviewProps) {
  const [limit, setLimit] = useState<number>(5);
  const previewRows = rows.slice(0, limit);
  const numCount = configs.filter((c) => c.role === 'numeric').length;
  const catCount = configs.filter((c) => c.role === 'categorical').length;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-blue-600" />
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Filas (Registros)</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(rows.length)}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-indigo-600" />
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Columnas (Variables)</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(configs.length)}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-teal-600" />
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">Numéricas detectadas</div>
            <div className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
              {formatCOInt(numCount)}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-4">
            <div className="text-xs font-medium text-slate-500">
              {timeCol ? 'Estructura temporal' : 'Categóricas detectadas'}
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-700 tabular-nums truncate">
              {timeCol ? `Tiempo (${timeCol})` : formatCOInt(catCount)}
            </div>
          </div>
        </div>
      </div>

      {/* Head(3) / Head(5) table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Table className="h-4.5 w-4.5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Primeras {limit} filas (equivalente a head({limit})) — {datasetName}
              </h2>
              <p className="text-xs text-slate-500">
                Mostrando {formatCOInt(previewRows.length)} de {formatCOInt(rows.length)} registros · Unidad activa: {UNIT_LABELS[unit]}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { n: 3, label: 'Primeras 3 (head 3)' },
              { n: 5, label: 'Primeras 5 (head 5)' },
              { n: 10, label: '10 filas' },
              { n: 20, label: '20 filas' },
            ].map((opt) => (
              <button
                key={opt.n}
                type="button"
                onClick={() => setLimit(opt.n)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  limit === opt.n
                    ? 'bg-white text-blue-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 font-semibold text-slate-500 border-r border-slate-200">
                  #
                </th>
                {configs.map((col) => (
                  <th
                    key={col.name}
                    className={`px-3.5 py-2.5 font-semibold text-slate-700 whitespace-nowrap ${
                      col.role === 'numeric' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div>{col.name}</div>
                    <div className="text-[11px] font-normal text-slate-400">
                      {col.role === 'time'
                        ? 'Tiempo'
                        : col.isProportion01
                          ? 'Proporción (%)'
                          : col.role === 'numeric'
                            ? 'Numérica'
                            : 'Categórica'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30">
                  <td className="sticky left-0 bg-white px-3 py-2 font-mono text-slate-400 border-r border-slate-100 tabular-nums">
                    {idx + 1}
                  </td>
                  {configs.map((col) => {
                    const raw = row[col.name];
                    const formatted = formatCellForDisplay(
                      raw,
                      col.role,
                      unit,
                      col.isProportion01
                    );
                    const isEmpty = formatted === 'Sin dato';
                    return (
                      <td
                        key={col.name}
                        className={`px-3.5 py-2 whitespace-nowrap ${
                          col.role === 'numeric'
                            ? 'text-right font-mono tabular-nums'
                            : col.role === 'time'
                              ? 'font-mono font-semibold text-blue-800'
                              : 'text-left'
                        } ${isEmpty ? 'italic text-amber-700' : 'text-slate-800'}`}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
