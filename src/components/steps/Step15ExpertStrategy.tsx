import { CheckSquare, Compass, Sparkles } from 'lucide-react';
import type { ExpertAnalysisResult, VariableConfig } from '../../types/data';

interface Step15ExpertStrategyProps {
  configs: VariableConfig[];
  focusVar: string;
  onChangeFocusVar: (col: string) => void;
  analysis: ExpertAnalysisResult | null;
}

export function Step15ExpertStrategy({
  configs,
  focusVar,
  onChangeFocusVar,
  analysis,
}: Step15ExpertStrategyProps) {
  const numericCols = configs.filter((c) => c.role === 'numeric');

  return (
    <div className="space-y-6">
      {/* Focus variable selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Diagnóstico experto y estrategia de negocio (100% basado en reglas sobre tus cifras)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Elige la variable foco para sintetizar comportamiento, dispersión, atípicos, relaciones y 5 acciones concretas.
              </p>
            </div>
          </div>

          {numericCols.length > 0 && (
            <select
              value={focusVar || numericCols[0].name}
              onChange={(e) => onChangeFocusVar(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  Variable foco: {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!analysis ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay variables numéricas suficientes para generar el análisis experto.
        </div>
      ) : (
        <>
          {/* Headline banner */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-[#0f1d32] to-[#17365d] p-6 text-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Sparkles className="h-4 w-4" />
              <span>Perfil diagnosticado: {analysis.profileLabel}</span>
            </div>
            <h3 className="mt-1.5 text-lg font-bold text-white">{analysis.headline}</h3>
          </div>

          {/* Diagnosis blocks */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {analysis.diagnosisBlocks.map((block) => (
              <div
                key={block.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="font-mono text-xs font-semibold text-blue-700">
                  {block.metric}
                </div>
                <h4 className="mt-1 text-sm font-semibold text-slate-900">{block.title}</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{block.text}</p>
              </div>
            ))}
          </div>

          {/* 5 Strategic actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="h-5 w-5 text-teal-700" />
              <h3 className="text-base font-semibold text-slate-900">
                Plan estratégico recomendado (5 acciones concretas)
              </h3>
            </div>

            <div className="space-y-3">
              {analysis.actions.map((act, idx) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {act.title}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-teal-800">
                      {act.horizon} · KPI: {act.kpi}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700">{act.action}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
