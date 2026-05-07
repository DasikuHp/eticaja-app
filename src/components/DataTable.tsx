import { useMemo, useState } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { CheckCircle2, ArrowUpDown } from 'lucide-react'
import type { ProductRow } from '../lib/csv-utils'
import { fixEAN13 } from '../lib/csv-utils'

type DataTableProps = {
  rows: ProductRow[]
  selectedRows: Set<number>
  onToggleRow: (index: number) => void
  onToggleAll: () => void
  onSelectValid?: () => void
  onClearSelection?: () => void
}

type RowWithIndex = ProductRow & { __index: number }

const columnHelper = createColumnHelper<RowWithIndex>()

export function DataTable({
  rows,
  selectedRows,
  onToggleRow,
  onToggleAll,
  onSelectValid,
  onClearSelection,
}: DataTableProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 10

  const data = useMemo(
    () => rows.map((row, index) => ({ ...row, __index: index })),
    [rows],
  )

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize))
  const pageRows = useMemo(
    () => data.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [data, pageIndex],
  )

  const validEanCount = useMemo(
    () => rows.filter((row) => fixEAN13(row.EAN13_PRODUCTO).length === 13).length,
    [rows],
  )

  const table = useReactTable({
    data: pageRows,
    columns: [
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={rows.length > 0 && selectedRows.size === rows.length}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
        cell: ({ row }) => {
          const index = row.original.__index
          return (
            <input
              type="checkbox"
              checked={selectedRows.has(index)}
              onChange={() => onToggleRow(index)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          )
        },
      }),
      columnHelper.accessor('DESC_CORTA_PRODUCTO', {
        header: () => <span>Producto</span>,
        cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor('CODIGO_PRODUCTO', {
        header: () => <span>Referencia</span>,
        cell: (info) => <span>{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'cantidad',
        header: () => <span>Cantidad</span>,
        cell: ({ row }) => (
          <span>{`${row.original.CANTIDAD_C} ${row.original.UME_CONTENIDO}`}</span>
        ),
      }),
      columnHelper.accessor('EAN13_PRODUCTO', {
        header: () => (
          <div className="flex items-center gap-2">
            <span>EAN</span>
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
          </div>
        ),
        cell: (info) => {
          const raw = info.getValue()
          const fixed = fixEAN13(raw)
          const valid = fixed.length === 13
          return (
            <div className="flex flex-col gap-1">
              <span>{fixed}</span>
              {!valid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                  ⚠ EAN inválido
                </span>
              ) : null}
            </div>
          )
        },
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onSelectValid}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 hover:scale-[1.02]"
          >
            Seleccionar todos con EAN válido
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 hover:scale-[1.02]"
          >
            Limpiar selección
          </button>
        </div>
        <div className="text-sm text-slate-500">
          Mostrando {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, rows.length)} de {rows.length} productos
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm shadow-sm">
          <thead className="bg-slate-900 text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-4 py-4 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const idx = row.original.__index
              const selected = selectedRows.has(idx)
              return (
                <tr
                  key={row.id}
                  className={`border-t border-slate-200 transition-colors duration-200 ${
                    selected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-4 align-top text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-500">
          {validEanCount} con EAN válido
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
