export interface MetricExplanation {
  title: string;
  plainDefinition: string;
  example: string;
}

export const METRIC_HELP: Record<string, MetricExplanation> = {
  summary_r: {
    title: 'Resumen general (equivalente a summary() en R)',
    plainDefinition:
      'Muestra de un vistazo el mínimo, primer cuartil (25%), mediana (50%), media, tercer cuartil (75%) y máximo de cada variable numérica, y los conteos principales de las categóricas.',
    example:
      'Si la mediana es $85.000 y el máximo es $490.000, sabes de inmediato que hay clientes que multiplican por 5 el valor típico.',
  },
  media: {
    title: 'Media aritmética (Promedio)',
    plainDefinition:
      'Suma de todos los valores válidos dividida por la cantidad de registros (ignorando faltantes con na.rm = TRUE). Es sensible a valores extremos.',
    example:
      'Si 4 clientes gastan $50.000 y 1 corporativo gasta $800.000, el promedio sube a $200.000 aunque la mayoría gastó mucho menos.',
  },
  mediana: {
    title: 'Mediana',
    plainDefinition:
      'El valor exacto de la mitad cuando ordenas todos los datos de menor a mayor: el 50% está por debajo y el 50% por encima.',
    example:
      'Con facturas de $45.000, $60.000, $75.000, $90.000 y $650.000, la mediana es $75.000 sin dejarse arrastrar por el cliente gigante.',
  },
  moda: {
    title: 'Moda',
    plainDefinition:
      'Es el valor que más veces se repite en la variable. En cifras continuas diferentes entre sí puede no haber una moda única.',
    example:
      'Si 90 de 250 clientes tienen 0 días de mora, la moda es 0.',
  },
  media_recortada: {
    title: 'Media recortada al 20% (mean con trim = 0.2)',
    plainDefinition:
      'Calcula el promedio después de quitar el 10% más bajo y el 10% más alto (20% en total). Combina la precisión del promedio con resistencia a valores extremos.',
    example:
      'En bases con clientes gigantes o un año atípico como 2020, muestra el promedio real del segmento habitual.',
  },
  min_max: {
    title: 'Mínimo y Máximo',
    plainDefinition:
      'El valor más bajo y el más alto observados en la variable. Muestran el piso y el techo registrados.',
    example:
      'Si la mora va de 0 a 180 días, ves el rango completo de comportamiento en cartera.',
  },
  rango: {
    title: 'Rango (Máximo − Mínimo)',
    plainDefinition:
      'Es la distancia total entre el valor más grande y el más pequeño de la columna.',
    example:
      'Si el pedido mínimo es $28.000 y el máximo $1.828.000, el rango es $1.800.000.',
  },
  varianza: {
    title: 'Varianza muestral (s², denominador n − 1)',
    plainDefinition:
      'Mide la dispersión elevando al cuadrado la distancia de cada dato respecto a la media y dividiendo por (n − 1), igual que var() en R.',
    example:
      'Sirve como paso matemático para calcular la desviación estándar; cuanto mayor es, más dispersos están los registros.',
  },
  desviacion_estandar: {
    title: 'Desviación estándar (s, denominador n − 1)',
    plainDefinition:
      'Es la raíz cuadrada de la varianza y muestra cuánto se alejan típicamente los datos del promedio, en las mismas unidades originales.',
    example:
      'Si la factura promedio es $95.000 con desviación de $30.000, la mayoría de las facturas oscila alrededor de esa banda.',
  },
  iqr: {
    title: 'Rango Intercuartílico (IQR = Q3 − Q1)',
    plainDefinition:
      'Ancho del 50% central de los datos. Al ignorar el 25% más bajo y el 25% más alto, no se distorsiona con extremos.',
    example:
      'Si Q1 = $60.000 y Q3 = $120.000, la mitad central de tus clientes se mueve en una franja de $60.000.',
  },
  mad: {
    title: 'Desviación Absoluta Mediana (MAD × 1,4826)',
    plainDefinition:
      'Mediana de las distancias absolutas respecto a la mediana general, multiplicada por la constante 1,4826 de R para hacerla comparable con la desviación estándar.',
    example:
      'Si la desviación estándar es $90.000 pero el MAD es $22.000, la variación real del cliente típico es mucho menor y la alta desviación viene de pocos extremos.',
  },
  cv: {
    title: 'Coeficiente de Variación (CV = s / |media| × 100)',
    plainDefinition:
      'Mide la dispersión en porcentaje respecto a la media. Permite comparar variables que tienen escalas totalmente distintas (por ejemplo minutos vs. pesos).',
    example:
      'Si los minutos varían 29% y la factura varía 93%, la factura es mucho más heterogénea: lo que dispara la factura no son solo los minutos.',
  },
  cv_geom: {
    title: 'Media geométrica de los CV',
    plainDefinition:
      'Promedio multiplicativo de los Coeficientes de Variación de todas las columnas numéricas positivas, usado en R para resumir la variabilidad global de una base sin que un CV extremo domine.',
    example:
      'Si la base tiene CV de 25%, 40% y 120%, su media geométrica (~49%) refleja el nivel general de heterogeneidad de los datos.',
  },
  se_error: {
    title: 'Error estándar de la media (se = s / √n)',
    plainDefinition:
      'Indica qué tan preciso es el promedio de la muestra frente al promedio real de toda la población. Disminuye cuando aumenta el número de datos válidos (n).',
    example:
      'Con n = 250 clientes, el error estándar es ~16 veces más pequeño que la desviación estándar.',
  },
  asimetria: {
    title: 'Asimetría (Skewness, psych::describe)',
    plainDefinition:
      'Mide si la distribución tiene cola larga hacia valores altos (> 0) o hacia valores bajos (< 0). Entre -0,5 y +0,5 es prácticamente simétrica.',
    example:
      'Los ingresos, saldos de cartera y montos de compra suelen tener asimetría positiva alta (> +1) por unos pocos clientes grandes.',
  },
  curtosis: {
    title: 'Curtosis en exceso (Kurtosis, psych::describe)',
    plainDefinition:
      'Indica si hay concentración en el centro y colas pesadas con muchos extremos (> +1) frente a una campana normal (≈ 0).',
    example:
      'Una caída abrupta en un año de crisis (2020) o clientes con mora extrema disparan la curtosis por encima de +1.',
  },
  cuantiles: {
    title: 'Cuartiles y Percentiles (quantile tipo 7)',
    plainDefinition:
      'Dividen los datos ordenados en porcentajes usando la interpolación estándar tipo 7 de R. El percentil P indica el valor por debajo del cual cae el P% de los registros.',
    example:
      'Si el percentil 90 de factura es $190.000 pero el máximo es $540.000, el 90% paga $190.000 o menos y un 10% concentra tickets casi 3 veces mayores.',
  },
  plot_puntos: {
    title: 'Gráfico de puntos (como plot() en R)',
    plainDefinition:
      'Grafica cada registro individual en el orden en que aparece en la base para detectar de forma visual saltos bruscos o puntos muy separados del grupo.',
    example:
      'Un punto aislado muy arriba o abajo en plot(base$factura) delata de inmediato un cliente atípico o un error de digitación.',
  },
  histograma: {
    title: 'Histograma (hist)',
    plainDefinition:
      'Agrupa los datos en intervalos consecutivos y muestra cuántos registros caen en cada tramo.',
    example:
      'Permite ver en segundos si la mayoría de pedidos se agrupa entre $100.000 y $300.000.',
  },
  boxplot: {
    title: 'Diagrama de caja (boxplot y $out)',
    plainDefinition:
      'La caja va del 25% (Q1) al 75% (Q3), la línea interna marca la mediana, los bigotes llegan hasta 1,5 × IQR y los puntos rojos ($out) muestran los valores atípicos.',
    example:
      'Si el 50% central paga entre $60.000 y $110.000 y aparecen 12 puntos rojos arriba de $200.000, esos 12 casos son tus atípicos.',
  },
  qq_normal: {
    title: 'Gráfico Q-Q Normal (qqnorm y qqline)',
    plainDefinition:
      'Compara los cuantiles de tu variable contra los cuantiles teóricos de una campana normal. Si los puntos siguen la línea roja diagonal, la variable se comporta como normal.',
    example:
      'Si los puntos se curvan fuertemente hacia arriba al final, la variable tiene cola derecha pesada y no sigue una distribución normal.',
  },
  cagr: {
    title: 'Crecimiento anual compuesto (CAGR)',
    plainDefinition:
      'Tasa de crecimiento anual constante equivalente que lleva del primer dato disponible al último dato del periodo.',
    example:
      'Un CAGR de +25,5% anual indica expansión sostenida año tras año durante todo el horizonte observado.',
  },
  participacion_100: {
    title: 'Participación porcentual al 100%',
    plainDefinition:
      'Convierte cada componente en su porcentaje del total del año para ver quién gana y quién pierde cuota en el pastel.',
    example:
      'Permite detectar si un canal pasó de tener el 20% del presupuesto en 2010 a solo el 10% hoy.',
  },
  frecuencias: {
    title: 'Frecuencias (table) y Proporciones (prop.table)',
    plainDefinition:
      'Cuenta cuántos registros hay en cada categoría y qué porcentaje representan sobre el total válido.',
    example:
      'Muestra qué ciudades o planes concentran la mayoría de la cartera.',
  },
  factor_r: {
    title: 'Variables categóricas (factor) vs. códigos numéricos',
    plainDefinition:
      'Un código como 1 = Bogotá, 2 = Medellín o una bandera 0/1 representa categorías, no cantidades continuas. En R se convierten con as.factor() para no promediarlos sin sentido.',
    example:
      'Nunca digas «la ciudad promedio es 2,3»; mejor calcula qué porcentaje pertenece a cada ciudad.',
  },
  proporcion_01: {
    title: 'Proporciones entre 0 y 1',
    plainDefinition:
      'Decimales entre 0 y 1 representan partes de un total (0,42 = 42,0%). Activa el formato porcentaje para leerlos con claridad.',
    example:
      'Un uso de cupo de 0,785 equivale al 78,5% del cupo utilizado.',
  },
  na_rm: {
    title: 'Ignorar faltantes (na.rm = TRUE)',
    plainDefinition:
      'Calcula cada métrica usando únicamente los registros válidos de esa columna, sin inventar ceros ni promedios artificiales.',
    example:
      'En series de tiempo, si un canal no se medía en 2010–2011, na.rm = TRUE calcula su promedio real sobre los años medidos.',
  },
  total_check: {
    title: 'Verificación de columna Total',
    plainDefinition:
      'Suma los componentes fila por fila y confirma si coinciden exactamente con la columna de total declarada.',
    example:
      'Comprueba que TV + Digital + Radio + Prensa + Revistas + Exterior + Cine = Total inversión.',
  },
  pearson_spearman: {
    title: 'Correlación (Pearson r y Spearman ρ)',
    plainDefinition:
      'Miden de -1 a +1 la fuerza y dirección de la relación entre dos variables numéricas. Recordatorio clave: correlación alta no demuestra causalidad.',
    example:
      'En series de tiempo, dos variables que suben por crecimiento económico o inflación muestran r ≈ +0,95 sin que una cause la otra.',
  },
  crosstable: {
    title: 'Tabla cruzada completa (CrossTable)',
    plainDefinition:
      'Cruza dos variables categóricas mostrando en cada celda el conteo, % por fila, % por columna, % del total y su aporte al estadístico Chi-cuadrado.',
    example:
      'Permite ver qué porcentaje de clientes cancela dentro de cada plan y cuánto aporta esa celda a la diferencia total.',
  },
  chi_cuadrado: {
    title: 'Prueba Chi-cuadrado (chisq.test) y p-value simulado',
    plainDefinition:
      'Evalúa si dos variables categóricas son independientes o están relacionadas. Si p < 0,05 hay relación real. Si alguna frecuencia esperada es < 5, conviene validar con p-value simulado o agrupar categorías pequeñas.',
    example:
      'Si p = 0,0012 (< 0,05), el nivel de mora sí depende del tamaño o segmento de la empresa.',
  },
  mosaico: {
    title: 'Gráfico de mosaico por residuos de Pearson',
    plainDefinition:
      'Cada bloque tiene tamaño proporcional a los casos y color según el residuo de Pearson (O − E)/√E: azul indica más casos de los esperados por azar y rojo menos casos de los esperados.',
    example:
      'Un rectángulo azul intenso en Plan Básico × Canceló = 1 señala concentración excesiva de fuga en ese segmento.',
  },
};
