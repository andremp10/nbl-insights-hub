import { Skeleton } from '@/components/ui/skeleton';

export function FinanceiroSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="p-6 md:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '0ms' }} />
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '60ms' }} />
          <Skeleton className="h-24 w-full animate-fade-slide-up" style={{ animationDelay: '120ms' }} />
        </div>
        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 animate-fade-slide-up" style={{ animationDelay: '180ms' }} />
            <Skeleton className="h-64 w-full animate-fade-slide-up" style={{ animationDelay: '240ms' }} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-48 animate-fade-slide-up" style={{ animationDelay: '200ms' }} />
            <Skeleton className="h-64 w-full animate-fade-slide-up" style={{ animationDelay: '260ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
