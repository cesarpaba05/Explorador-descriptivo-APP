import type { CleaningConfig, DatasetWorkspace, VariableConfig } from '../types/data';

export function sanitizeRObjectName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'base';
}

export function generateRCodeForStep(params: {
  step: number;
  workspace: DatasetWorkspace | null;
  timeCol: string | null;
  configs: VariableConfig[];
  cleaning: CleaningConfig;
}): { title: string; code: string; note: string } {
  const { step, workspace, timeCol, configs, cleaning } = params;
  const base = sanitizeRObjectName(workspace?.shortName || 'base');
  const fileName = workspace?.fileName || 'archivo.csv';
  const numCols = configs.filter((c) => c.role === 'numeric');
  const catCols = configs.filter((c) => c.role === 'categorical' || c.isBinary01);

  const firstNum = workspace?.selectedNumVar || numCols[0]?.name || 'variable_num';
  const firstCat = workspace?.selectedCatVar || catCols[0]?.name || 'variable_cat';
  const sx = workspace?.scatterX || numCols[0]?.name || 'var_x';
  const sy = workspace?.scatterY || numCols[1]?.name || firstNum;
  const gNum = workspace?.groupNumVar || firstNum;
  const gCat = workspace?.groupCatVar || firstCat;
  const cRow = workspace?.chiRowVar || catCols[0]?.name || 'cat_1';
  const cCol = workspace?.chiColVar || catCols[1]?.name || catCols[0]?.name || 'cat_2';
  const focus = workspace?.focusVar || firstNum;
  const pcts = (workspace?.customPercentiles || [10, 45, 90])
    .map((p) => (p / 100).toFixed(2))
    .join(', ');

  switch (step) {
    case 1:
      return {
        title: 'Definición de objeto y pregunta de trabajo en R',
        note: 'En R iniciamos documentando la pregunta de negocio y preparando la carpeta del proyecto.',
        code: `# Paso 1: Contexto de negocio (Fase CRISP-DM)
pregunta_negocio <- "${(workspace?.context.question || 'Definir pregunta de negocio').replace(/"/g, "'")}"
unidad_cifras <- "${workspace?.context.unit || 'unidades'}"

# Paquetes recomendados para todo el análisis
library(psych)
library(gmodels)
library(readxl)`,
      };

    case 2: {
      const isExcel = workspace?.sourceKind === 'excel';
      const sep = workspace?.delimiterUsed || ';';
      const dec = workspace?.decimalUsed === 'comma' ? ',' : '.';
      return {
        title: isExcel ? 'Importar hoja de Excel en R' : 'Importar archivo CSV en R',
        note: 'Siempre cargamos el archivo en un objeto nuevo en memoria para no modificar el archivo original.',
        code: isExcel
          ? `# Cargar desde Excel sin alterar el archivo original
library(readxl)
${base} <- read_excel("${fileName}", sheet = 1)`
          : `# Cargar desde CSV detectando separador y decimal
${base} <- read.csv("${fileName}", sep = "${sep}", dec = "${dec}", stringsAsFactors = FALSE)`,
      };
    }

    case 3:
      return {
        title: 'Inspección inicial: head() y dim()',
        note: 'Equivalente a revisar las primeras 3 o 5 filas y el tamaño de la tabla.',
        code: `# Dimensiones (filas y columnas)
dim(${base})
nrow(${base})
ncol(${base})

# Primeras 3 y primeras 5 filas
head(${base}, 3)
head(${base}, 5)`,
      };

    case 4: {
      const factorCols = configs
        .filter((c) => c.role === 'categorical')
        .slice(0, 3)
        .map((c) => `${base}$${c.name} <- as.factor(${base}$${c.name})`)
        .join('\n');
      return {
        title: 'Estructura y conversión de tipos: str(), class() y as.factor()',
        note: 'Convierte códigos numéricos a factores para evitar promediarlos por error.',
        code: `# Ver estructura completa y clase de una columna
str(${base})
class(${base}$${firstNum})

# Convertir variables categóricas o códigos numéricos en factor
${factorCols || `${base}$${firstCat} <- as.factor(${base}$${firstCat})`}`,
      };
    }

    case 5: {
      const totalC = workspace?.totalCol;
      const comps = (workspace?.totalCheckComponents || []).slice(0, 5).join(' + ');
      return {
        title: 'Auditoría de calidad, faltantes (na.rm = TRUE) y duplicados',
        note: 'Por defecto se preservan los NA para no distorsionar series históricas.',
        code: `# Conteo de datos faltantes por columna y válidos
colSums(is.na(${base}))
colSums(!is.na(${base}))

# Detectar valores negativos imposibles y filas duplicadas
which(${base}$${firstNum} < 0)
sum(duplicated(${base}))

${cleaning.missingAction === 'drop' ? `# Eliminar filas con NA\n${base} <- na.omit(${base})` : cleaning.missingAction === 'impute_median' ? `# Imputar NA con la mediana\n${base}$${firstNum}[is.na(${base}$${firstNum})] <- median(${base}$${firstNum}, na.rm = TRUE)` : `# Mantener NA intactos e ignorarlos en cada cálculo con na.rm = TRUE`}
${totalC && comps ? `\n# Verificar si ${totalC} coincide con la suma de componentes\ndiff_total <- ${base}$${totalC} - (${comps})\nsummary(diff_total)` : ''}`,
      };
    }

    case 6:
      return {
        title: 'Resumen general summary() y gráfico de puntos plot()',
        note: 'summary() resume numéricas por cuartiles y categóricas por conteo.',
        code: `# Resumen general de todas las columnas
summary(${base})

# Gráfico de puntos de una variable para detectar valores alejados
plot(${base}$${firstNum},
     main = "Gráfico de puntos: ${firstNum}",
     ylab = "${firstNum}",
     xlab = "Índice de registro",
     pch = 19, col = "#1d4ed8")`,
      };

    case 7:
      return {
        title: 'Tendencia central: media, mediana, moda y media recortada',
        note: 'mean(..., trim = 0.2) elimina 10% en cada extremo para evitar sesgo por atípicos.',
        code: `x <- ${base}$${firstNum}

mean(x, na.rm = TRUE)              # Media aritmética
median(x, na.rm = TRUE)            # Mediana (50%)
mean(x, trim = 0.2, na.rm = TRUE)  # Media recortada al 20%

# Moda en R mediante tabla de frecuencias
tabla_moda <- sort(table(x), decreasing = TRUE)
names(tabla_moda)[1]`,
      };

    case 8: {
      const numList = numCols.slice(0, 6).map((c) => `"${c.name}"`).join(', ');
      return {
        title: 'Dispersión y Coeficiente de Variación (apply)',
        note: 'Calcula el CV de una variable y de todas las columnas numéricas a la vez para compararlas.',
        code: `x <- ${base}$${firstNum}
diff(range(x, na.rm = TRUE))       # Rango
var(x, na.rm = TRUE)               # Varianza muestral (n - 1)
sd(x, na.rm = TRUE)                # Desviación estándar
IQR(x, na.rm = TRUE)               # Rango intercuartílico (Q3 - Q1)
mad(x, constant = 1.4826, na.rm = TRUE) # MAD ajustada a normal

# Función CV y aplicación a todas las numéricas
CV <- function(v) (sd(v, na.rm = TRUE) / abs(mean(v, na.rm = TRUE))) * 100
cols_num <- c(${numList || `"${firstNum}"`})
apply(${base}[, cols_num, drop = FALSE], 2, CV)`,
      };
    }

    case 9:
      return {
        title: 'Descriptivos completos psych::describe() y media geométrica de CV',
        note: 'Combina tamaño válido, tendencia, dispersión, asimetría, curtosis y error estándar.',
        code: `library(psych)
cols_num <- sapply(${base}, is.numeric)
desc <- describe(${base}[, cols_num, drop = FALSE])

# Agregar CV (%) y calcular media geométrica de los CV
CV <- function(v) (sd(v, na.rm = TRUE) / abs(mean(v, na.rm = TRUE))) * 100
cvs <- sapply(${base}[, cols_num, drop = FALSE], CV)
desc$CV <- cvs
media_geom_cv <- exp(mean(log(cvs[cvs > 0]), na.rm = TRUE))

# Si la asimetría es alta (> 1), evaluar transformación logarítmica:
skew(log1p(${base}$${firstNum}))`,
      };

    case 10:
      return {
        title: 'Cuartiles y percentiles personalizados con quantile()',
        note: 'Usa el algoritmo tipo 7 por defecto de R tanto para una variable como para toda la base.',
        code: `# Cuantiles personalizados en una variable
quantile(${base}$${firstNum}, probs = c(0.25, 0.50, 0.75${pcts ? `, ${pcts}` : ''}), na.rm = TRUE, type = 7)

# Aplicar los mismos cuantiles a todas las columnas numéricas
cols_num <- sapply(${base}, is.numeric)
apply(${base}[, cols_num, drop = FALSE], 2, quantile,
      probs = c(0.25, 0.50, 0.75${pcts ? `, ${pcts}` : ''}), na.rm = TRUE, type = 7)`,
      };

    case 11:
      return {
        title: 'Histograma, Boxplot ($out) y Gráfico Q-Q Normal',
        note: 'boxplot()$out extrae automáticamente los puntos fuera de los bigotes de Tukey.',
        code: `x <- ${base}$${firstNum}

# 1. Histograma
hist(x, main = "Histograma de ${firstNum}", col = "#1d4ed8", border = "white")

# 2. Boxplot y lista exacta de valores atípicos
bp <- boxplot(x, main = "Boxplot de ${firstNum}", col = "#dbeafe", outcol = "#dc2626", pch = 19)
bp$out          # Lista de valores atípicos
length(bp$out)  # Cantidad de atípicos

# 3. Gráfico Q-Q Normal y línea teórica
qqnorm(x, main = "Q-Q Normal: ${firstNum}")
qqline(x, col = "#dc2626", lwd = 2)`,
      };

    case 12:
      return {
        title: 'Evolución temporal y participación al 100%',
        note: 'Ordena por la variable de tiempo y mide crecimiento acumulado, CAGR y participación.',
        code: timeCol
          ? `# Ordenar cronológicamente por ${timeCol}
${base}_ord <- ${base}[order(${base}$${timeCol}), ]

# Serie de tiempo con puntos y tendencia suavizada
plot(${base}_ord$${timeCol}, ${base}_ord$${firstNum}, type = "o", pch = 19, col = "#1d4ed8",
     xlab = "${timeCol}", ylab = "${firstNum}")
lines(lowess(${base}_ord$${timeCol}, ${base}_ord$${firstNum}), col = "#d97706", lwd = 2, lty = 2)

# Participación porcentual sobre el total
# prop.table(as.matrix(${base}_ord[, componentes]), margin = 1) * 100`
          : `# No se ha asignado una variable de tiempo en esta base.
# Si tienes una columna de año o fecha, márcala como "Tiempo" en el Paso 4.`,
      };

    case 13:
      return {
        title: 'Tablas de frecuencia table() y proporciones prop.table()',
        note: 'Para variables binarias 0/1, mean(x) entrega directamente la proporción de 1.',
        code: `# Frecuencias absolutas ordenadas y proporciones (%)
freq <- sort(table(${base}$${firstCat}), decreasing = TRUE)
freq
round(prop.table(freq) * 100, 1)

# Gráfico de barras ordenado
barplot(freq, las = 2, col = "#0f766e", main = "Frecuencias de ${firstCat}")`,
      };

    case 14:
      return {
        title: 'Cruces bivariados: Dispersión, Boxplot por grupos, CrossTable y Mosaico',
        note: 'Incluye correlación, boxplot agrupado, tabla cruzada completa y prueba Chi-cuadrado.',
        code: `# a) Numérica vs. Numérica
plot(${base}$${sx}, ${base}$${sy}, pch = 19, col = "#1d4ed8")
abline(lm(${sy} ~ ${sx}, data = ${base}), col = "#dc2626", lwd = 2)
cor.test(${base}$${sx}, ${base}$${sy}, method = "pearson")

# b) Numérica vs. Categórica
boxplot(${gNum} ~ ${gCat}, data = ${base}, col = "#dbeafe", outcol = "#dc2626")

# c) Categórica vs. Categórica (CrossTable + Chi-cuadrado + Mosaico)
library(gmodels)
CrossTable(${base}$${cRow}, ${base}$${cCol}, prop.chisq = TRUE, expected = TRUE)
tabla <- table(${base}$${cRow}, ${base}$${cCol})
chisq.test(tabla)
chisq.test(tabla, simulate.p.value = TRUE, B = 2000) # Si hay esperados < 5
mosaicplot(tabla, shade = TRUE, main = "Mosaico por residuos de Pearson")`,
      };

    case 15:
      return {
        title: 'Extracción de indicadores para diagnóstico de variable foco',
        note: 'Resume cuantiles, dispersión y relaciones de la variable foco para sustentar decisiones.',
        code: `# Perfil integral de la variable foco: ${focus}
summary(${base}$${focus})
quantile(${base}$${focus}, probs = c(0.10, 0.25, 0.50, 0.75, 0.90), na.rm = TRUE)
boxplot.stats(${base}$${focus})$out
cor(${base}[, sapply(${base}, is.numeric)], use = "pairwise.complete.obs")[, "${focus}"]`,
      };

    default:
      return {
        title: 'Exportación reproducible de estadísticas descriptivas en R',
        note: 'Guarda la tabla resumen con formato decimal colombiano para compartir con el equipo.',
        code: `# Exportar tabla de estadísticas descriptivas a CSV (separador ; y coma decimal)
library(psych)
tabla_desc <- describe(${base}[, sapply(${base}, is.numeric), drop = FALSE])
write.csv2(tabla_desc, file = "estadisticas_${base}.csv", row.names = TRUE)`,
      };
  }
}
