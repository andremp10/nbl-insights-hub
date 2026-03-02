import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDateFilter, DatePreset } from '@/contexts/DateFilterContext';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const presets: { key: DatePreset; label: string }[] = [
  { key: 'last_7_days', label: '7d' },
  { key: 'last_30_days', label: '30d' },
  { key: 'this_month', label: 'Mês' },
  { key: 'this_year', label: 'Ano' },
  { key: 'all_time', label: 'Tudo' },
];

export function DateFilterBar() {
  const { dateRange, preset, setPreset, setDateRange } = useDateFilter();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {presets.map((p) => (
        <Button
          key={p.key}
          variant="ghost"
          size="sm"
          onClick={() => setPreset(p.key)}
          className={cn(
            'h-7 px-2.5 text-xs font-medium rounded-lg transition-colors',
            preset === p.key
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          {p.label}
        </Button>
      ))}

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-lg gap-1.5',
              preset === 'custom'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="h-3 w-3" />
            {preset === 'custom'
              ? `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`
              : 'Datas'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
                setIsCalendarOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
