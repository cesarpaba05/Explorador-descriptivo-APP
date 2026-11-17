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
import { Info, ListChecks } from 'lucide-react';
import type { CategoricalStats } from '../../types/data';
import { formatCOInt, formatCOPercent } from '../../utils/formatters';
import { HelpTooltip } from '../HelpTooltip';

interface Step13CategoricalProps {
  catStats: CategoricalStats[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  onGoToStep4: () => void;
}

const BAR_PALETTE = [
  '#0f766e',
  '#1d4ed8',
  '#4338ca',
  '#0369a1',
  '#d97706',
  '#64748b',
];

export function Step13Categorical({
  catStats,
  selectedVar,
  onSelectVar,
  onGoToStep4,
}: Step13CategoricalProps) {
  const active = catStats.find((c) => c.column === selectedVar) || catStats[0];

  if (!active) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <ListChecks className="mx-auto h-10 w-10 text-slate-400 mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          No hay variables categóricas clasificadas en esta base
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          En las series puramente numéricas es normal no tener categorías. Si tu base sí tiene códigos (ej. 1 = Bogotá) o columnas binarias 0/1 que quieras tabular aquí, puedes convertirlas a Categórica (factor) en el Paso 4.
        </p>
        <button
          type="button"
          onClick={onGoToStep4}
          className="mt-4 rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
        >
          Revisar tipos en el Paso 4
        </button>
      </div>
    );
  }

  const chartData = active.frequencies.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
              <ListChecks className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Frecuencias (<code className="font-mono">table</code>) y proporciones (<code className="font-mono">prop.table</code>) — {active.column}
              </h2>
              <p className="text-xs text-slate-500">
                {formatCOInt(active.n)} registros válidos · {formatCOInt(active.uniqueCount)} categorías distintas · {formatCOInt(active.missing)} faltantes.
              </p>
            </div>
            <HelpTooltip metricKey="frecuencias" />
          </div>

          <select
            value={active.column}
            onChange={(e) => onSelectVar(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            {catStats.map((c) => (
              <option key={c.column} value={c.column}>
                {c.column} ({formatCOInt(c.uniqueCount)} cat.)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special 0/1 mean = % explanation */}
      {active.isBinary01 && active.binaryMeanAsPct !== null && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-700 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-800">
              <strong className="font-semibold text-blue-950">
                Variable binaria 0/1 detectada: la media aritmética equivale al porcentaje de casos «1»
              </strong>
              <p className="mt-1">
                En «{active.column}», exactamente el <strong>{formatCOPercent(active.binaryMeanAsPct, 1)}</strong> de los registros válidos tiene valor <strong>1</strong> (y el {formatCOPercent(100 - active.binaryMeanAsPct, 1)} tiene valor <strong>0</strong>). En R, <code className="font-mono">mean(x)</code> entrega esta misma proporción.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ordered bar chart + table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Gráfico de barras ordenado (<code className="font-mono">barplot</code>)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Categorías ordenadas de mayor a menor frecuencia absoluta.
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 6, right: 28, left: 16, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  tick={{ fontSize: 11, fill: '#1e293b' }}
                />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${formatCOInt(Number(value ?? 0))} (${formatCOPercent(Number((item?.payload as { pct?: number } | undefined)?.pct ?? 0), 1)})`,
                    'Frecuencia',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={BAR_PALETTE[idx % BAR_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Tabla de frecuencias y porcentajes
            </h3>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 sticky top-0">
                  <th className="px-4 py-2.5 font-semibold">Categoría</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Frecuencia (n)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Proporción (%)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">% Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.frequencies.map((f) => (
                  <tr key={f.category} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{f.category}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800 tabular-nums">
                      {formatCOInt(f.count)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-teal-800 tabular-nums">
                      {formatCOPercent(f.pct, 1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500 tabular-nums">
                      {formatCOPercent(f.cumPct, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
