import { memo, useState, useEffect, useRef } from 'react';
import { Check, Timer } from 'lucide-react';
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

function formatTotal(ms: number): string {
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

export const AgentSteps = memo(function AgentSteps({ steps, isComplete, startedAt }: AgentStepsProps) {
  const [now, setNow] = useState(Date.now());
  const stepTimestamps = useRef<number[]>([]);

  useEffect(() => {
    if (steps.length > stepTimestamps.current.length) {
      const t = Date.now();
      while (stepTimestamps.current.length < steps.length) {
        stepTimestamps.current.push(t);
      }
    }
  }, [steps.length]);

  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [isComplete]);

  if (!steps.length) return null;

  const totalElapsed = startedAt ? now - startedAt : 0;

  return (
    <div className="agent-thinking-card" aria-live="polite">
      {/* Header: status + total timer */}
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {!isComplete && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            )}
            <span className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              isComplete ? 'bg-success' : 'bg-primary'
            )} />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {isComplete ? 'Concluído' : 'Agente em ação'}
          </span>
        </div>
        {startedAt && (
          <div className="flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground/60">
            <Timer className="w-3 h-3" />
            {formatTotal(totalElapsed)}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="agent-timeline relative pl-1">
        <div className="agent-timeline-line" aria-hidden />
        <ul className="space-y-2">
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
                  ? (stepTimestamps.current[i + 1] || now) - stepStart
                  : 0;

            return (
              <li
                key={`${step}-${i}`}
                className="relative flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Bullet */}
                <div className="relative z-10 shrink-0">
                  {isDone ? (
                    <div className="w-[15px] h-[15px] rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="agent-step-ring w-[15px] h-[15px] rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'flex-1 text-xs leading-tight truncate',
                  isDone && 'text-muted-foreground/55',
                  isCurrent && 'agent-step-active-text font-medium'
                )}>
                  {step}
                </span>

                {/* Duration */}
                {elapsed > 0 && (
                  <span className={cn(
                    'text-[10px] font-mono tabular-nums shrink-0',
                    isDone ? 'text-muted-foreground/35' : 'text-primary/70'
                  )}>
                    {formatDuration(elapsed)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
