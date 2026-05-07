import Papa from 'papaparse'

export interface ProductRow {
  DESC_CORTA_PRODUCTO: string
  EAN13_PRODUCTO: string
  CANTIDAD_C: string
  UME_CONTENIDO: string
  CODIGO_PRODUCTO: string
}

export interface LabelInput {
  nombre: string
  ref: string
  qty: string
  ean13: string
}

export function parseCSV(file: File): Promise<ProductRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: 'auto',
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length) {
          reject(new Error(results.errors[0].message || 'Error al parsear CSV'))
          return
        }

        const rows: ProductRow[] = results.data.map((row) => ({
          DESC_CORTA_PRODUCTO: String(row.DESC_CORTA_PRODUCTO ?? '').trim(),
          EAN13_PRODUCTO: String(row.EAN13_PRODUCTO ?? '').trim(),
          CANTIDAD_C: String(row.CANTIDAD_C ?? '').trim(),
          UME_CONTENIDO: String(row.UME_CONTENIDO ?? '').trim(),
          CODIGO_PRODUCTO: String(row.CODIGO_PRODUCTO ?? '').trim(),
        }))

        resolve(rows)
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

export function fixEAN13(raw: string): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''

  if (/[eE]/.test(value)) {
    const numeric = Number.parseFloat(value)
    if (!Number.isFinite(numeric)) return value
    return Math.round(numeric).toString()
  }

  const cleaned = value.replace(/\.0+$/, '').replace(/\s+/g, '')
  if (/^\d+$/.test(cleaned)) {
    return cleaned
  }

  return cleaned.replace(/\D/g, '')
}

export function rowToInput(row: ProductRow): LabelInput {
  return {
    nombre: row.DESC_CORTA_PRODUCTO ?? '',
    ref: `Ref.: ${row.CODIGO_PRODUCTO ?? ''}`,
    qty: `${row.CANTIDAD_C ?? ''}  ${row.UME_CONTENIDO ?? ''}`.trim(),
    ean13: fixEAN13(row.EAN13_PRODUCTO ?? ''),
  }
}
