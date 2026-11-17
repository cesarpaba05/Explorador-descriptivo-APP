import { Lightbulb } from 'lucide-react';

interface KeyFindingBoxProps {
  text: string;
  stepTitle?: string;
}

export function KeyFindingBox({ text, stepTitle }: KeyFindingBoxProps) {
  return (
    <section
      aria-label="Hallazgo clave del paso"
      className="mt-8 rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-amber-50/70 to-orange-50/40 p-5 shadow-xs"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 text-amber-800">
          <Lightbulb className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-950">
            <span>Hallazgo clave</span>
            {stepTitle && (
              <>
                <span aria-hidden="true" className="text-amber-400">
                  ·
                </span>
                <span className="font-medium text-amber-800">{stepTitle}</span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{text}</p>
        </div>
      </div>
    </section>
  );
}
