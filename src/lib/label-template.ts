import type { Template } from '@pdfme/common'
import type { LabelInput } from './csv-utils'

// Una etiqueta de 62 x 50 mm por página. Medidas en milímetros.
export const labelTemplate: Template = {
  basePdf: {
    width: 62,
    height: 50,
    padding: [0, 0, 0, 0],
  },
  schemas: [
    [
      {
        name: 'nombre',
        type: 'text',
        position: { x: 3, y: 3 },
        width: 56,
        height: 10,
        fontSize: 9,
        lineHeight: 1.1,
        // Si el nombre no cabe, la letra se reduce hasta 6 pt.
        dynamicFontSize: { min: 6, max: 9, fit: 'vertical' },
      },
      {
        name: 'ref',
        type: 'text',
        position: { x: 3, y: 13.5 },
        width: 56,
        height: 5,
        fontSize: 7,
        fontColor: '#444444',
      },
      {
        name: 'qty',
        type: 'text',
        position: { x: 3, y: 19 },
        width: 56,
        height: 8,
        fontSize: 13,
        alignment: 'center',
        verticalAlignment: 'middle',
      },
      {
        name: 'ean13',
        type: 'ean13',
        position: { x: 6, y: 28.5 },
        width: 50,
        height: 18.5,
        includetext: true,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
    ],
  ],
}

// Genera el PDF (una página por etiqueta). Se usa en el navegador y en los tests.
export async function generateLabelsPdf(inputs: LabelInput[]): Promise<Uint8Array> {
  const [{ generate }, { barcodes, text }] = await Promise.all([
    import('@pdfme/generator'),
    import('@pdfme/schemas'),
  ])
  const pdf = await generate({
    template: labelTemplate,
    inputs: inputs.map((i) => ({ ...i })),
    plugins: { text, ean13: barcodes.ean13 },
  })
  return new Uint8Array(pdf)
}
