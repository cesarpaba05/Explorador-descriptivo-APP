import { AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DescriptiveStats, NumberUnit, VariableConfig } from '../../types/data';
import { formatCOInt, formatCOPercent, formatWithUnit } from '../../utils/formatters';
import { HelpTooltip } from '../HelpTooltip';

interface Step07CentralTendencyProps {
  configs: VariableConfig[];
  descStats: DescriptiveStats[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  unit: NumberUnit;
}

export function Step07CentralTendency({
  configs,
  descStats,
  selectedVar,
  onSelectVar,
  unit,
}: Step07CentralTendencyProps) {
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const active = descStats.find((s) => s.column === selectedVar) || descStats[0];

  if (!active || numericCols.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay variables numéricas disponibles para analizar tendencia central.
      </div>
    );
  }

  const fmt = (v: number) =>
    formatWithUnit(v, unit, { isProportion01: active.isProportion01 });

  const chartData = [
    { name: 'Media', value: active.mean, fill: '#1d4ed8' },
    { name: 'Mediana (50%)', value: active.median, fill: '#0f766e' },
    { name: 'Recortada 20%', value: active.trimmedMean20, fill: '#4338ca' },
  ];

  const diffPct =
    Math.abs(active.median) > 1e-9
      ? ((active.mean - active.median) / Math.abs(active.median)) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Variable selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Medidas de tendencia central — {active.column}
              </h2>
              <p className="text-xs text-slate-500">
                Basado en {formatCOInt(active.n)} observaciones válidas ({formatCOInt(active.missing)} faltantes ignorados con na.rm = TRUE).
              </p>
            </div>
          </div>

          <select
            value={active.column}
            onChange={(e) => onSelectVar(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            {numericCols.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert if mean >> median */}
      {active.skewMeanMedianAlert ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-950">
              <div className="font-semibold text-sm">
                Alerta de sesgo: la media supera a la mediana en {formatCOPercent(Math.abs(diffPct), 1)}
              </div>
              <p className="mt-1">
                {active.skewMeanMedianDirection === 'high'
                  ? `Unos pocos valores muy altos están jalando el promedio (${fmt(active.mean)}) hacia arriba. La mediana (${fmt(active.median)}) y la media recortada al 20% (${fmt(active.trimmedMean20)}) describen mucho mejor el caso típico de negocio.`
                  : `Algunos valores muy bajos jalan el promedio (${fmt(active.mean)}) por debajo de la mediana (${fmt(active.median)}). Apóyate en la mediana y la media recortada (${fmt(active.trimmedMean20)}).`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
            <div className="text-xs leading-relaxed text-emerald-950">
              <span className="font-semibold">Centro equilibrado:</span> la media ({fmt(active.mean)}) y la mediana ({fmt(active.median)}) están muy cercanas entre sí, lo que confirma que el promedio representa bien el nivel habitual.
            </div>
          </div>
        </div>
      )}

      {/* 4 Central tendency KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-blue-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Media aritmética</span>
              <HelpTooltip metricKey="media" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {fmt(active.mean)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Promedio simple (mean)</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-teal-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Mediana (50%)</span>
              <HelpTooltip metricKey="mediana" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-teal-800 tabular-nums">
              {fmt(active.median)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Mitad exacta sin sesgo extremo</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-indigo-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Media recortada 20%</span>
              <HelpTooltip metricKey="media_recortada" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-indigo-800 tabular-nums">
              {fmt(active.trimmedMean20)}
            </div>
            <p className="mt-1 text-xs text-slate-500">mean(x, trim = 0.2) en R</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Moda</span>
              <HelpTooltip metricKey="moda" align="right" />
            </div>
            <div className="mt-2 font-mono text-lg font-bold text-slate-900 tabular-nums truncate" title={active.modeLabel}>
              {active.mode !== null ? fmt(active.mode) : 'Sin moda única'}
            </div>
            <p className="mt-1 text-xs text-slate-500 truncate">{active.modeLabel}</p>
          </div>
        </div>
      </div>

      {/* Comparison bar chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Comparación visual del centro de «{active.column}»
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Cuando la barra azul (media) sobresale frente a las barras de mediana y media recortada, indica presencia de registros extremos altos.
        </p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 28, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: number) =>
                  formatWithUnit(v, unit, { isProportion01: active.isProportion01, compact: true })
                }
              />
              <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 12, fill: '#1e293b' }} />
              <Tooltip
                formatter={(v) => [fmt(Number(v ?? 0)), active.column]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
