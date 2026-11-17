import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Code2, Copy } from 'lucide-react';
import type { CleaningConfig, DatasetWorkspace, VariableConfig } from '../types/data';
import { generateRCodeForStep } from '../utils/rCodeGenerator';

interface RCodeBoxProps {
  step: number;
  workspace: DatasetWorkspace | null;
  timeCol: string | null;
  configs: VariableConfig[];
  cleaning: CleaningConfig;
}

export function RCodeBox({
  step,
  workspace,
  timeCol,
  configs,
  cleaning,
}: RCodeBoxProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rInfo = generateRCodeForStep({
    step,
    workspace,
    timeCol,
    configs,
    cleaning,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rInfo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API might be unavailable in restricted contexts
    }
  };

  return (
    <section
      aria-label="Código R equivalente"
      className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-slate-800 hover:text-blue-800"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          )}
          <Code2 className="h-4 w-4 shrink-0 text-indigo-600" />
          <span>Código R equivalente</span>
          <span className="hidden sm:inline text-xs font-normal text-slate-500">
            · {rInfo.title}
          </span>
        </button>

        {open && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar R</span>
              </>
            )}
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-slate-900 p-4 text-slate-100">
          <p className="mb-2.5 text-xs text-slate-300">{rInfo.note}</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950/80 p-3.5 font-mono text-xs leading-relaxed text-sky-100">
            <code>{rInfo.code}</code>
          </pre>
        </div>
      )}
    </section>
  );
}
