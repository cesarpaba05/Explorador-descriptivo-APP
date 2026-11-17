import { useState, type ChangeEvent, type DragEvent } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { DataRow, PresetDatasetInfo } from '../../types/data';
import {
  detectDelimiterAndDecimal,
  formatCOInt,
  type DecimalPreference,
  type DelimiterPreference,
} from '../../utils/formatters';
import { sanitizeRObjectName } from '../../utils/rCodeGenerator';
import { PRESET_DATASETS } from '../../utils/sampleDatasets';
import { HelpTooltip } from '../HelpTooltip';

interface Step02UploadProps {
  onDatasetLoaded: (payload: {
    rows: DataRow[];
    columns: string[];
    fileName: string;
    shortName: string;
    sourceKind: 'csv' | 'excel';
    delimiterUsed?: ',' | ';' | '\t';
    decimal: 'dot' | 'comma';
    detectedInfo: string;
    addAsNew: boolean;
  }) => void;
  onLoadPreset: (preset: PresetDatasetInfo) => void;
  activeShortName: string;
  activeFileName: string;
  activeRowCount: number;
  activeColCount: number;
  hasActiveWorkspace: boolean;
}

export function Step02Upload({
  onDatasetLoaded,
  onLoadPreset,
  activeShortName,
  activeFileName,
  activeRowCount,
  activeColCount,
  hasActiveWorkspace,
}: Step02UploadProps) {
  const [delimiterPref, setDelimiterPref] = useState<DelimiterPreference>('auto');
  const [decimalPref, setDecimalPref] = useState<DecimalPreference>('auto');
  const [customShortName, setCustomShortName] = useState('');
  const [loadMode, setLoadMode] = useState<'new' | 'replace'>(
    hasActiveWorkspace ? 'new' : 'replace'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [detectedSummary, setDetectedSummary] = useState<{
    delimiter: ',' | ';' | '\t';
    decimal: 'dot' | 'comma';
    rHint: string;
  } | null>(null);

  const [lastCsvText, setLastCsvText] = useState<{ text: string; name: string } | null>(
    null
  );
  const [excelWorkbook, setExcelWorkbook] = useState<{
    wb: XLSX.WorkBook;
    name: string;
    sheets: string[];
    selectedSheet: string;
  } | null>(null);

  const deriveShortName = (fileName: string) => {
    if (customShortName.trim()) return sanitizeRObjectName(customShortName);
    const stem = fileName.replace(/\.[^.]+$/, '');
    return sanitizeRObjectName(stem);
  };

  const parseCsvWithOptions = (
    text: string,
    fileName: string,
    dPref: DelimiterPreference,
    decPref: DecimalPreference,
    overrideMode?: 'new' | 'replace'
  ) => {
    const detected = detectDelimiterAndDecimal(text);
    const finalDelim = dPref === 'auto' ? detected.delimiter : dPref;
    const finalDec = decPref === 'auto' ? detected.decimal : decPref;

    const result = Papa.parse<DataRow>(text, {
      header: true,
      delimiter: finalDelim,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });

    const cols = (result.meta.fields || []).filter((c) => c && c.trim() !== '');
    if (cols.length === 0 || result.data.length === 0) {
      setErrorMsg(
        'No se pudieron detectar columnas y filas válidas en el CSV. Prueba cambiar el separador de columnas.'
      );
      return;
    }

    const delimLabel =
      finalDelim === ';'
        ? 'punto y coma (;)'
        : finalDelim === '\t'
          ? 'tabulación'
          : 'coma (,)';
    const decLabel = finalDec === 'comma' ? 'coma (,)' : 'punto (.)';
    const shortName = deriveShortName(fileName);
    const sepChar = finalDelim === '\t' ? '\\t' : finalDelim;
    const decChar = finalDec === 'comma' ? ',' : '.';
    const rHint = `${shortName} <- read.csv("${fileName}", sep = "${sepChar}", dec = "${decChar}")`;

    const info = `Separador: ${delimLabel} · Decimal: ${decLabel}`;
    setDetectedSummary({ delimiter: finalDelim, decimal: finalDec, rHint });
    setErrorMsg(null);
    setStatusMsg(
      `Base "${shortName}" cargada desde "${fileName}" (${formatCOInt(result.data.length)} filas). ${info}.`
    );

    const addAsNew = (overrideMode ?? loadMode) === 'new' && hasActiveWorkspace;
    onDatasetLoaded({
      rows: result.data,
      columns: cols,
      fileName,
      shortName,
      sourceKind: 'csv',
      delimiterUsed: finalDelim,
      decimal: finalDec,
      detectedInfo: info,
      addAsNew,
    });
  };

  const parseExcelSheet = (
    wb: XLSX.WorkBook,
    sheetName: string,
    fileName: string,
    decPref: DecimalPreference,
    overrideMode?: 'new' | 'replace'
  ) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      setErrorMsg('La hoja seleccionada está vacía o no se pudo leer.');
      return;
    }
    const jsonRows = XLSX.utils.sheet_to_json<DataRow>(ws, {
      defval: null,
      raw: true,
    });
    if (jsonRows.length === 0) {
      setErrorMsg('La hoja de Excel no contiene filas con datos.');
      return;
    }
    const cols = Object.keys(jsonRows[0]).filter((c) => c && c.trim() !== '');
    const finalDec: 'dot' | 'comma' = decPref === 'comma' ? 'comma' : 'dot';
    const shortName = deriveShortName(fileName);
    const info = `Archivo Excel · Hoja "${sheetName}"`;
    setDetectedSummary({
      delimiter: ';',
      decimal: finalDec,
      rHint: `${shortName} <- read_excel("${fileName}", sheet = "${sheetName}")`,
    });
    setErrorMsg(null);
    setStatusMsg(
      `Base "${shortName}" cargada desde "${fileName}" (hoja "${sheetName}", ${formatCOInt(jsonRows.length)} filas).`
    );
    const addAsNew = (overrideMode ?? loadMode) === 'new' && hasActiveWorkspace;
    onDatasetLoaded({
      rows: jsonRows,
      columns: cols,
      fileName,
      shortName,
      sourceKind: 'excel',
      decimal: finalDec,
      detectedInfo: info,
      addAsNew,
    });
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      setExcelWorkbook(null);
      const text = await file.text();
      setLastCsvText({ text, name: file.name });
      parseCsvWithOptions(text, file.name, delimiterPref, decimalPref);
    } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      setLastCsvText(null);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheets = wb.SheetNames;
      if (sheets.length === 0) {
        setErrorMsg('El libro de Excel no contiene hojas.');
        return;
      }
      const firstSheet = sheets[0];
      setExcelWorkbook({ wb, name: file.name, sheets, selectedSheet: firstSheet });
      parseExcelSheet(wb, firstSheet, file.name, decimalPref);
    } else {
      setErrorMsg('Formato no compatible. Sube un archivo .CSV, .XLSX o .XLS.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Reminder to work on a copy */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
          <div className="text-sm text-amber-950">
            <span className="font-semibold">
              Recomendación obligatoria: trabaja siempre sobre una copia de tu base original.
            </span>{' '}
            <span className="text-amber-900">
              Todo se procesa dentro del navegador en memoria, pero mantener intacto tu archivo maestro evita pérdidas si decides editar o limpiar datos más adelante.
            </span>
          </div>
        </div>
      </div>

      {/* Upload Dropzone & short name + delimiter/decimal controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Carga tu archivo CSV o Excel (.xlsx / .xls)
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Detectamos automáticamente separador y decimal, y te dejamos ajustarlos manualmente si hace falta.
              </p>
            </div>
            <HelpTooltip
              metricKey="carga_csv"
              customTitle="Separador de columnas y decimal (read.csv)"
              customDefinition="En español muchos archivos CSV separados por punto y coma (;) usan coma (,) para decimales, mientras que los archivos en inglés usan coma (,) como separador y punto (.) para decimales."
              customExample="Si ves las cifras partidas o en una sola columna, cambia el separador a ';' y el decimal a ','."
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            <span>100% local en tu navegador</span>
          </div>
        </div>

        {/* Short name and Add vs Replace toggle */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="upload-short-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Nombre corto para esta base (ej. cartera, telco, ventas)
            </label>
            <input
              id="upload-short-name"
              type="text"
              value={customShortName}
              onChange={(e) => setCustomShortName(e.target.value)}
              placeholder="Si lo dejas vacío usamos el nombre del archivo"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          {hasActiveWorkspace && (
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Al cargar el archivo:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLoadMode('new')}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    loadMode === 'new'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Agregar otra base
                </button>
                <button
                  type="button"
                  onClick={() => setLoadMode('replace')}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    loadMode === 'replace'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Reemplazar «{activeShortName}»
                </button>
              </div>
            </div>
          )}
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/60'
              : 'border-slate-300 bg-slate-50/60 hover:border-blue-500 hover:bg-blue-50/30'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700 mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-900">
            Haz clic para elegir un archivo o arrástralo aquí
          </span>
          <span className="mt-1 text-xs text-slate-500">
            Formatos admitidos: .csv, .xlsx, .xls · Primera fila con encabezados
          </span>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleInputChange}
            className="sr-only"
          />
        </label>

        {/* Parsing options */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Separador de columnas (CSV)
            </label>
            <select
              value={delimiterPref}
              onChange={(e) => {
                const next = e.target.value as DelimiterPreference;
                setDelimiterPref(next);
                if (lastCsvText) {
                  parseCsvWithOptions(
                    lastCsvText.text,
                    lastCsvText.name,
                    next,
                    decimalPref,
                    'replace'
                  );
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="auto">Detectar automáticamente</option>
              <option value=",">Coma (,)</option>
              <option value=";">Punto y coma (;)</option>
              <option value={'\t'}>Tabulación (Tab)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Separador decimal de entrada
            </label>
            <select
              value={decimalPref}
              onChange={(e) => {
                const next = e.target.value as DecimalPreference;
                setDecimalPref(next);
                if (lastCsvText) {
                  parseCsvWithOptions(
                    lastCsvText.text,
                    lastCsvText.name,
                    delimiterPref,
                    next,
                    'replace'
                  );
                } else if (excelWorkbook) {
                  parseExcelSheet(
                    excelWorkbook.wb,
                    excelWorkbook.selectedSheet,
                    excelWorkbook.name,
                    next,
                    'replace'
                  );
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="auto">Detectar automáticamente</option>
              <option value="comma">Coma decimal (ej. 1.250,50)</option>
              <option value="dot">Punto decimal (ej. 1,250.50)</option>
            </select>
          </div>

          {excelWorkbook && excelWorkbook.sheets.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hoja de Excel a analizar
              </label>
              <select
                value={excelWorkbook.selectedSheet}
                onChange={(e) => {
                  const sheet = e.target.value;
                  setExcelWorkbook({ ...excelWorkbook, selectedSheet: sheet });
                  parseExcelSheet(
                    excelWorkbook.wb,
                    sheet,
                    excelWorkbook.name,
                    decimalPref,
                    'replace'
                  );
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                {excelWorkbook.sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {detectedSummary && !errorMsg && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Lectura aplicada:</strong>{' '}
              <code className="font-mono text-blue-800">{detectedSummary.rHint}</code>
            </span>
            <span className="text-slate-500">
              Si ves números mal separados, corrige el separador o decimal arriba y se re-leerá al instante.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {statusMsg && !errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Active dataset bar + quick preset additions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-700" />
            <div>
              <div className="text-xs font-medium text-slate-500">Base activa actualmente</div>
              <div className="text-sm font-semibold text-slate-900">
                {activeRowCount > 0
                  ? `${activeShortName} (${activeFileName}) · ${formatCOInt(activeRowCount)} filas · ${formatCOInt(activeColCount)} columnas`
                  : 'Ninguna base cargada todavía'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_DATASETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onLoadPreset(p)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
              >
                {p.id === 'taller_clase2' ? `+ ${p.name}` : `+ Cargar «${p.shortName}»`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
