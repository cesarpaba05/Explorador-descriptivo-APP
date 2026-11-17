import { useState } from 'react';
import { Percent, Plus, X } from 'lucide-react';
import type { DataRow, NumberUnit, VariableConfig } from '../../types/data';
import { formatCOInt, formatWithUnit } from '../../utils/formatters';
import { computeQuantile, extractNumericValues } from '../../utils/statistics';
import { HelpTooltip } from '../HelpTooltip';

interface Step10QuantilesProps {
  rows: DataRow[];
  configs: VariableConfig[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  customPercentiles: number[];
  onChangeCustomPercentiles: (pcts: number[]) => void;
  unit: NumberUnit;
}

export function Step10Quantiles({
  rows,
  configs,
  selectedVar,
  onSelectVar,
  customPercentiles,
  onChangeCustomPercentiles,
  unit,
}: Step10QuantilesProps) {
  const [newPctInput, setNewPctInput] = useState('95');
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const activeCfg = numericCols.find((c) => c.name === selectedVar) || numericCols[0];

  if (!activeCfg) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay variables numéricas disponibles para calcular cuartiles y percentiles.
      </div>
    );
  }

  const allProbs = Array.from(
    new Set([25, 50, 75, ...customPercentiles.filter((p) => p > 0 && p < 100)])
  ).sort((a, b) => a - b);

  const addPercentile = () => {
    const parsed = Number(newPctInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) return;
    const rounded = Math.round(parsed);
    if (!customPercentiles.includes(rounded)) {
      onChangeCustomPercentiles([...customPercentiles, rounded].sort((a, b) => a - b));
    }
    setNewPctInput('');
  };

  const removePercentile = (p: number) => {
    onChangeCustomPercentiles(customPercentiles.filter((x) => x !== p));
  };

  const activeVals = extractNumericValues(rows, activeCfg.name).sort((a, b) => a - b);
  const fmtActive = (v: number) =>
    formatWithUnit(v, unit, { isProportion01: activeCfg.isProportion01 });
  const maxActive = activeVals.length > 0 ? activeVals[activeVals.length - 1] : 0;
  const highestCustom =
    allProbs.length > 0 ? allProbs[allProbs.length - 1] : 90;
  const highestCustomVal =
    activeVals.length > 0 ? computeQuantile(activeVals, highestCustom / 100) : 0;

  return (
    <div className="space-y-6">
      {/* Controls: Variable + Custom percentiles */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Percent className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Cuartiles y percentiles personalizados (<code className="font-mono">quantile(..., type = 7)</code>)
              </h2>
              <p className="text-xs text-slate-500">
                Elige los percentiles que quieres inspeccionar para una variable y para toda la base numérica a la vez.
              </p>
            </div>
            <HelpTooltip metricKey="cuantiles" />
          </div>

          <select
            value={activeCfg.name}
            onChange={(e) => onSelectVar(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            {numericCols.map((c) => (
              <option key={c.name} value={c.name}>
                Detalle: {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom percentiles chips + add control */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600 mr-1">
            Percentiles activos:
          </span>
          {allProbs.map((p) => {
            const isQuartile = p === 25 || p === 50 || p === 75;
            return (
              <span
                key={p}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold ${
                  isQuartile
                    ? 'border-blue-200 bg-blue-50 text-blue-900'
                    : 'border-teal-200 bg-teal-50 text-teal-900'
                }`}
              >
                <span>P{p}</span>
                {!isQuartile && (
                  <button
                    type="button"
                    onClick={() => removePercentile(p)}
                    aria-label={`Quitar percentil ${p}`}
                    className="rounded p-0.5 text-teal-700 hover:bg-teal-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}

          <div className="inline-flex items-center gap-1.5 ml-2">
            <input
              type="number"
              min={1}
              max={99}
              value={newPctInput}
              onChange={(e) => setNewPctInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPercentile();
              }}
              placeholder="Ej. 90"
              aria-label="Agregar percentil"
              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={addPercentile}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar %</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onChangeCustomPercentiles([10, 45, 90])}
            className="ml-auto text-xs font-medium text-blue-700 hover:underline"
          >
            Usar ejemplo taller (10%, 45%, 90%)
          </button>
        </div>
      </div>

      {/* Single variable business interpretation cards */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Interpretación práctica para «{activeCfg.name}» ({formatCOInt(activeVals.length)} registros)
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
          {allProbs.map((p) => {
            const val = activeVals.length > 0 ? computeQuantile(activeVals, p / 100) : 0;
            return (
              <div
                key={p}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="text-[11px] font-medium text-slate-500">
                  Percentil {p}%{p === 50 ? ' (Mediana)' : ''}
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                  {fmtActive(val)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs leading-relaxed text-slate-800">
          <strong className="font-semibold text-blue-950">Traducción a lenguaje de negocio:</strong>{' '}
          El <strong>{highestCustom}%</strong> de los registros en «{activeCfg.name}» tiene un valor igual o menor a{' '}
          <strong>{fmtActive(highestCustomVal)}</strong>, mientras que el valor máximo registrado sube hasta{' '}
          <strong>{fmtActive(maxActive)}</strong>.{' '}
          {highestCustomVal > 0 && maxActive > highestCustomVal * 1.5
            ? `Esto demuestra que el ${100 - highestCustom}% superior alcanza cifras notablemente más altas que el grueso de la base.`
            : 'La transición hacia el máximo es gradual sin saltos desproporcionados.'}
        </div>
      </div>

      {/* Matrix of quantiles across ALL numeric variables simultaneously */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Cuantiles aplicados a todas las variables numéricas a la vez (<code className="font-mono">apply(quantile)</code>)
          </h3>
          <p className="text-xs text-slate-500">
            Compara de un vistazo la escala completa desde el mínimo hasta los percentiles superiores de cada columna.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Variable</th>
                <th className="px-3 py-3 font-semibold text-right">Mín. (0%)</th>
                {allProbs.map((p) => (
                  <th key={p} className="px-3 py-3 font-semibold text-right">
                    P{p}%
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-right">Máx. (100%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {numericCols.map((c) => {
                const sorted = extractNumericValues(rows, c.name).sort((a, b) => a - b);
                const fmt = (v: number) =>
                  formatWithUnit(v, unit, { isProportion01: c.isProportion01, compact: true });
                return (
                  <tr
                    key={c.name}
                    onClick={() => onSelectVar(c.name)}
                    className={`cursor-pointer transition-colors ${
                      c.name === activeCfg.name ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {sorted.length > 0 ? fmt(sorted[0]) : '—'}
                    </td>
                    {allProbs.map((p) => (
                      <td
                        key={p}
                        className={`px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                          p === 50 ? 'font-bold text-teal-800' : 'text-slate-800'
                        }`}
                      >
                        {sorted.length > 0 ? fmt(computeQuantile(sorted, p / 100)) : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {sorted.length > 0 ? fmt(sorted[sorted.length - 1]) : '—'}
                    </td>
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
