import { useState } from 'react';
import { Download, Eye, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import type {
  BusinessContext,
  ExecutiveFinding,
  ExpertAnalysisResult,
} from '../../types/data';
import { formatCOInt } from '../../utils/formatters';

interface Step16FindingsExportProps {
  context: BusinessContext;
  shortName: string;
  findings: ExecutiveFinding[];
  expertAnalysis: ExpertAnalysisResult | null;
  customNotes: string;
  onChangeNotes: (notes: string) => void;
  htmlReportPreview: string;
  onDownloadHtml: () => void;
  onDownloadStatsCsv: () => void;
  onDownloadCleanedCsv: () => void;
  activeRowCount: number;
  activeColCount: number;
}

export function Step16FindingsExport({
  context,
  shortName,
  findings,
  expertAnalysis,
  customNotes,
  onChangeNotes,
  htmlReportPreview,
  onDownloadHtml,
  onDownloadStatsCsv,
  onDownloadCleanedCsv,
  activeRowCount,
  activeColCount,
}: Step16FindingsExportProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      {/* 5 Executive findings tied to Step 1 business question */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              5 hallazgos principales conectados con tu pregunta de negocio
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Base: <span className="font-mono font-semibold">{shortName}</span> ({formatCOInt(activeRowCount)} filas × {formatCOInt(activeColCount)} columnas).{' '}
              {context.question.trim() && (
                <>Pregunta: «{context.question.trim()}».</>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {findings.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                <span className="font-mono text-xs font-semibold text-blue-700">
                  {f.metricBadge}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">{f.summary}</p>
              <p className="mt-1.5 text-xs font-medium text-teal-800">{f.questionLink}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <label
          htmlFor="team-notes"
          className="block text-sm font-semibold text-slate-900 mb-1"
        >
          Notas adicionales del equipo (se incluyen en el informe HTML)
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Anota acuerdos de reunión, responsables o supuestos operativos antes de descargar el reporte.
        </p>
        <textarea
          id="team-notes"
          rows={3}
          value={customNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Ej. Próxima revisión con gerencia comercial el día 15; priorizar piloto en el cuartil superior..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Downloads & HTML report preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Exportar resultados y código R reproducible
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              El informe HTML incluye tablas, gráficos vectoriales, los 5 hallazgos, las {expertAnalysis ? formatCOInt(expertAnalysis.actions.length) : '5'} acciones estratégicas y el anexo completo con el código R de cada paso.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{showPreview ? 'Ocultar vista previa' : 'Ver vista previa del informe'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onDownloadHtml}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-4 py-3 text-xs font-semibold text-white shadow-xs hover:bg-blue-800"
          >
            <FileText className="h-4 w-4" />
            <span>Descargar informe HTML completo</span>
          </button>

          <button
            type="button"
            onClick={onDownloadStatsCsv}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-700" />
            <span>Descargar tabla descriptivos (CSV)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadCleanedCsv}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-indigo-700" />
            <span>Descargar base limpia (CSV)</span>
          </button>
        </div>

        {showPreview && (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <iframe
              title="Vista previa del informe HTML"
              srcDoc={htmlReportPreview}
              className="h-[520px] w-full bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
