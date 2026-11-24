import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PDFDocument } from '@pdfme/pdf-lib'
import { decodeCsv, fixEAN13, hasValidEAN, isValidEAN13, parseCsvText, rowToInput } from './csv-utils'
import { generateLabelsPdf } from './label-template'

const ejemplo = readFileSync(new URL('../../public/ejemplo.csv', import.meta.url), 'utf-8')

describe('isValidEAN13', () => {
  it('acepta un EAN con el dígito de control correcto', () => {
    expect(isValidEAN13('4006381333931')).toBe(true)
    expect(isValidEAN13('2000000410005')).toBe(true)
  })
  it('rechaza un dígito de control incorrecto, longitudes raras y letras', () => {
    expect(isValidEAN13('4006381333932')).toBe(false)
    expect(isValidEAN13('400638133393')).toBe(false)
    expect(isValidEAN13('40063813339A1')).toBe(false)
  })
})

describe('fixEAN13', () => {
  it('arregla los EAN que Excel deja con decimales o espacios', () => {
    expect(fixEAN13('4006381333931.0')).toBe('4006381333931')
    expect(fixEAN13(' 4006 3813 3393 1 ')).toBe('4006381333931')
  })
  it('convierte la notación científica, aunque Excel ya haya perdido dígitos', () => {
    expect(fixEAN13('4.006381333931E+12')).toBe('4006381333931')
    expect(isValidEAN13(fixEAN13('2.00000041185E+12'))).toBe(false)
  })
})

describe('parseCsvText', () => {
  it('lee el CSV de ejemplo separado por punto y coma', () => {
    const rows = parseCsvText(ejemplo)
    expect(rows).toHaveLength(12)
    expect(rows[0].DESC_CORTA_PRODUCTO).toBe('Aceite de oliva virgen extra 1 L')
    expect(rows.filter(hasValidEAN)).toHaveLength(10)
  })
  it('avisa si faltan columnas', () => {
    expect(() => parseCsvText('NOMBRE;EAN\nx;1')).toThrow(/faltan columnas: DESC_CORTA_PRODUCTO/)
  })
})

describe('decodeCsv', () => {
  it('lee UTF-8 y también Windows-1252 (CSV guardado con Excel)', () => {
    const utf8 = new TextEncoder().encode('Café;Azúcar').buffer as ArrayBuffer
    const latin1 = new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0x3b, 0x41, 0x7a, 0xfa, 0x63, 0x61, 0x72]).buffer
    expect(decodeCsv(utf8)).toBe('Café;Azúcar')
    expect(decodeCsv(latin1)).toBe('Café;Azúcar')
  })
})

describe('generateLabelsPdf', () => {
  it('genera un PDF con una página por etiqueta', async () => {
    const inputs = parseCsvText(ejemplo).filter(hasValidEAN).map(rowToInput)
    const pdf = await generateLabelsPdf(inputs)
    const doc = await PDFDocument.load(pdf)
    expect(doc.getPageCount()).toBe(inputs.length)
    // 62 x 50 mm en puntos (1 mm = 72 / 25,4 pt)
    const { width, height } = doc.getPage(0).getSize()
    expect(Math.round(width)).toBe(176)
    expect(Math.round(height)).toBe(142)
  })
})
