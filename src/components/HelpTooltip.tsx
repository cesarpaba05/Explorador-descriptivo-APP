import { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { METRIC_HELP } from '../utils/metricDefinitions';

interface HelpTooltipProps {
  metricKey: keyof typeof METRIC_HELP | string;
  customTitle?: string;
  customDefinition?: string;
  customExample?: string;
  align?: 'left' | 'right';
}

export function HelpTooltip({
  metricKey,
  customTitle,
  customDefinition,
  customExample,
  align = 'left',
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const info = METRIC_HELP[metricKey] || {
    title: customTitle || 'Definición de métrica',
    plainDefinition: customDefinition || 'Métrica descriptiva calculada sobre los datos activos.',
    example: customExample || '',
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`¿Qué significa ${info.title}?`}
        aria-expanded={open}
        title="¿Qué significa?"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">¿Qué significa?</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={info.title}
          className={`absolute top-full z-40 mt-2 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-900 leading-snug">{info.title}</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar explicación"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 mb-2.5">{info.plainDefinition}</p>
          {info.example && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">Ejemplo: </span>
              {info.example}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
