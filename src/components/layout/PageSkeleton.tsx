import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background p-6 gap-4">
      <Skeleton className="h-8 w-48 animate-fade-slide-up" style={{ animationDelay: '0ms' }} />
      <div className="flex gap-4">
        <Skeleton className="h-24 flex-1 animate-fade-slide-up" style={{ animationDelay: '60ms' }} />
        <Skeleton className="h-24 flex-1 animate-fade-slide-up" style={{ animationDelay: '120ms' }} />
        <Skeleton className="h-24 flex-1 animate-fade-slide-up" style={{ animationDelay: '180ms' }} />
      </div>
      <Skeleton className="h-64 w-full animate-fade-slide-up" style={{ animationDelay: '240ms' }} />
      <Skeleton className="h-32 w-full animate-fade-slide-up" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
