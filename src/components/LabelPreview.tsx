import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ProductRow } from '../lib/csv-utils'
import { hasValidEAN, rowToInput } from '../lib/csv-utils'
import { generateLabelsPdf } from '../lib/label-template'

type Result = { key: string; url?: string; error?: string }

// Vista previa real: se genera el PDF de una sola etiqueta con la misma
// plantilla que el PDF final y se muestra en un iframe.
export function LabelPreview({ row }: { row: ProductRow | null }) {
  const input = useMemo(() => (row && hasValidEAN(row) ? rowToInput(row) : null), [row])
  const key = input ? JSON.stringify(input) : ''
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!input) return
    let cancelled = false
    let url: string | undefined
    generateLabelsPdf([input])
      .then((bytes) => {
        url = URL.createObjectURL(new Blob([bytes.slice()], { type: 'application/pdf' }))
        if (!cancelled) setResult({ key, url })
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [input, key])

  if (!row) {
    return <p className="p-6 text-center text-sm text-slate-500">Selecciona una fila para ver la etiqueta.</p>
  }
  if (!input) {
    return (
      <p className="p-6 text-center text-sm text-amber-700">
        La primera fila seleccionada no tiene un EAN válido y no se imprimirá.
      </p>
    )
  }
  if (result?.key !== key) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Generando vista previa...
      </div>
    )
  }
  if (result.error) return <p className="p-6 text-center text-sm text-rose-700">{result.error}</p>
  return (
    <iframe
      title="Vista previa de la etiqueta"
      src={`${result.url}#toolbar=0&navpanes=0&view=Fit`}
      className="aspect-[62/57] w-full rounded-xl border border-slate-200 bg-white"
    />
  )
}
