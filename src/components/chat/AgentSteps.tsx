import { memo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStepsProps {
  steps: string[];
  isComplete: boolean;
}

export const AgentSteps = memo(function AgentSteps({ steps, isComplete }: AgentStepsProps) {
  if (!steps.length) return null;

  return (
    <div className="space-y-1.5 py-1">
      {steps.map((step, i) => {
        const isDone = isComplete || i < steps.length - 1;
        const isCurrent = !isComplete && i === steps.length - 1;

        return (
          <div
            key={`${step}-${i}`}
            className={cn(
              'flex items-center gap-2.5 text-xs transition-all duration-300',
              isDone && 'text-muted-foreground/60',
              isCurrent && 'text-foreground'
            )}
          >
            {isDone ? (
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
            )}
            <span className={cn(isDone && 'line-through decoration-muted-foreground/30')}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
});
