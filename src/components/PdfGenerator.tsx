import { useState } from 'react'
import { AlertCircle, Loader2, Printer } from 'lucide-react'
import type { ProductRow } from '../lib/csv-utils'
import { rowToInput } from '../lib/csv-utils'

type PdfGeneratorProps = {
  rows: ProductRow[]
  selectedRows: Set<number>
  fileName: string
  onComplete?: (count: number) => void
  onError?: (message: string) => void
}

export function PdfGenerator({ rows, selectedRows, fileName, onComplete, onError }: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const selectedRowsCount = selectedRows.size === 0 ? rows.length : selectedRows.size
  const activeRows = selectedRows.size === 0 ? rows : rows.filter((_, index) => selectedRows.has(index))

  const generatePDF = async () => {
    if (!rows.length) return
    setIsGenerating(true)
    setError(null)
    setProgress(0)

    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(90, current + Math.floor(Math.random() * 8) + 4))
    }, 100)

    try {
      const inputs = activeRows.map(rowToInput)
      if (!inputs.length) {
        throw new Error('No hay etiquetas seleccionadas para generar.')
      }

      const { generate } = await import('@pdfme/generator')
      const { labelTemplate, getPlugins } = await import('../lib/label-template')
      const plugins = await getPlugins()
      
      const pdfBytes = await generate({ template: labelTemplate, inputs, plugins })
      setProgress(100)

      const blob = new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName}_etiquetas.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      onComplete?.(inputs.length)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando PDF.'
      setError(message)
      onError?.(message)
    } finally {
      window.clearInterval(interval)
      setTimeout(() => {
        setIsGenerating(false)
        setProgress(0)
      }, 300)
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
          <p className="text-lg font-bold text-slate-900">{selectedRowsCount === rows.length ? `Todas (${rows.length})` : `${selectedRowsCount} etiquetas seleccionadas`}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Total filas</span>
          <span>{rows.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Etiquetas en esta descarga</span>
          <span>{selectedRowsCount}</span>
        </div>
      </div>

      {isGenerating ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Generando PDF</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>{error}</div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={isGenerating || rows.length === 0}
        onClick={generatePDF}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generando PDF...
          </>
        ) : (
          'Generar PDF'
        )}
      </button>
    </div>
  )
}
