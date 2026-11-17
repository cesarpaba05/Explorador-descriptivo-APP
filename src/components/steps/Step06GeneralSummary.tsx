import { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layers, ScatterChart as ScatterIcon, Table2 } from 'lucide-react';
import type {
  CategoricalStats,
  DataRow,
  DescriptiveStats,
  NumberUnit,
  VariableConfig,
} from '../../types/data';
import { formatCOInt, formatCOPercent, formatWithUnit } from '../../utils/formatters';
import { computeBoxplotSummary } from '../../utils/statistics';
import { HelpTooltip } from '../HelpTooltip';

interface Step06GeneralSummaryProps {
  rows: DataRow[];
  configs: VariableConfig[];
  descStats: DescriptiveStats[];
  catStats: CategoricalStats[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  unit: NumberUnit;
}

export function Step06GeneralSummary({
  rows,
  configs,
  descStats,
  catStats,
  selectedVar,
  onSelectVar,
  unit,
}: Step06GeneralSummaryProps) {
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const activeStats = descStats.find((s) => s.column === selectedVar) || descStats[0];

  const { dotPoints, lowerFence, upperFence } = useMemo(() => {
    if (!activeStats) return { dotPoints: [], lowerFence: 0, upperFence: 0 };
    const box = computeBoxplotSummary(rows, activeStats.column);
    const pts: Array<{
      rowIndex: number;
      value: number;
      isOutlier: boolean;
    }> = [];
    rows.forEach((row, idx) => {
      const v = row[activeStats.column];
      if (typeof v === 'number' && Number.isFinite(v)) {
        pts.push({
          rowIndex: idx + 1,
          value: v,
          isOutlier: v < box.lowerFence || v > box.upperFence,
        });
      }
    });
    return {
      dotPoints: pts,
      lowerFence: box.lowerFence,
      upperFence: box.upperFence,
    };
  }, [rows, activeStats]);

  return (
    <div className="space-y-6">
      {/* Numeric summary() table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Table2 className="h-4.5 w-4.5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Resumen general numérico (equivalente a <code className="font-mono">summary()</code> en R)
              </h2>
              <p className="text-xs text-slate-500">
                Mínimo, Q1 (25%), Mediana (50%), Media, Q3 (75%), Máximo y NAs de cada columna numérica.
              </p>
            </div>
            <HelpTooltip metricKey="summary_r" />
          </div>
        </div>

        {descStats.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            No hay variables clasificadas como Numérica. Puedes ajustar el tipo en el Paso 4.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Variable</th>
                  <th className="px-3 py-3 font-semibold text-right">n válidos</th>
                  <th className="px-3 py-3 font-semibold text-right">Mín.</th>
                  <th className="px-3 py-3 font-semibold text-right">1er Cuartil (Q1)</th>
                  <th className="px-3 py-3 font-semibold text-right">Mediana</th>
                  <th className="px-3 py-3 font-semibold text-right">Media</th>
                  <th className="px-3 py-3 font-semibold text-right">3er Cuartil (Q3)</th>
                  <th className="px-3 py-3 font-semibold text-right">Máx.</th>
                  <th className="px-3 py-3 font-semibold text-right">NAs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {descStats.map((s) => {
                  const fmt = (v: number) =>
                    formatWithUnit(v, unit, { isProportion01: s.isProportion01, compact: true });
                  const isSel = activeStats?.column === s.column;
                  return (
                    <tr
                      key={s.column}
                      onClick={() => onSelectVar(s.column)}
                      className={`cursor-pointer transition-colors ${
                        isSel ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {s.column}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {formatCOInt(s.n)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {fmt(s.min)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {fmt(s.q1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-teal-800 tabular-nums">
                        {fmt(s.median)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-blue-800 tabular-nums">
                        {fmt(s.mean)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {fmt(s.q3)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {fmt(s.max)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500 tabular-nums">
                        {formatCOInt(s.missing)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Categorical summary() block */}
      {catStats.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4.5 w-4.5 text-teal-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Resumen de variables categóricas (conteos en <code className="font-mono">summary()</code>)
              </h3>
              <p className="text-xs text-slate-500">
                Categorías más frecuentes y cantidad de niveles distintos por cada factor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catStats.map((c) => (
              <div key={c.column} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">{c.column}</span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {formatCOInt(c.uniqueCount)} niveles · {formatCOInt(c.n)} vál.
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {c.frequencies.slice(0, 4).map((f) => (
                    <div key={f.category} className="flex items-center justify-between gap-2">
                      <span className="text-slate-700 truncate">{f.category}</span>
                      <span className="font-mono text-slate-900 tabular-nums">
                        {formatCOInt(f.count)} ({formatCOPercent(f.pct, 1)})
                      </span>
                    </div>
                  ))}
                  {c.frequencies.length > 4 && (
                    <div className="text-[11px] text-slate-400">
                      + {formatCOInt(c.frequencies.length - 4)} categorías adicionales
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive dot plot (plot(base$var)) */}
      {activeStats && numericCols.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ScatterIcon className="h-4.5 w-4.5 text-blue-700" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Gráfico de puntos por registro (<code className="font-mono">plot({activeStats.column})</code>)
                </h3>
                <p className="text-xs text-slate-500">
                  Permite ver visualmente cada fila en orden. Los puntos en rojo quedan fuera de los límites esperados (atípicos).
                </p>
              </div>
              <HelpTooltip metricKey="plot_puntos" />
            </div>

            <select
              value={activeStats.column}
              onChange={(e) => onSelectVar(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  Variable: {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 20, left: 16, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="rowIndex"
                  name="Fila"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{
                    value: 'Índice de registro (fila)',
                    position: 'insideBottom',
                    offset: -8,
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name={activeStats.column}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: number) =>
                    formatWithUnit(v, unit, {
                      isProportion01: activeStats.isProportion01,
                      compact: true,
                    })
                  }
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value) => [
                    formatWithUnit(Number(value ?? 0), unit, {
                      isProportion01: activeStats.isProportion01,
                    }),
                    activeStats.column,
                  ]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.rowIndex
                      ? `Fila ${payload[0].payload.rowIndex}`
                      : ''
                  }
                />
                <ReferenceLine
                  y={activeStats.median}
                  stroke="#0f766e"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Mediana',
                    position: 'insideTopRight',
                    fill: '#0f766e',
                    fontSize: 11,
                  }}
                />
                <Scatter name={activeStats.column} data={dotPoints}>
                  {dotPoints.map((pt, i) => (
                    <Cell
                      key={i}
                      fill={pt.isOutlier ? '#dc2626' : '#1d4ed8'}
                      fillOpacity={pt.isOutlier ? 0.9 : 0.65}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-700 inline-block" />
              Registros dentro del rango normal ({formatWithUnit(lowerFence, unit, { isProportion01: activeStats.isProportion01 })} a {formatWithUnit(upperFence, unit, { isProportion01: activeStats.isProportion01 })})
            </span>
            <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" />
              Valores alejados / atípicos ({formatCOInt(dotPoints.filter((d) => d.isOutlier).length)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
