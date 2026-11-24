import { useState } from 'react'
import { AlertCircle, Loader2, Printer } from 'lucide-react'
import type { ProductRow } from '../lib/csv-utils'
import { hasValidEAN, rowToInput } from '../lib/csv-utils'
import { generateLabelsPdf } from '../lib/label-template'

type PdfGeneratorProps = {
  rows: ProductRow[]
  selectedRows: Set<number>
  fileName: string
  onComplete?: (count: number, skipped: number) => void
  onError?: (message: string) => void
}

export function PdfGenerator({ rows, selectedRows, fileName, onComplete, onError }: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = rows.filter((_, index) => selectedRows.has(index))
  const printable = selected.filter(hasValidEAN)
  const skipped = selected.length - printable.length

  const generatePDF = async () => {
    if (!printable.length) return
    setIsGenerating(true)
    setError(null)
    try {
      const pdfBytes = await generateLabelsPdf(printable.map(rowToInput))
      const url = URL.createObjectURL(new Blob([pdfBytes.slice()], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName}_etiquetas.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onComplete?.(printable.length, skipped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el PDF.'
      setError(message)
      onError?.(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
          <Printer className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">Generador de etiquetas</p>
          <p className="text-lg font-bold text-slate-900">{printable.length} etiquetas para imprimir</p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Filas seleccionadas</span>
          <span>{selected.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Páginas del PDF (una etiqueta por página)</span>
          <span>{printable.length}</span>
        </div>
        {skipped > 0 ? (
          <div className="flex items-center justify-between text-amber-700">
            <span>Se omiten por EAN no válido</span>
            <span>{skipped}</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>{error}</div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={isGenerating || printable.length === 0}
        onClick={generatePDF}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generando PDF...
          </>
        ) : printable.length === 0 ? (
          'Selecciona al menos una fila con EAN válido'
        ) : (
          'Descargar PDF'
        )}
      </button>
    </div>
  )
}
