import React from 'react'
import Skeleton from '../ui/skeleton'

interface SkeletonTableProps {
  columns?: number
  rows?: number
}

export default function SkeletonTable({ columns = 5, rows = 5 }: SkeletonTableProps) {
  return (
    <div className="border rounded-md divide-y divide-gray-200">
      <div
        className="grid gap-4 p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div
          key={r}
          className="grid gap-4 p-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {[...Array(columns)].map((_, c) => (
            <Skeleton key={c} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}
