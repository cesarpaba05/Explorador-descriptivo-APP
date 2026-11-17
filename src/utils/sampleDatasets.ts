import type { DataRow, PresetDatasetInfo } from '../types/data';

function createRng(seed: number) {
  let state = seed >>> 0;
  return function next(): number {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalSample(rng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

/**
 * Serie de tiempo anual (2010–2024) en millones de pesos colombianos.
 * Incluye valores faltantes tempranos ("no se medía ese año") en cine_digital,
 * caída de crisis 2020, total_inversion = suma de los medios, y cifras del orden
 * de ~4,9 billones (mercado total) y ~559 mil millones (radio).
 */
function generatePublicidadColombiaRows(): DataRow[] {
  const baseRows: Array<{
    anio: number;
    television: number;
    digital: number;
    radio: number;
    prensa: number;
    revistas: number;
    exterior: number;
    cine: number | null;
  }> = [
    { anio: 2010, television: 1380000, digital: 120000, radio: 510000, prensa: 420000, revistas: 155000, exterior: 195000, cine: null },
    { anio: 2011, television: 1510000, digital: 185000, radio: 545000, prensa: 435000, revistas: 162000, exterior: 215000, cine: null },
    { anio: 2012, television: 1620000, digital: 265000, radio: 575000, prensa: 440000, revistas: 168000, exterior: 235000, cine: 32000 },
    { anio: 2013, television: 1710000, digital: 375000, radio: 602000, prensa: 430000, revistas: 160000, exterior: 252000, cine: 38000 },
    { anio: 2014, television: 1795000, digital: 510000, radio: 628000, prensa: 410000, revistas: 150000, exterior: 274000, cine: 44000 },
    { anio: 2015, television: 1760000, digital: 685000, radio: 642000, prensa: 385000, revistas: 138000, exterior: 288000, cine: 49000 },
    { anio: 2016, television: 1720000, digital: 890000, radio: 635000, prensa: 355000, revistas: 124000, exterior: 302000, cine: 53000 },
    { anio: 2017, television: 1665000, digital: 1120000, radio: 620000, prensa: 320000, revistas: 108000, exterior: 315000, cine: 56000 },
    { anio: 2018, television: 1610000, digital: 1390000, radio: 610000, prensa: 285000, revistas: 94000, exterior: 328000, cine: 61000 },
    { anio: 2019, television: 1560000, digital: 1680000, radio: 605000, prensa: 255000, revistas: 82000, exterior: 342000, cine: 66000 },
    { anio: 2020, television: 1290000, digital: 1790000, radio: 488000, prensa: 185000, revistas: 56000, exterior: 205000, cine: 14000 },
    { anio: 2021, television: 1410000, digital: 2150000, radio: 530000, prensa: 192000, revistas: 54000, exterior: 272000, cine: 31000 },
    { anio: 2022, television: 1445000, digital: 2460000, radio: 552000, prensa: 184000, revistas: 51000, exterior: 325000, cine: 52000 },
    { anio: 2023, television: 1395000, digital: 2680000, radio: 554000, prensa: 171000, revistas: 46000, exterior: 350000, cine: 58000 },
    { anio: 2024, television: 1360000, digital: 2890000, radio: 559000, prensa: 158000, revistas: 42000, exterior: 378000, cine: 63000 },
  ];

  return baseRows.map((r) => {
    const total =
      r.television +
      r.digital +
      r.radio +
      r.prensa +
      r.revistas +
      r.exterior +
      (r.cine ?? 0);
    return {
      anio: r.anio,
      television: r.television,
      digital: r.digital,
      radio: r.radio,
      prensa: r.prensa,
      revistas: r.revistas,
      exterior: r.exterior,
      cine: r.cine,
      total_inversion: total,
      participacion_digital: Number((r.digital / total).toFixed(4)),
    };
  });
}

function generateTelecomRows(): DataRow[] {
  const rng = createRng(202611);
  const planes = ['Básico', 'Estándar', 'Pro', 'Empresarial'];
  const ciudades = [
    { code: 1, name: 'Bogotá' },
    { code: 2, name: 'Medellín' },
    { code: 3, name: 'Cali' },
    { code: 4, name: 'Barranquilla' },
    { code: 5, name: 'Cartagena' },
  ];

  const rows: DataRow[] = [];
  for (let i = 1; i <= 247; i++) {
    const rCity = rng();
    const cityIdx =
      rCity < 0.38 ? 0 : rCity < 0.65 ? 1 : rCity < 0.84 ? 2 : rCity < 0.96 ? 3 : 4;
    const city = ciudades[cityIdx];

    const rPlan = rng();
    const planIdx = rPlan < 0.34 ? 0 : rPlan < 0.7 ? 1 : rPlan < 0.92 ? 2 : 3;
    const plan = planes[planIdx];

    const antiguedad = Math.max(1, Math.round(Math.exp(normalSample(rng, 2.7, 0.75))));
    const baseGb = [8, 22, 48, 95][planIdx];
    let consumoGb = Math.max(
      0.5,
      Number((baseGb * Math.exp(normalSample(rng, 0, 0.42))).toFixed(1))
    );

    const baseFee = [42000, 68000, 105000, 175000][planIdx];
    let factura = Math.round(
      baseFee + consumoGb * 620 + normalSample(rng, 0, 7500)
    );
    if (i % 37 === 0) {
      consumoGb = Number((consumoGb * 2.8 + 45).toFixed(1));
      factura = Math.round(factura * 2.4 + 140000);
    }

    const llamadasSoporte = Math.max(
      0,
      Math.round(Math.exp(normalSample(rng, 0.65, 0.8)) - 1)
    );
    let moraDias =
      rng() < 0.58 ? 0 : Math.max(1, Math.round(Math.exp(normalSample(rng, 2.0, 0.9))));

    const logit =
      -2.3 +
      llamadasSoporte * 0.42 +
      moraDias * 0.045 -
      antiguedad * 0.03 +
      (planIdx === 0 ? 0.55 : 0);
    const probCancel = 1 / (1 + Math.exp(-logit));
    const cancelo = rng() < probCancel ? 1 : 0;

    const missingConsumo = i === 18 || i === 74 || i === 142 || i === 209;
    const missingMora = i === 33 || i === 115 || i === 188;
    if (i === 52) consumoGb = -12.5;
    if (i === 164) moraDias = -4;

    rows.push({
      id_cliente: `TEL-${String(1000 + i)}`,
      ciudad_codigo: city.code,
      ciudad: city.name,
      plan,
      antiguedad_meses: antiguedad,
      consumo_datos_gb: missingConsumo ? null : consumoGb,
      llamadas_soporte: llamadasSoporte,
      factura_mensual_cop: factura,
      mora_dias: missingMora ? null : moraDias,
      cancelo_servicio: cancelo,
    });
  }

  rows.push({ ...rows[10] }, { ...rows[44] }, { ...rows[120] });
  return rows;
}

function generateRetailRows(): DataRow[] {
  const rng = createRng(88421);
  const canales = ['Tienda Web', 'App Móvil', 'Tienda Física', 'Venta Telefónica'];
  const categorias = ['Tecnología', 'Hogar', 'Moda', 'Deportes', 'Accesorios'];
  const ciudades = [
    { code: 1, name: 'Bogotá' },
    { code: 2, name: 'Medellín' },
    { code: 3, name: 'Cali' },
    { code: 4, name: 'Bucaramanga' },
  ];

  const rows: DataRow[] = [];
  for (let i = 1; i <= 248; i++) {
    const rCanal = rng();
    const canalIdx = rCanal < 0.44 ? 0 : rCanal < 0.76 ? 1 : rCanal < 0.95 ? 2 : 3;
    const canal = canales[canalIdx];

    const rCat = rng();
    const catIdx = rCat < 0.24 ? 0 : rCat < 0.52 ? 1 : rCat < 0.78 ? 2 : rCat < 0.92 ? 3 : 4;
    const categoria = categorias[catIdx];

    const city = ciudades[Math.floor(rng() * ciudades.length)];
    let edad = Math.round(Math.min(72, Math.max(18, normalSample(rng, 35, 10.5))));
    const tiempoMin = Math.max(
      1.2,
      Number((Math.exp(normalSample(rng, 2.1, 0.65))).toFixed(1))
    );
    const productos = Math.max(1, Math.round(1 + tiempoMin * 0.22 + Math.abs(normalSample(rng, 0, 1.1))));
    const descuentoProp =
      rng() < 0.35 ? 0 : Number(Math.min(0.45, Math.abs(normalSample(rng, 0.12, 0.08))).toFixed(3));

    const catBase = [420000, 210000, 155000, 185000, 75000][catIdx];
    let monto = Math.round(
      catBase * (0.65 + productos * 0.28) * Math.exp(normalSample(rng, 0, 0.38)) * (1 - descuentoProp)
    );

    if (i % 41 === 0) {
      monto = Math.round(monto * 2.9 + 650000);
    }

    const logitRec = -0.9 + productos * 0.22 + (canalIdx === 1 ? 0.8 : 0) - descuentoProp * 1.5;
    const recurrente = rng() < 1 / (1 + Math.exp(-logitRec)) ? 1 : 0;

    if (i === 27) edad = -25;
    if (i === 131) monto = -89000;

    rows.push({
      id_pedido: `PED-${String(5000 + i)}`,
      canal_venta: canal,
      categoria,
      ciudad_codigo: city.code,
      edad_cliente: i === 61 || i === 189 ? null : edad,
      tiempo_en_sitio_min: i === 95 ? null : tiempoMin,
      productos_carrito: productos,
      descuento_proporcion: descuentoProp,
      monto_compra_cop: i === 48 || i === 152 || i === 210 ? null : monto,
      cliente_recurrente: recurrente,
    });
  }

  rows.push({ ...rows[15] }, { ...rows[88] });
  return rows;
}

function generateB2BRows(): DataRow[] {
  const rng = createRng(55190);
  const tamanos = ['Microempresa', 'Pequeña', 'Mediana', 'Grande'];
  const sectores = ['Manufactura', 'Logística', 'Comercio', 'Construcción', 'Servicios'];
  const regiones = [
    { code: 1, name: 'Centro' },
    { code: 2, name: 'Antioquia' },
    { code: 3, name: 'Pacífico' },
    { code: 4, name: 'Caribe' },
  ];

  const rows: DataRow[] = [];
  for (let i = 1; i <= 248; i++) {
    const rTam = rng();
    const tamIdx = rTam < 0.28 ? 0 : rTam < 0.64 ? 1 : rTam < 0.88 ? 2 : 3;
    const tamano = tamanos[tamIdx];

    const rSec = rng();
    const secIdx = rSec < 0.24 ? 0 : rSec < 0.44 ? 1 : rSec < 0.72 ? 2 : rSec < 0.86 ? 3 : 4;
    const sector = sectores[secIdx];
    const reg = regiones[Math.floor(rng() * regiones.length)];

    const baseVentas = [280, 950, 3400, 12500][tamIdx];
    const ventasAnuales = Number(
      Math.max(45, baseVentas * Math.exp(normalSample(rng, 0, 0.45))).toFixed(1)
    );
    const cupoCredito = Number(
      Math.max(10, ventasAnuales * (0.08 + rng() * 0.08)).toFixed(1)
    );
    const utilizacion = Math.min(0.99, Math.max(0.05, 0.28 + rng() * 0.68));
    let saldoCartera = Number((cupoCredito * utilizacion).toFixed(1));

    let diasMora =
      rng() < 0.48
        ? 0
        : Math.max(1, Math.round(Math.exp(normalSample(rng, 2.7, 0.95))));
    if (i % 39 === 0) {
      diasMora = Math.round(diasMora + 95);
      saldoCartera = Number((saldoCartera * 1.45).toFixed(1));
    }

    const facturasVencidas =
      diasMora === 0 ? 0 : Math.max(1, Math.round(diasMora / 22 + rng() * 2));

    const logitRiesgo =
      -2.6 + diasMora * 0.055 + facturasVencidas * 0.48 + utilizacion * 1.35 - tamIdx * 0.35;
    const riesgo = rng() < 1 / (1 + Math.exp(-logitRiesgo)) ? 1 : 0;

    if (i === 40) saldoCartera = -15.4;
    if (i === 173) diasMora = -10;

    rows.push({
      id_empresa: `EMP-${String(300 + i)}`,
      tamano_empresa: tamano,
      sector_cliente: sector,
      region_codigo: reg.code,
      ventas_anuales_mcop: i === 66 || i === 198 ? null : ventasAnuales,
      cupo_credito_mcop: cupoCredito,
      saldo_cartera_mcop: i === 112 ? null : saldoCartera,
      dias_mora: i === 29 || i === 155 ? null : diasMora,
      facturas_vencidas: facturasVencidas,
      uso_cupo_proporcion: Number(utilizacion.toFixed(3)),
      riesgo_incumplimiento: riesgo,
    });
  }

  rows.push({ ...rows[7] }, { ...rows[99] });
  return rows;
}

export const PRESET_DATASETS: PresetDatasetInfo[] = [
  {
    id: 'publicidad_co',
    shortName: 'publicidad',
    name: 'Inversión Publicitaria por Medio en Colombia (2010–2024)',
    sector: 'Medios y Publicidad',
    kindLabel: 'Serie de tiempo · 15 años',
    subtitle:
      'Inversión anual por medio (TV, digital, radio, prensa, revistas, exterior, cine) con caída en 2020 y total del mercado (~$5,45 billones).',
    rowCount: 15,
    colCount: 10,
    context: {
      presetId: 'publicidad_co',
      projectTitle: 'Evolución de la inversión publicitaria por medio en Colombia',
      sector: 'Medios y Publicidad',
      unit: 'millones',
      question:
        '¿Cómo ha evolucionado la inversión publicitaria por medio en Colombia y qué estrategia debe seguir un medio como la radio?',
      objective:
        'Medir el crecimiento o contracción de cada medio entre 2010 y 2024, analizar su participación en el total del mercado y formular una estrategia competitiva para la radio frente al avance digital.',
    },
    generate: generatePublicidadColombiaRows,
  },
  {
    id: 'telecom',
    shortName: 'telco',
    name: 'Telecomunicaciones · Retención y Consumo de Clientes',
    sector: 'Telecomunicaciones',
    kindLabel: 'Individuos · 250 clientes',
    subtitle:
      'Clientes móviles con plan, ciudad, consumo de datos, llamadas a soporte, factura mensual y cancelación (0/1).',
    rowCount: 250,
    colCount: 10,
    context: {
      presetId: 'telecom',
      projectTitle: 'Diagnóstico de cancelación y consumo en telefonía móvil',
      sector: 'Telecomunicaciones',
      unit: 'pesos',
      question:
        '¿Qué factores de uso, facturación y atención al cliente se asocian con una mayor tasa de cancelación del servicio?',
      objective:
        'Caracterizar el consumo y facturación de los clientes e identificar segmentos críticos de fuga para enfocar campañas de retención.',
    },
    generate: generateTelecomRows,
  },
  {
    id: 'retail',
    shortName: 'retail',
    name: 'Retail · Comercio Electrónico y Omnicanal',
    sector: 'Retail / Comercio',
    kindLabel: 'Individuos · 250 pedidos',
    subtitle:
      'Pedidos por canal web, app y tienda física con ticket promedio, proporción de descuento y recurrencia.',
    rowCount: 250,
    colCount: 10,
    context: {
      presetId: 'retail',
      projectTitle: 'Análisis del ticket promedio y recurrencia omnicanal',
      sector: 'Retail y Comercio Electrónico',
      unit: 'pesos',
      question:
        '¿Cómo varía el monto de compra entre canales y categorías, y qué variables impulsan la recurrencia de clientes?',
      objective:
        'Entender la distribución del gasto por pedido, detectar compras atípicas de alto valor y comparar conversión por canal.',
    },
    generate: generateRetailRows,
  },
  {
    id: 'b2b',
    shortName: 'cartera',
    name: 'Cartera B2B · Crédito y Recaudo Empresarial',
    sector: 'Servicios Financieros / B2B',
    kindLabel: 'Individuos · 250 empresas',
    subtitle:
      'Empresas clientes con cupo, saldo en cartera, uso del cupo (proporción), mora e incumplimiento.',
    rowCount: 250,
    colCount: 11,
    context: {
      presetId: 'b2b',
      projectTitle: 'Perfilamiento descriptivo de riesgo en cartera comercial B2B',
      sector: 'B2B / Crédito Comercial',
      unit: 'millones',
      question:
        '¿Qué niveles de mora y uso del cupo distinguen a las empresas con riesgo de incumplimiento según su tamaño y sector?',
      objective:
        'Evaluar la concentración de cartera, detectar cuentas con mora crítica y fijar alertas preventivas de cobranza.',
    },
    generate: generateB2BRows,
  },
];
