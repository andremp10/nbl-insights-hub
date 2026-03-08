import { Skeleton } from '@/components/ui/skeleton';

export function PedidosSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '0ms' }} />
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '60ms' }} />
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '120ms' }} />
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '180ms' }} />
        </div>
        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36 animate-fade-slide-up" style={{ animationDelay: '240ms' }} />
            <Skeleton className="h-64 w-full animate-fade-slide-up" style={{ animationDelay: '300ms' }} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 animate-fade-slide-up" style={{ animationDelay: '260ms' }} />
            <Skeleton className="h-64 w-full animate-fade-slide-up" style={{ animationDelay: '320ms' }} />
          </div>
        </div>
        {/* Table */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 animate-fade-slide-up" style={{ animationDelay: '380ms' }} />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full animate-fade-slide-up" style={{ animationDelay: `${440 + i * 40}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
