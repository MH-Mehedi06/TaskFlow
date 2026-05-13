export function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonAvatar({ size = 'w-8 h-8' }: { size?: string }) {
  return <div className={`${size} rounded-full bg-gray-200 animate-pulse flex-shrink-0`} />;
}

export function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </tbody>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
      <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="space-y-1.5 flex-1">
          <SkeletonLine w="w-1/3" h="h-4" />
          <SkeletonLine w="w-1/2" h="h-3" />
        </div>
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} w={i % 2 === 0 ? 'w-full' : 'w-3/4'} h="h-3" />
      ))}
    </div>
  );
}
