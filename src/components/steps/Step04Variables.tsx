import { AlertCircle, Info } from 'lucide-react';
import type { VariableConfig, VariableRole } from '../../types/data';
import { formatCOInt } from '../../utils/formatters';
import { HelpTooltip } from '../HelpTooltip';

interface Step04VariablesProps {
  configs: VariableConfig[];
  onChangeRole: (colName: string, role: VariableRole) => void;
  onToggleProportion01: (colName: string, isProp: boolean) => void;
  onToggleAllowNegative: (colName: string, allowNegative: boolean) => void;
}

export function Step04Variables({
  configs,
  onChangeRole,
  onToggleProportion01,
  onToggleAllowNegative,
}: Step04VariablesProps) {
  const pendingFactorSuggestions = configs.filter(
    (c) => c.suggestFactor && c.role === 'numeric'
  );

  return (
    <div className="space-y-6">
      {/* Educational explanation about numeric codes, factors & proportions */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-700 mt-0.5" />
            <div className="space-y-2 text-sm text-slate-800">
              <h3 className="font-semibold text-slate-900">
                Estructura de las variables (equivalente a <code className="font-mono">str()</code> y <code className="font-mono">class()</code> en R)
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                <strong className="font-semibold">
                  ¿Por qué un código numérico (ej. 1 = Bogotá, 2 = Medellín) NO se debe promediar?
                </strong>{' '}
                Porque aunque usa dígitos, es una etiqueta de categoría (un <code className="font-mono">factor</code> en R). Decir que «el promedio de ciudad es 1,85» no tiene ningún sentido de negocio. Cámbialo a <strong className="font-semibold">Categórica (factor)</strong> para contar frecuencias.
              </p>
              <p className="text-xs leading-relaxed text-slate-700">
                Distinguimos entre <strong className="font-semibold">Entero</strong>, <strong className="font-semibold">Decimal</strong>, <strong className="font-semibold">Categórica (factor)</strong> y <strong className="font-semibold">Tiempo</strong>. Además, si una columna trae proporciones entre 0 y 1 (ej. 0,34), puedes mostrarla como porcentaje (34,0%).
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="factor_r" align="right" />
        </div>
      </div>

      {/* Automatic suggestion banner for 0/1 or codes */}
      {pendingFactorSuggestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-700 mt-0.5" />
              <div className="text-xs text-amber-950">
                <span className="font-semibold">
                  Detectamos {formatCOInt(pendingFactorSuggestions.length)} variable(s) numérica(s) que parecen códigos o banderas 0/1:
                </span>{' '}
                <span className="font-mono font-semibold">
                  {pendingFactorSuggestions.map((c) => c.name).join(', ')}
                </span>
                . Si las usas para agrupar clientes o hacer tablas cruzadas, puedes convertirlas a Categórica (factor) con un clic.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingFactorSuggestions.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onChangeRole(c.name, 'categorical')}
                  className="rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Convertir «{c.name}» a factor
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Variables classification table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Clasificación de variables (ajuste manual disponible)
            </h2>
            <p className="text-xs text-slate-500">
              Marca solo una columna como «Tiempo» si tu archivo es una serie histórica por año, mes o fecha.
            </p>
          </div>
          <HelpTooltip metricKey="proporcion_01" align="right" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Variable</th>
                <th className="px-4 py-3 font-semibold">Clase detectada</th>
                <th className="px-4 py-3 font-semibold">Ejemplos</th>
                <th className="px-4 py-3 font-semibold text-right">Únicos</th>
                <th className="px-4 py-3 font-semibold">Rol para el análisis</th>
                <th className="px-4 py-3 font-semibold">¿Proporción (0–1)?</th>
                <th className="px-4 py-3 font-semibold">¿Permite negativos?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map((cfg) => {
                const classLabel =
                  cfg.role === 'time'
                    ? 'Tiempo (fecha/año)'
                    : cfg.role === 'categorical'
                      ? cfg.semanticHint === 'code'
                        ? 'Factor (código numérico)'
                        : 'Factor (categórica)'
                      : cfg.isBinary01
                        ? 'Entero binario (0/1)'
                        : cfg.isProportion01
                          ? 'Decimal (proporción 0–1)'
                          : cfg.numericSubType === 'integer'
                            ? 'Entero (integer)'
                            : 'Decimal (numeric)';

                return (
                  <tr key={cfg.name} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div>{cfg.name}</div>
                      {cfg.suggestFactor && cfg.role === 'numeric' && (
                        <div className="text-[11px] font-medium text-amber-700">
                          Sugerencia: considerar como factor
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                      {classLabel}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate font-mono">
                      {cfg.sampleValues.length > 0 ? cfg.sampleValues.join(' · ') : 'Sin datos'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {formatCOInt(cfg.uniqueCount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                        {(
                          [
                            { id: 'numeric', label: 'Numérica' },
                            { id: 'categorical', label: 'Categórica' },
                            { id: 'time', label: 'Tiempo' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onChangeRole(cfg.name, opt.id)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                              cfg.role === opt.id
                                ? 'bg-white text-blue-800 shadow-sm font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {cfg.role === 'numeric' ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={cfg.isProportion01}
                            onChange={(e) =>
                              onToggleProportion01(cfg.name, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                          />
                          <span>{cfg.isProportion01 ? 'Sí (ver en %)' : 'No'}</span>
                        </label>
                      ) : (
                        <span className="text-slate-400">No aplica</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {cfg.role === 'numeric' ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={cfg.allowNegative}
                            onChange={(e) =>
                              onToggleAllowNegative(cfg.name, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                          />
                          <span>{cfg.allowNegative ? 'Sí permite' : 'No (≥ 0)'}</span>
                        </label>
                      ) : (
                        <span className="text-slate-400">No aplica</span>
                      )}
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
