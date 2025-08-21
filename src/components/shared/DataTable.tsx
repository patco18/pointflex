import React, { useState, useMemo } from 'react'
import { Search, Filter, LayoutGrid, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react'

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  sortable?: boolean
  filterOptions?: { label: string; value: string }[]
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  searchTerm?: string
  onSearchChange?: (term: string) => void
  emptyMessage?: string
  actions?: (row: any) => React.ReactNode
  pageSize?: number
  enableCardView?: boolean
}

export default function DataTable({
  data,
  columns,
  searchTerm = '',
  onSearchChange = () => {},
  emptyMessage = "Aucune donnée",
  actions,
  pageSize = 10,
  enableCardView = false
}: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(enableCardView ? 'table' : 'table')

  const handleSort = (column: Column) => {
    if (!column.sortable) return
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === column.key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key: column.key, direction })
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const filteredData = useMemo(() => {
    let temp = [...data]
    if (searchTerm) {
      temp = temp.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        temp = temp.filter((row) => String(row[key]) === value)
      }
    })
    if (sortConfig) {
      temp.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return temp
  }, [data, searchTerm, filters, sortConfig])

  const pageCount = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-200 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => {
                setCurrentPage(1)
                onSearchChange(e.target.value)
              }}
              className="input-field pl-10"
            />
          </div>
          {enableCardView && (
            <div className="flex items-center gap-2">
              <button
                aria-label="Vue tableau"
                className={`btn-secondary p-2 ${viewMode === 'table' ? 'bg-primary-50 text-primary-700' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                aria-label="Vue cartes"
                className={`btn-secondary p-2 ${viewMode === 'cards' ? 'bg-primary-50 text-primary-700' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {columns.some((c) => c.filterOptions) && (
          <div className="flex flex-wrap gap-2">
            {columns.map((column) =>
              column.filterOptions ? (
                <select
                  key={column.key}
                  value={filters[column.key] || ''}
                  onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  className="input-field w-auto"
                >
                  <option value="">{column.label}</option>
                  {column.filterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : null
            )}
          </div>
        )}
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none"
                    onClick={() => handleSort(column)}
                  >
                    <span className="inline-flex items-center">
                      {column.label}
                      {sortConfig?.key === column.key && (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3" />
                        )
                      )}
                    </span>
                  </th>
                ))}
                {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedData.map((row, index) => (
            <div key={index} className="border rounded-lg p-4 shadow-sm">
              {columns.map((column) => (
                <div key={column.key} className="mb-2">
                  <div className="text-xs font-medium text-gray-500">{column.label}</div>
                  <div className="text-sm">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </div>
                </div>
              ))}
              {actions && <div className="mt-2 text-right">{actions(row)}</div>}
            </div>
          ))}
        </div>
      )}

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
        </div>
      )}

      {filteredData.length > pageSize && (
        <div className="flex justify-center py-4">
          <nav className="pagination">
            <button
              className="pagination-item"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`pagination-item ${currentPage === i + 1 ? 'active' : ''}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="pagination-item"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
            >
              Suivant
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}