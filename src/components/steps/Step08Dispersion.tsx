import { Activity } from 'lucide-react';
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
import type {
  DescriptiveStats,
  NumberUnit,
  TrafficLightStatus,
  VariableConfig,
} from '../../types/data';
import {
  formatCOAuto,
  formatCOInt,
  formatCOPercent,
  formatWithUnit,
} from '../../utils/formatters';
import { HelpTooltip } from '../HelpTooltip';

interface Step08DispersionProps {
  configs: VariableConfig[];
  descStats: DescriptiveStats[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  unit: NumberUnit;
}

function trafficColorClass(level: TrafficLightStatus['level']) {
  if (level === 'verde') return 'text-emerald-700';
  if (level === 'ambar') return 'text-amber-700';
  return 'text-red-700';
}

export function Step08Dispersion({
  configs,
  descStats,
  selectedVar,
  onSelectVar,
  unit,
}: Step08DispersionProps) {
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const active = descStats.find((s) => s.column === selectedVar) || descStats[0];

  if (!active || numericCols.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay variables numéricas disponibles para analizar dispersión.
      </div>
    );
  }

  const fmt = (v: number) =>
    formatWithUnit(v, unit, { isProportion01: active.isProportion01 });

  const cvRanking = [...descStats]
    .filter((s) => s.cv !== null && !s.isBinary01)
    .sort((a, b) => (b.cv ?? 0) - (a.cv ?? 0));

  const cvBarData = cvRanking.map((s) => ({
    name: s.column,
    cv: Number((s.cv ?? 0).toFixed(1)),
    level: s.cvStatus.level,
  }));

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Dispersión individual y comparación de CV en toda la base
              </h2>
              <p className="text-xs text-slate-500">
                Fórmulas de R con denominador muestral (n − 1) y MAD ajustada con constante 1,4826.
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
                Detalle de: {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6 Single-variable dispersion cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Rango (Máx − Mín)</span>
            <HelpTooltip metricKey="rango" align="right" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {fmt(active.range)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            De {fmt(active.min)} hasta {fmt(active.max)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Varianza muestral (n − 1)</span>
            <HelpTooltip metricKey="varianza" align="right" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatCOAuto(active.variance, 2)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Unidades al cuadrado (var en R)</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Desviación estándar (s)</span>
            <HelpTooltip metricKey="desviacion_estandar" align="right" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-blue-800 tabular-nums">
            {fmt(active.stdDev)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Distancia típica frente a la media</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Rango Intercuartílico (IQR)</span>
            <HelpTooltip metricKey="iqr" align="right" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-teal-800 tabular-nums">
            {fmt(active.iqr)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            50% central: Q1 ({fmt(active.q1)}) a Q3 ({fmt(active.q3)})
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">MAD (constante 1,4826)</span>
            <HelpTooltip metricKey="mad" align="right" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-indigo-800 tabular-nums">
            {fmt(active.mad)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Dispersión robusta resistente a extremos</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Coeficiente de Variación (CV)</span>
            <HelpTooltip metricKey="cv" align="right" />
          </div>
          <div className={`mt-2 font-mono text-xl font-bold tabular-nums ${trafficColorClass(active.cvStatus.level)}`}>
            {active.cv !== null ? formatCOPercent(active.cv, 1) : 'No aplica'}
          </div>
          <p className="mt-1 text-xs text-slate-600">{active.cvStatus.label}</p>
        </div>
      </div>

      {/* All numeric variables CV comparison (apply(base, 2, CV)) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Comparación de dispersión en todas las variables numéricas (<code className="font-mono">apply(CV)</code>)
            </h3>
            <p className="text-xs text-slate-500">
              Al expresar la dispersión en porcentaje (CV = desviación / |media| × 100), puedes comparar variables con distintas unidades y detectar cuál varía más.
            </p>
          </div>
          <HelpTooltip metricKey="cv" align="right" />
        </div>

        {cvBarData.length > 0 && (
          <div className="h-64 w-full mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cvBarData}
                layout="vertical"
                margin={{ top: 6, right: 32, left: 20, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: '#1e293b' }}
                />
                <Tooltip formatter={(v) => [`${formatCOAuto(Number(v ?? 0), 1)}%`, 'CV']} />
                <Bar dataKey="cv" radius={[0, 6, 6, 0]} barSize={22}>
                  {cvBarData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.level === 'rojo'
                          ? '#dc2626'
                          : entry.level === 'ambar'
                            ? '#d97706'
                            : '#0f766e'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-2.5 font-semibold">Variable</th>
                <th className="px-3 py-2.5 font-semibold text-right">n válidos</th>
                <th className="px-3 py-2.5 font-semibold text-right">Desv. Estándar</th>
                <th className="px-3 py-2.5 font-semibold text-right">IQR</th>
                <th className="px-3 py-2.5 font-semibold text-right">MAD (1,4826)</th>
                <th className="px-3 py-2.5 font-semibold text-right">CV (%)</th>
                <th className="px-3 py-2.5 font-semibold">Lectura de estabilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cvRanking.map((s) => {
                const f = (v: number) =>
                  formatWithUnit(v, unit, { isProportion01: s.isProportion01, compact: true });
                return (
                  <tr
                    key={s.column}
                    onClick={() => onSelectVar(s.column)}
                    className={`cursor-pointer transition-colors ${
                      s.column === active.column ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{s.column}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {formatCOInt(s.n)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {f(s.stdDev)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {f(s.iqr)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {f(s.mad)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold tabular-nums ${trafficColorClass(s.cvStatus.level)}`}>
                      {formatCOPercent(s.cv, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{s.cvStatus.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
