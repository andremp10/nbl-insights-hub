import { Skeleton } from '@/components/ui/skeleton';

export function HomeSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto auth-grid-bg">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Hero */}
        <div className="pt-10 pb-6 md:pt-16 md:pb-8 space-y-4">
          <Skeleton className="h-8 w-96 max-w-full animate-fade-slide-up" style={{ animationDelay: '0ms' }} />
          <Skeleton className="h-4 w-80 max-w-full animate-fade-slide-up" style={{ animationDelay: '60ms' }} />
          <div className="flex flex-wrap gap-3 pt-2">
            <Skeleton className="h-10 w-40 animate-fade-slide-up" style={{ animationDelay: '120ms' }} />
            <Skeleton className="h-10 w-32 animate-fade-slide-up" style={{ animationDelay: '140ms' }} />
            <Skeleton className="h-10 w-36 animate-fade-slide-up" style={{ animationDelay: '160ms' }} />
          </div>
        </div>

        {/* Nav Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Skeleton className="h-28 w-full animate-fade-slide-up" style={{ animationDelay: '220ms' }} />
          <Skeleton className="h-28 w-full animate-fade-slide-up" style={{ animationDelay: '240ms' }} />
          <Skeleton className="h-28 w-full animate-fade-slide-up" style={{ animationDelay: '260ms' }} />
        </div>

        {/* KPIs */}
        <div className="space-y-2.5 mb-8">
          <Skeleton className="h-3 w-32 animate-fade-slide-up" style={{ animationDelay: '320ms' }} />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full animate-fade-slide-up" style={{ animationDelay: '380ms' }} />
            <Skeleton className="h-20 w-full animate-fade-slide-up" style={{ animationDelay: '400ms' }} />
            <Skeleton className="h-20 w-full animate-fade-slide-up" style={{ animationDelay: '420ms' }} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pb-12">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-28 animate-fade-slide-up" style={{ animationDelay: '480ms' }} />
            <div className="space-y-2.5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full animate-fade-slide-up" style={{ animationDelay: `${540 + i * 40}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
