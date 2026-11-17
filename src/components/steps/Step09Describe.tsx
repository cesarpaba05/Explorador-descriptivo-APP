import { BarChart3, Sparkles } from 'lucide-react';
import type { DescriptiveStats, NumberUnit, TrafficLightStatus } from '../../types/data';
import {
  formatCO,
  formatCOInt,
  formatCOPercent,
  formatWithUnit,
} from '../../utils/formatters';
import { computeGeometricMean } from '../../utils/statistics';
import { HelpTooltip } from '../HelpTooltip';

interface Step09DescribeProps {
  descStats: DescriptiveStats[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  unit: NumberUnit;
}

function statusDotClass(level: TrafficLightStatus['level']) {
  if (level === 'verde') return 'bg-emerald-600';
  if (level === 'ambar') return 'bg-amber-500';
  return 'bg-red-600';
}

function statusTextClass(level: TrafficLightStatus['level']) {
  if (level === 'verde') return 'text-emerald-700';
  if (level === 'ambar') return 'text-amber-700';
  return 'text-red-700';
}

export function Step09Describe({
  descStats,
  selectedVar,
  onSelectVar,
  unit,
}: Step09DescribeProps) {
  const cvs = descStats
    .filter((s) => s.cv !== null && s.cv > 0 && !s.isBinary01)
    .map((s) => s.cv as number);
  const geomCV = computeGeometricMean(cvs);
  const logCandidates = descStats.filter((s) => s.suggestLogTransform);

  if (descStats.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay variables numéricas para calcular la tabla de descriptivos completos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPI strip: Geometric Mean of CVs + Skew count */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-indigo-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Media geométrica de los CV
              </span>
              <HelpTooltip metricKey="cv_geom" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-indigo-800 tabular-nums">
              {geomCV !== null ? formatCOPercent(geomCV, 1) : 'No aplica'}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Resumen global de variabilidad en {formatCOInt(cvs.length)} columnas
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-blue-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Variables con alta asimetría (|asim.| &gt; 1)
              </span>
              <HelpTooltip metricKey="asimetria" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(descStats.filter((s) => Math.abs(s.skewness) > 1).length)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Indica cola pronunciada por extremos altos o bajos
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="h-1 w-full bg-teal-600" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Variables con colas pesadas (curtosis &gt; 1)
              </span>
              <HelpTooltip metricKey="curtosis" align="right" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(descStats.filter((s) => s.kurtosis > 1).length)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Concentración central con casos alejados frecuentes
            </p>
          </div>
        </div>
      </div>

      {/* Full psych::describe table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-4.5 w-4.5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tabla de descriptivos completos (equivalente a <code className="font-mono">psych::describe()</code>)
              </h2>
              <p className="text-xs text-slate-500">
                Incluye n válidos, media, desviación, mediana, recortada 20%, MAD, mín, máx, rango, asimetría, curtosis, error estándar (SE) y CV.
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="se_error" align="right" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="sticky left-0 z-10 bg-slate-50 px-3.5 py-3 font-semibold border-r border-slate-200">
                  Variable
                </th>
                <th className="px-2.5 py-3 font-semibold text-right">n</th>
                <th className="px-2.5 py-3 font-semibold text-right">Media</th>
                <th className="px-2.5 py-3 font-semibold text-right">Desv.</th>
                <th className="px-2.5 py-3 font-semibold text-right">Mediana</th>
                <th className="px-2.5 py-3 font-semibold text-right">Recort. 20%</th>
                <th className="px-2.5 py-3 font-semibold text-right">MAD</th>
                <th className="px-2.5 py-3 font-semibold text-right">Mín.</th>
                <th className="px-2.5 py-3 font-semibold text-right">Máx.</th>
                <th className="px-2.5 py-3 font-semibold text-right">Rango</th>
                <th className="px-2.5 py-3 font-semibold text-right">Asim.</th>
                <th className="px-2.5 py-3 font-semibold text-right">Curt.</th>
                <th className="px-2.5 py-3 font-semibold text-right">SE</th>
                <th className="px-2.5 py-3 font-semibold text-right">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {descStats.map((s) => {
                const fmt = (v: number) =>
                  formatWithUnit(v, unit, { isProportion01: s.isProportion01, compact: true });
                const isSel = s.column === selectedVar;
                return (
                  <tr
                    key={s.column}
                    onClick={() => onSelectVar(s.column)}
                    className={`cursor-pointer transition-colors ${
                      isSel ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="sticky left-0 bg-white px-3.5 py-2.5 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                      {s.column}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {formatCOInt(s.n)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                      {fmt(s.mean)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {fmt(s.stdDev)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-bold text-teal-800 tabular-nums whitespace-nowrap">
                      {fmt(s.median)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-indigo-800 tabular-nums whitespace-nowrap">
                      {fmt(s.trimmedMean20)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {fmt(s.mad)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {fmt(s.min)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {fmt(s.max)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {fmt(s.range)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDotClass(s.skewStatus.level)}`} />
                        <span className={statusTextClass(s.skewStatus.level)}>
                          {formatCO(s.skewness, 2)}
                        </span>
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDotClass(s.kurtosisStatus.level)}`} />
                        <span className={statusTextClass(s.kurtosisStatus.level)}>
                          {formatCO(s.kurtosis, 2)}
                        </span>
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {fmt(s.se)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {s.cv !== null ? formatCOPercent(s.cv, 1) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log transform suggestion when high skewness */}
      {logCandidates.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-indigo-700 mt-0.5" />
            <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
              <div className="font-semibold text-indigo-950 text-sm">
                Sugerencia de transformación logarítmica (<code className="font-mono">log1p(x)</code>) por asimetría elevada
              </div>
              <p>
                Cuando una variable positiva tiene asimetría mayor a 1, transformar con logaritmo comprime la cola larga y ayuda si luego construyes modelos predictivos:
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {logCandidates.map((c) => (
                  <div
                    key={c.column}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-[11px]"
                  >
                    <div className="font-sans font-semibold text-slate-900">{c.column}</div>
                    <div className="text-slate-600">
                      Asimetría original: <strong className="text-red-700">{formatCO(c.skewness, 2)}</strong>
                      {c.logSkewness !== null && (
                        <>
                          {' → '}con log1p: <strong className="text-emerald-700">{formatCO(c.logSkewness, 2)}</strong>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
