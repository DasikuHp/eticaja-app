import type { Template } from '@pdfme/common'


export const labelTemplate: Template = {
  basePdf: {
    width: 62,
    height: 50,
    padding: [3, 3, 3, 3],
  },
  schemas: [
    [
      {
        name: 'nombre',
        type: 'text',
        x: 2,
        y: 2,
        width: 58,
        height: 10,
        fontSize: 8,
        fontStyle: 'bold',
        lineHeight: 1.2,
      },
      {
        name: 'ref',
        type: 'text',
        x: 2,
        y: 13,
        width: 58,
        height: 6,
        fontSize: 7,
      },
      {
        name: 'qty',
        type: 'text',
        x: 2,
        y: 20,
        width: 58,
        height: 8,
        fontSize: 10,
        fontStyle: 'bold',
        alignment: 'center',
      },
      {
        name: 'ean13',
        type: 'ean13',
        x: 4,
        y: 29,
        width: 54,
        height: 18,
        includetext: true,
      },
    ],
  ],
}

export async function getPlugins() {
  const { barcodes, text } = await import('@pdfme/schemas')
  return { text, ean13: barcodes.ean13 }
}
