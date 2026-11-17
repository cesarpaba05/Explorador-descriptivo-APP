import {
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  Database,
  Radio,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import type { BusinessContext, NumberUnit, PresetDatasetInfo } from '../../types/data';
import { formatCOInt, UNIT_LABELS } from '../../utils/formatters';
import { PRESET_DATASETS } from '../../utils/sampleDatasets';
import { HelpTooltip } from '../HelpTooltip';

interface Step01ContextProps {
  context: BusinessContext;
  shortName: string;
  onChangeContext: (next: BusinessContext) => void;
  onChangeShortName: (next: string) => void;
  onLoadPreset: (preset: PresetDatasetInfo) => void;
  activeDatasetName: string;
  hasData: boolean;
}

const PRESET_THEME: Record<
  PresetDatasetInfo['id'],
  {
    icon: typeof Radio;
    accentBar: string;
    iconBox: string;
    buttonActive: string;
    sectorText: string;
  }
> = {
  publicidad_co: {
    icon: TrendingUp,
    accentBar: 'from-blue-700 to-cyan-500',
    iconBox: 'border-blue-200 bg-blue-50 text-blue-700',
    buttonActive: 'border-blue-700 bg-blue-700 text-white',
    sectorText: 'text-blue-700',
  },
  telecom: {
    icon: Radio,
    accentBar: 'from-indigo-600 to-sky-500',
    iconBox: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    buttonActive: 'border-indigo-700 bg-indigo-700 text-white',
    sectorText: 'text-indigo-700',
  },
  retail: {
    icon: ShoppingBag,
    accentBar: 'from-teal-600 to-emerald-500',
    iconBox: 'border-teal-200 bg-teal-50 text-teal-700',
    buttonActive: 'border-teal-700 bg-teal-700 text-white',
    sectorText: 'text-teal-700',
  },
  b2b: {
    icon: Building2,
    accentBar: 'from-amber-600 to-orange-500',
    iconBox: 'border-amber-200 bg-amber-50 text-amber-700',
    buttonActive: 'border-amber-700 bg-amber-700 text-white',
    sectorText: 'text-amber-700',
  },
};

export function Step01Context({
  context,
  shortName,
  onChangeContext,
  onChangeShortName,
  onLoadPreset,
  activeDatasetName,
  hasData,
}: Step01ContextProps) {
  return (
    <div className="space-y-8">
      {/* CRISP-DM orientation banner */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-[#0f1d32] via-[#152946] to-[#133856] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Compass className="h-4 w-4" />
              <span>Ruta CRISP-DM + taller de estadística descriptiva en 16 pasos</span>
            </div>
            <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-white text-balance">
              Primero conocemos los datos a fondo; después sacamos conclusiones de negocio
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-300">
              Esta fase inicial busca entender tu pregunta antes de tocar un número. Funciona tanto para bases de clientes (individuos) como para series históricas (años o meses), y en cada paso muestra el código R equivalente.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 shrink-0 text-center">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="font-mono text-base font-bold text-sky-300 tabular-nums">16</div>
              <div className="text-[11px] text-slate-300">Pasos guiados</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="font-mono text-base font-bold text-teal-300 tabular-nums">4</div>
              <div className="text-[11px] text-slate-300">Casos listos</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <div className="font-mono text-base font-bold text-amber-300 tabular-nums">100%</div>
              <div className="text-[11px] text-slate-300">En navegador</div>
            </div>
          </div>
        </div>
      </div>

      {/* Business context form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Define tu pregunta, sector, unidad y nombre corto de la base
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                El objetivo de esta etapa es conocer los datos antes de concluir. La unidad permite mostrar cifras claras como «$4,9 billones» o «$559 mil millones».
              </p>
            </div>
          </div>
          <HelpTooltip
            metricKey="contexto_crisp"
            customTitle="¿Por qué empezar por el contexto de negocio?"
            customDefinition="En CRISP-DM, antes de calcular promedios o gráficos definimos qué decisión queremos tomar y en qué unidad vienen las cifras. Así evitamos análisis sin rumbo."
            customExample="Si analizas inversión publicitaria en millones de pesos, elegir 'Millones' permite leer '$5,45 billones' en vez de '5450000'."
            align="right"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label
              htmlFor="project-title"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nombre del análisis o proyecto
            </label>
            <input
              id="project-title"
              type="text"
              value={context.projectTitle}
              onChange={(e) =>
                onChangeContext({ ...context, projectTitle: e.target.value })
              }
              placeholder="Ej. Inversión publicitaria en Colombia"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="business-sector"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Sector o área de negocio
            </label>
            <input
              id="business-sector"
              type="text"
              value={context.sector}
              onChange={(e) => onChangeContext({ ...context, sector: e.target.value })}
              placeholder="Ej. Medios, Telecomunicaciones, Retail, B2B"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="short-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nombre corto de esta base (para código R)
            </label>
            <input
              id="short-name"
              type="text"
              value={shortName}
              onChange={(e) => onChangeShortName(e.target.value)}
              placeholder="Ej. cartera, telco, publicidad"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Unidad en la que vienen expresadas las cifras numéricas de tu archivo
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['pesos', 'miles', 'millones', 'unidades'] as NumberUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChangeContext({ ...context, unit: u })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    context.unit === u
                      ? 'border-blue-600 bg-blue-50 font-semibold text-blue-900'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="business-question"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Pregunta principal de negocio
            </label>
            <textarea
              id="business-question"
              rows={2}
              value={context.question}
              onChange={(e) =>
                onChangeContext({ ...context, question: e.target.value })
              }
              placeholder="Ej. ¿Cómo ha evolucionado la inversión publicitaria por medio en Colombia y qué estrategia debe seguir un medio como la radio?"
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="business-objective"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Objetivo práctico del análisis
            </label>
            <textarea
              id="business-objective"
              rows={2}
              value={context.objective}
              onChange={(e) =>
                onChangeContext({ ...context, objective: e.target.value })
              }
              placeholder="Ej. Conocer la estructura, dispersión, atípicos y relaciones de los datos antes de concluir y formular acciones."
              className="w-full rounded-lg border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>
      </div>

      {/* 4 Preset Examples */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Casos de ejemplo listos (puedes cargar varios y alternar entre ellos)
              </h3>
              <p className="text-xs text-slate-600">
                Incluye una serie histórica anual (Publicidad CO) y 3 bases de individuos (Telco, Retail y Cartera B2B).
              </p>
            </div>
          </div>
          {hasData && (
            <span className="text-xs font-semibold text-emerald-700">
              Base activa: <span className="font-mono">{activeDatasetName}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PRESET_DATASETS.map((preset) => {
            const isSelected = context.presetId === preset.id && hasData;
            const theme = PRESET_THEME[preset.id];
            const Icon = theme.icon;

            return (
              <div
                key={preset.id}
                className={`flex flex-col justify-between overflow-hidden rounded-xl border transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/35 shadow-sm'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${theme.accentBar}`} />
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${theme.iconBox}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                        {preset.shortName} · {preset.kindLabel} · {formatCOInt(preset.colCount)} col.
                      </span>
                    </div>
                    <div className={`text-xs font-semibold ${theme.sectorText}`}>
                      {preset.sector}
                    </div>
                    <h4 className="mt-0.5 text-sm font-semibold text-slate-900">
                      {preset.name}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {preset.subtitle}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLoadPreset(preset)}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isSelected
                        ? theme.buttonActive
                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Base activa en tu espacio de trabajo
                      </>
                    ) : (
                      <span>Cargar «{preset.shortName}»</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
