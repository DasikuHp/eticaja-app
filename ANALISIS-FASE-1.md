# ETICAJA — Informe de Análisis (Fase 1)

> Auditoría técnica previa a cualquier cambio de código. Fecha: 2026-06-15.

---

## 1. Resumen ejecutivo

ETICAJA es una SPA **100% cliente** (sin backend) que genera PDFs de etiquetas de producto (62×50 mm con código EAN-13) a partir de un CSV, mediante un asistente de 3 pasos: cargar → revisar → generar. El stack es moderno y la separación en componentes es razonable.

**Hallazgo crítico: la aplicación no compila.** `npm run build` ejecuta `tsc -b` primero y este falla con **8 errores de TypeScript**, así que nunca llega a `vite build`. No se puede desplegar en su estado actual. La causa de fondo más grave es que la plantilla de etiquetas (`label-template.ts`) está escrita con el formato de esquema **antiguo de pdfme (`x`/`y` planos)**, pero la versión instalada es **pdfme v6**, que exige `position: { x, y }`. Es a la vez error de compilación y bug de correctitud en la función principal del producto.

No hay tests (0% cobertura), ni CI, ni README real (es el del template de Vite), ni configuración de despliegue. Para un producto estático esto es subsanable en pocos días: el grueso del esfuerzo es arreglar el build, blindar la generación de PDF y dejar la base productiva (README, deploy, tests).

---

## 2. Mapa de arquitectura

### Stack (versiones reales instaladas)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| UI | React + React DOM | 19.2.5 |
| Lenguaje | TypeScript | 6.0.3 |
| Bundler | Vite + plugin-react | 8.0.10 / 6 |
| Estilos | Tailwind CSS (plugin Vite) | 4.2.4 |
| PDF | @pdfme/common · generator · schemas · ui | 6.0.6 |
| Tabla | @tanstack/react-table | 8.21.3 |
| CSV | papaparse | 5.5.3 |
| Iconos | lucide-react | 1.11.0 |
| Lint | ESLint / typescript-eslint | 10.2.1 / 8.58 |
| Runtime | Node (build) | 22.x |

Sin backend, sin base de datos, sin API, sin servidor. Es un sitio estático.

### Estructura de carpetas

```
src/
  main.tsx              Punto de entrada (monta <App/> en #root)
  App.tsx               Orquestador: máquina de estados de 3 pasos + todo el estado
  index.css             Tailwind + base (único CSS activo)
  App.css               ⚠ Sobrante del template de Vite — NO se importa (muerto)
  components/
    CsvDropzone.tsx     Carga de archivo (drag&drop + picker) → parseCSV
    DataTable.tsx       Tabla TanStack: paginación cliente, selección, badge EAN
    PdfGenerator.tsx    Importa pdfme bajo demanda, genera blob y dispara descarga
  lib/
    csv-utils.ts        Tipos (ProductRow), parseCSV, fixEAN13, rowToInput
    label-template.ts   Plantilla pdfme + carga de plugins
  assets/               hero.png, react.svg, vite.svg ⚠ todos sin usar (muertos)
```

### Flujo de datos (entrada → proceso → salida)

```
CSV (File)
  → papaparse (header:true)            [CsvDropzone → csv-utils.parseCSV]
  → ProductRow[]                       [estado en App.tsx]
  → usuario selecciona subconjunto     [DataTable, Set<number> de índices]
  → rowToInput() mapea a LabelInput    [csv-utils]
  → pdfme generate({template,inputs})  [PdfGenerator, import dinámico]
  → Uint8Array → Blob → <a download>   [descarga en navegador]
```

Todo ocurre en el navegador; los datos nunca salen del cliente (privacidad real, punto a favor). `pdfme` se carga con `import()` dinámico → se separa del bundle inicial (acierto).

---

## 3. Lista priorizada de problemas

### 🔴 CRÍTICO (bloquea build o rompe la función principal)

| # | Problema | Archivo | Detalle |
|---|----------|---------|---------|
| C1 | **El build no pasa** | `package.json` build | `tsc -b && vite build`: `tsc` falla con 8 errores → nunca compila. No desplegable. |
| C2 | **Esquema pdfme desfasado de la versión** | `label-template.ts` | Usa `x`/`y` planos; pdfme **v6** exige `position:{x,y}`. 4 errores TS y, en runtime, las etiquetas no se posicionan / la generación falla. Es el corazón del producto. |
| C3 | **`Uint8Array` no asignable a `BlobPart`** | `PdfGenerator.tsx:45` | Cambio de tipado de TS 6 / lib.dom. Rompe la compilación (corrección: cast de 1 línea). |
| C4 | Imports sin usar bloquean el build | `App.tsx:2`, `DataTable.tsx:3` | `ShieldCheck`, `Sparkles`, `CheckCircle2` + `noUnusedLocals` → 3 errores TS. |

> Nota: el `git status` marca 5 archivos modificados, pero `git diff --ignore-all-space` está vacío: son **solo cambios de fin de línea LF→CRLF** (checkout en Windows sin `.gitattributes`). No es código nuevo, pero conviene normalizarlo.

### 🟠 IMPORTANTE (calidad, robustez, seguridad razonable)

| # | Problema | Detalle |
|---|----------|---------|
| I1 | `npm run lint` falla | 3 errores (mismos imports muertos). El gate de calidad está en rojo. |
| I2 | Un EAN inválido aborta TODO el PDF | `generate()` no tiene try/catch por fila. `fixEAN13` valida solo longitud=13, **no el dígito de control**; pdfme rechaza un EAN-13 con checksum incorrecto y se cae toda la descarga, no solo esa etiqueta. |
| I3 | Sin validación de columnas del CSV | Si el CSV no trae `EAN13_PRODUCTO`, `DESC_CORTA_PRODUCTO`, etc., cada campo queda `''`, las filas "parsean bien" y se genera un PDF de etiquetas en blanco sin aviso. |
| I4 | Sin Error Boundary | Cualquier excepción en render deja pantalla en blanco; no hay captura global de errores de UI. |
| I5 | Sin límite de tamaño de archivo | Un CSV enorme puede agotar memoria de la pestaña (DoS sobre uno mismo). Generación de PDF es síncrona en el hilo principal → congela la UI con muchas filas. |
| I6 | README falso | Es el README por defecto de Vite; no explica qué es ETICAJA, cómo se instala ni se despliega. Un dev nuevo no entiende la app. |

### 🟡 MEJORA (deuda menor / pulido)

| # | Problema | Detalle |
|---|----------|---------|
| M1 | Código muerto | `App.css` (184 líneas, no importado) + assets `hero.png`/`react.svg`/`vite.svg` sin uso. |
| M2 | Lógica EAN duplicada | El conteo de EAN válidos se recalcula en `App.tsx` y `DataTable.tsx`; convendría centralizarlo. |
| M3 | Convención implícita "set vacío = todas" | Repetida en `App` y `PdfGenerator`; comportamiento mágico sin nombre. La selección es por índice (`Set<number>`), frágil si en el futuro se ordena/filtra. |
| M4 | Afordancia engañosa | La cabecera EAN muestra icono de ordenar (`ArrowUpDown`) pero **no hay ordenación implementada**. |
| M5 | Barra de progreso falsa | El % avanza con `Math.random()` en un timer; es cosmético, no refleja progreso real. |
| M6 | Sin separación de config / `.env.example` | Hoy la app no necesita variables (es estática), pero no hay plantilla ni documentación para cuando haga falta (p. ej. tamaño de etiqueta configurable). |

### Nota honesta sobre seguridad y "producción"

Por ser **estática y sin backend**, varios ítems del checklist no aplican literalmente: no hay endpoints que autenticar, ni secrets (confirmado: **cero secrets** en el código ✓), ni servidor que necesite *graceful shutdown* o *health check*. La superficie de XSS es baja: React escapa el texto y los datos van a un PDF, no a `innerHTML` (no hay `dangerouslySetInnerHTML`). La "seguridad" real aquí se reduce a: límite de tamaño de archivo (I5), validación de entrada (I3) y **cabeceras de seguridad/CSP en el hosting** (se configuran en el proveedor estático, no en el código).

---

## 4. Estimación de trabajo por sprint

Estimaciones para **1 desarrollador**, calibradas al tamaño real (~1.000 líneas, app estática). No infladas.

| Sprint | Alcance principal | Esfuerzo |
|--------|-------------------|----------|
| **1 — Estabilidad** | Arreglar build: `position` en pdfme (C2), cast Blob (C3), imports muertos (C4); Error Boundary (I4); try/catch por fila en PDF (I2); `.gitattributes` | **0,5–1 día** |
| **2 — Calidad** | Quitar código muerto (M1); centralizar lógica EAN (M2); nombrar la convención de selección (M3); validar columnas del CSV (I3); naming/responsabilidades | **0,5–1 día** |
| **3 — Seguridad** | Límite de tamaño de archivo (I5); saneo de entrada; CSP + cabeceras de seguridad a nivel hosting | **~0,5 día** |
| **4 — Performance** | `manualChunks` para pdfme; lote/Web Worker para sets grandes; limpiar memoización | **0,5–1 día** |
| **5 — Producción** | README real; `.env.example`; config de despliegue (host estático o Dockerfile+nginx); build optimizado y verificado; progreso real o honesto (M5) | **~1 día** |
| **6 — Tests** | Vitest + Testing Library; unit de `csv-utils`/`fixEAN13`/`rowToInput`; tests de componentes clave; workflow CI básico | **1–1,5 días** |

**Total realista: ~4–6 días de desarrollo.** El camino crítico es el Sprint 1 (sin build no hay nada que desplegar); todo lo demás es incremental y de bajo riesgo.

---

## Puntos a favor (para no perderlos en el refactor)

- Stack moderno y coherente; buena división en componentes.
- `pdfme` cargado bajo demanda (code-splitting correcto).
- Procesamiento 100% local → privacidad real.
- TS razonablemente estricto (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- Manejo de errores con feedback al usuario en carga y generación (toasts con auto-cierre y limpieza).
