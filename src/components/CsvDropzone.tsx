import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { UploadCloud, Loader2, CheckCircle } from 'lucide-react'
import { parseCSV } from '../lib/csv-utils'
import type { ProductRow } from '../lib/csv-utils'

type CsvDropzoneProps = {
  onFileLoaded: (file: File, rows: ProductRow[]) => void
  isLoading: boolean
}

export function CsvDropzone({ onFileLoaded, isLoading }: CsvDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFiles = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor selecciona un archivo .csv válido.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const rows = await parseCSV(file)
      setFileName(file.name)
      setRowCount(rows.length)
      onFileLoaded(file, rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar el CSV.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) handleFiles(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFiles(file)
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`group relative rounded-[28px] border border-dashed p-8 text-center transition-all duration-300 ${
        dragActive ? 'border-indigo-500 bg-white shadow-lg' : 'border-slate-300 bg-slate-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
        <UploadCloud className="h-8 w-8" />
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-lg font-semibold text-slate-900">Arrastra tu ETICAJA.csv aquí</p>
        <p className="text-sm text-slate-500">o haz click para seleccionar</p>
      </div>

      <button
        type="button"
        onClick={openPicker}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-slate-800"
      >
        Seleccionar archivo
      </button>

      <div className="mt-6 text-sm text-slate-600">
        {loading || isLoading ? (
          <div className="flex items-center justify-center gap-2 text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando CSV...
          </div>
        ) : fileName ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            {fileName} · {rowCount ?? 0} filas leídas
          </div>
        ) : (
          <span>Soporta archivos .csv con encabezados ETICAJA.</span>
        )}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}
