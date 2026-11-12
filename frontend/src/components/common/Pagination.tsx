import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage?: number
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
  itemName?: string
  labels?: {
    showing?: string
    to?: string
    of?: string
    perPage?: string
    previous?: string
    next?: string
    firstPage?: string
    lastPage?: string
  }
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  perPage = 10,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  itemName = 'items',
  labels = {},
  className = '',
}: PaginationProps) {
  // If there are no items at all, don't show pagination
  if (totalItems <= 0) return null

  const startItem = Math.min((currentPage - 1) * perPage + 1, totalItems)
  const endItem = Math.min(currentPage * perPage, totalItems)

  // Generate page numbers to show with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) {
        pages.push('...')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      pages.push(totalPages)
    }

    return pages
  }

  const pages = getPageNumbers()
  const {
    showing = 'Showing',
    to = 'to',
    of = 'of',
    perPage: perPageLabel = 'Per page',
    previous = 'Prev',
    next = 'Next',
    firstPage = 'First Page',
    lastPage = 'Last Page',
  } = labels

  return (
    <div
      className={`px-4 py-3.5 border-t bg-card/60 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Left: Summary and per-page selector */}
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium">
          {showing} <strong className="text-foreground font-bold">{startItem}</strong> {to}{' '}
          <strong className="text-foreground font-bold">{endItem}</strong> {of}{' '}
          <strong className="text-foreground font-bold">{totalItems}</strong> {itemName}
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-[11px]">{perPageLabel}:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="h-7 px-2 py-0 text-xs rounded-lg border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="h-8 w-8 p-0 hidden md:inline-flex rounded-lg"
          title={firstPage}
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{previous}</span>
        </Button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground select-none">
                  •••
                </span>
              )
            }

            const pageNum = p as number
            const isActive = pageNum === currentPage

            return (
              <Button
                key={`page-${pageNum}`}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
        >
          <span className="hidden sm:inline">{next}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-8 w-8 p-0 hidden md:inline-flex rounded-lg"
          title={lastPage}
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
