import { memo, useState, useEffect, useRef } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStepsProps {
  steps: string[];
  isComplete: boolean;
  startedAt?: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m${secs > 0 ? ` ${secs}s` : ''}`;
}

export const AgentSteps = memo(function AgentSteps({ steps, isComplete, startedAt }: AgentStepsProps) {
  const [now, setNow] = useState(Date.now());
  const stepTimestamps = useRef<number[]>([]);

  useEffect(() => {
    if (steps.length > stepTimestamps.current.length) {
      const currentTime = Date.now();
      while (stepTimestamps.current.length < steps.length) {
        stepTimestamps.current.push(currentTime);
      }
    }
  }, [steps.length]);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isComplete]);

  if (!steps.length) return null;

  const totalElapsed = startedAt ? now - startedAt : 0;

  return (
    <div className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2.5 space-y-0.5">
      {steps.map((step, i) => {
        const isDone = isComplete || i < steps.length - 1;
        const isCurrent = !isComplete && i === steps.length - 1;
        const stepStart = stepTimestamps.current[i] || now;
        const stepEnd = i < steps.length - 1
          ? stepTimestamps.current[i + 1] || now
          : now;
        const elapsed = isDone && !isComplete
          ? stepEnd - stepStart
          : isCurrent
            ? now - stepStart
            : isComplete
              ? (stepTimestamps.current[i + 1] || (startedAt ? startedAt + totalElapsed : now)) - stepStart
              : 0;

        return (
          <div
            key={`${step}-${i}`}
            className={cn(
              'flex items-center gap-2.5 py-1 text-xs transition-all duration-300',
              i === 0 && 'animate-in fade-in slide-in-from-left-2',
              isDone && 'text-muted-foreground/40',
              isCurrent && 'text-foreground'
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {isDone ? (
              <div className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-success" />
              </div>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              </div>
            )}
            <span className="flex-1 truncate">{step}</span>
            {elapsed > 0 && (
              <span className={cn(
                'text-[10px] tabular-nums font-mono shrink-0',
                isDone ? 'text-muted-foreground/25' : 'text-muted-foreground/50'
              )}>
                {formatDuration(elapsed)}
              </span>
            )}
          </div>
        );
      })}

      {showLongWait && (
        <div className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground/35 animate-in fade-in duration-500">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Isso pode levar alguns instantes...</span>
        </div>
      )}

      {isComplete && startedAt && totalElapsed > 2000 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/20 mt-1 text-[10px] text-muted-foreground/35">
          <Check className="w-3 h-3 shrink-0" />
          <span>Concluído em {formatDuration(totalElapsed)}</span>
        </div>
      )}
    </div>
  );
});
