import Papa from 'papaparse'

// Columnas que exporta el programa de gestión y que necesita la etiqueta.
export const REQUIRED_COLUMNS = [
  'DESC_CORTA_PRODUCTO',
  'EAN13_PRODUCTO',
  'CANTIDAD_C',
  'UME_CONTENIDO',
  'CODIGO_PRODUCTO',
] as const

export type ProductRow = Record<(typeof REQUIRED_COLUMNS)[number], string>

export interface LabelInput {
  nombre: string
  ref: string
  qty: string
  ean13: string
}

// Excel en español suele guardar los CSV en Windows-1252, no en UTF-8.
// Se intenta UTF-8 y, si aparecen caracteres no válidos, se relee como Windows-1252.
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes) // TextDecoder ya quita el BOM
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export function parseCsvText(text: string): ProductRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '', // autodetecta coma o punto y coma
    transformHeader: (h) => h.trim(),
  })

  const headers = result.meta.fields ?? []
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
  if (missing.length) {
    throw new Error(`Al CSV le faltan columnas: ${missing.join(', ')}`)
  }
  const fatal = result.errors.find((e) => e.type !== 'FieldMismatch')
  if (fatal) {
    throw new Error(`Error en la fila ${(fatal.row ?? 0) + 2}: ${fatal.message}`)
  }

  return result.data.map((row) => {
    const out = {} as ProductRow
    for (const c of REQUIRED_COLUMNS) out[c] = String(row[c] ?? '').trim()
    return out
  })
}

export async function parseCSV(file: File): Promise<ProductRow[]> {
  return parseCsvText(decodeCsv(await file.arrayBuffer()))
}

// Arregla los EAN que Excel estropea: "8.41234E+12", "8412345678905.0", espacios...
export function fixEAN13(raw: string): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''

  if (/[eE]/.test(value)) {
    const numeric = Number.parseFloat(value.replace(',', '.'))
    if (!Number.isFinite(numeric)) return value
    return Math.round(numeric).toString()
  }

  return value.replace(/[.,]0+$/, '').replace(/\D/g, '')
}

// Un EAN-13 es válido si tiene 13 dígitos y el último coincide con el dígito
// de control: se suman los 12 primeros alternando pesos 1 y 3.
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === digits[12]
}

export function hasValidEAN(row: ProductRow): boolean {
  return isValidEAN13(fixEAN13(row.EAN13_PRODUCTO))
}

export function rowToInput(row: ProductRow): LabelInput {
  return {
    nombre: row.DESC_CORTA_PRODUCTO,
    ref: row.CODIGO_PRODUCTO ? `Ref.: ${row.CODIGO_PRODUCTO}` : '',
    qty: `${row.CANTIDAD_C} ${row.UME_CONTENIDO}`.trim(),
    ean13: fixEAN13(row.EAN13_PRODUCTO),
  }
}
