import { Check, Lock, X } from 'lucide-react';
import type { WizardStepMeta } from '../types/data';

interface WizardSidebarProps {
  steps: WizardStepMeta[];
  currentStep: number;
  hasData: boolean;
  onSelectStep: (stepId: number) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const PHASE_COLOR_MAP: Record<WizardStepMeta['crispPhase'], string> = {
  'Entendimiento del negocio': 'text-sky-300',
  'Entendimiento de los datos': 'text-teal-300',
  'Preparación de datos': 'text-amber-300',
  'Análisis descriptivo': 'text-indigo-300',
  'Estrategia y entrega': 'text-emerald-300',
};

export function WizardSidebar({
  steps,
  currentStep,
  hasData,
  onSelectStep,
  mobileOpen,
  onCloseMobile,
}: WizardSidebarProps) {
  const progressPct = Math.round((currentStep / steps.length) * 100);

  const navContent = (
    <div className="flex h-full flex-col bg-[#0f1d32] text-slate-100">
      <div className="border-b border-slate-800/90 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Progreso CRISP-DM</span>
          <span className="font-mono text-xs font-semibold text-sky-300 tabular-nums">
            Paso {currentStep}/{steps.length} · {progressPct}%
          </span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-teal-400 transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <nav aria-label="Pasos del asistente" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isDisabled = !hasData && step.id > 2;
          const isDone = hasData && step.id < currentStep;
          const showPhaseLabel =
            index === 0 || steps[index - 1].crispPhase !== step.crispPhase;

          return (
            <div key={step.id}>
              {showPhaseLabel && (
                <div
                  className={`px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide ${
                    PHASE_COLOR_MAP[step.crispPhase]
                  }`}
                >
                  {step.crispPhase}
                </div>
              )}
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onSelectStep(step.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'bg-blue-600/25 font-semibold text-white ring-1 ring-inset ring-sky-400/40'
                    : isDisabled
                      ? 'cursor-not-allowed text-slate-500'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-mono tabular-nums ${
                    isCurrent
                      ? 'border-sky-400 bg-sky-500 font-bold text-slate-950'
                      : isDone
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : isDisabled
                          ? 'border-slate-800 bg-slate-900/60 text-slate-600'
                          : 'border-slate-700 bg-slate-800/80 text-slate-300'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isDisabled ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    step.id
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{step.shortTitle.replace(/^\d+\.\s*/, '')}</span>
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[276px] shrink-0 border-r border-slate-800 bg-[#0f1d32]">
        <div className="sticky top-[60px] h-[calc(100vh-60px)]">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-800 bg-[#0f1d32] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <span className="text-sm font-semibold text-white">Pasos del análisis</span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
