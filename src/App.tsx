import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react'
import { CsvDropzone } from './components/CsvDropzone'
import { DataTable } from './components/DataTable'
import { PdfGenerator } from './components/PdfGenerator'
import { LabelPreview } from './components/LabelPreview'
import type { ProductRow } from './lib/csv-utils'
import { hasValidEAN, parseCSV } from './lib/csv-utils'

type Step = 'upload' | 'review' | 'generate'

type Toast = { type: 'success' | 'error'; message: string }

function App() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [fileName, setFileName] = useState('')
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [toast, setToast] = useState<Toast | null>(null)

  const visibleSelectedCount = selectedRows.size

  // Índices de las filas cuyo EAN-13 es válido (13 dígitos y dígito de control correcto).
  const selectedValidRows = useMemo(
    () => new Set(rows.flatMap((row, index) => (hasValidEAN(row) ? [index] : []))),
    [rows],
  )
  const validCount = selectedValidRows.size

  // La vista previa muestra la primera fila seleccionada.
  const previewRow = useMemo(() => {
    const firstIndex = rows.findIndex((_, index) => selectedRows.has(index))
    return firstIndex >= 0 ? rows[firstIndex] : null
  }, [rows, selectedRows])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleFileLoaded = (file: File, rows: ProductRow[]) => {
    setRows(rows)
    setFileName(file.name.replace(/\.csv$/i, ''))
    // Por defecto solo se marcan las filas que se pueden imprimir.
    setSelectedRows(new Set(rows.flatMap((row, index) => (hasValidEAN(row) ? [index] : []))))
    setCurrentStep('review')
  }

  const loadExample = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}ejemplo.csv`)
      const file = new File([await res.blob()], 'ejemplo.csv', { type: 'text/csv' })
      handleFileLoaded(file, await parseCSV(file))
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo cargar el ejemplo' })
    }
  }

  const handleToggleRow = (index: number) => {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleToggleAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set())
      return
    }
    setSelectedRows(new Set(rows.map((_, index) => index)))
  }

  const handleSelectValid = () => {
    setSelectedRows(new Set(selectedValidRows))
  }

  const handleClearSelection = () => {
    setSelectedRows(new Set())
  }

  const handlePdfComplete = (count: number, skipped: number) => {
    setToast({
      type: 'success',
      message: `PDF descargado con ${count} etiquetas${skipped ? ` (${skipped} omitidas por EAN no válido)` : ''}`,
    })
  }

  const handlePdfError = (message: string) => {
    setToast({ type: 'error', message })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[32px] bg-slate-900 px-6 py-6 shadow-xl ring-1 ring-slate-800/50 sm:flex sm:items-center sm:justify-between sm:px-8">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Eticaja</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Etiquetas de 62 x 50 mm con código de barras EAN-13 a partir del CSV de tu programa de gestión.
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
            {['Cargar CSV', 'Revisar datos', 'Generar PDF'].map((label, index) => {
              const step = index === 0 ? 'upload' : index === 1 ? 'review' : 'generate'
              const active = currentStep === step
              const completed =
                (step === 'review' && currentStep !== 'upload') || (step === 'generate' && currentStep === 'generate')
              return (
                <div key={step} className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold transition ${
                      active ? 'bg-indigo-600 text-white shadow-lg' : completed ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-slate-900' : 'text-slate-600'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-400">Paso {index + 1}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <main className="space-y-8">
          <section className={`${currentStep !== 'upload' ? 'hidden' : 'block'} transition-opacity duration-300`}> 
            <div className="space-y-4 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-indigo-500">Paso 1</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Carga el CSV de productos</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Arrastra el archivo o selecciónalo para revisar los productos antes de generar las etiquetas.
                </p>
              </div>
              <CsvDropzone onFileLoaded={handleFileLoaded} isLoading={false} />
              <p className="text-center text-sm text-slate-500">
                ¿No tienes uno a mano?{' '}
                <button type="button" onClick={loadExample} className="font-semibold text-indigo-600 underline">
                  Probar con un CSV de ejemplo
                </button>
              </p>
            </div>
          </section>

          <section className={`${currentStep !== 'review' ? 'hidden' : 'block'} transition-opacity duration-300`}>
            <div className="space-y-6 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-indigo-500">Paso 2</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Datos del CSV: {fileName || 'Sin nombre'}</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Productos', value: rows.length },
                    { label: 'Con EAN válido', value: validCount },
                    { label: 'Seleccionados', value: visibleSelectedCount },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <DataTable
                rows={rows}
                selectedRows={selectedRows}
                onToggleRow={handleToggleRow}
                onToggleAll={handleToggleAll}
                onSelectValid={handleSelectValid}
                onClearSelection={handleClearSelection}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-[1.02] hover:bg-slate-100 sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cargar otro CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('generate')}
                  className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-indigo-700 sm:w-auto"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className={`${currentStep !== 'generate' ? 'hidden' : 'block'} transition-opacity duration-300`}>
            <div className="space-y-6 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-indigo-500">Paso 3</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Genera tu PDF de etiquetas</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Ajusta la selección y revisa la vista previa antes de descargar.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Archivo</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{fileName || 'etiquetas'}.pdf</p>
                  <p className="mt-1 text-sm text-slate-600">Etiquetas seleccionadas: {visibleSelectedCount}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                  <PdfGenerator
                    rows={rows}
                    selectedRows={selectedRows}
                    fileName={fileName || 'etiquetas'}
                    onComplete={handlePdfComplete}
                    onError={handlePdfError}
                  />
                </div>
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Vista previa</p>
                      <p className="text-sm text-slate-500">Primera etiqueta seleccionada, tal cual sale en el PDF</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                    <LabelPreview row={previewRow} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-[1.02] hover:bg-slate-100 sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a revisar
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 rounded-[32px] border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 shadow-sm">
          El CSV se procesa en tu navegador: no se sube a ningún servidor.
        </footer>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-3xl px-4 py-4 shadow-2xl transition-opacity duration-300 sm:px-6">
          <div
            className={`rounded-3xl px-4 py-4 text-sm font-semibold shadow-sm ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
