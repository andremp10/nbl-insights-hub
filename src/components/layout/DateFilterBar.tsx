import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const presetLabels: Record<DatePreset, string> = {
  current_month: 'Mês Atual',
  last_30_days: 'Últimos 30 dias',
  year_2023: 'Ano 2023',
  all_time: 'Todo Período',
  custom: 'Personalizado',
};

export function DateFilterBar() {
  const { dateRange, preset, setPreset, setDateRange } = useDateFilter();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetSelect = (newPreset: DatePreset) => {
    if (newPreset === 'custom') {
      setIsCalendarOpen(true);
    } else {
      setPreset(newPreset);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Preset selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border-0 rounded-lg"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{preset === 'custom' ? 'Personalizado' : presetLabels[preset]}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card min-w-[160px]">
          {(Object.keys(presetLabels) as DatePreset[]).filter(p => p !== 'custom').map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={() => handlePresetSelect(p)}
              className={cn("text-sm cursor-pointer", preset === p && "text-primary font-medium")}
            >
              {presetLabels[p]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => handlePresetSelect('custom')}
            className={cn("text-sm cursor-pointer", preset === 'custom' && "text-primary font-medium")}
          >
            Personalizado...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Range Display / Custom Trigger */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCalendarOpen(true)}
            className={cn(
              'h-8 px-2.5 text-xs font-medium rounded-lg transition-colors',
              preset === 'custom'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
            {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl" align="end">
          <CalendarComponent
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from) {
                // Update immediately on selection, but keep popover open until range is complete or user clicks away
                // If both dates selected, could close. user might want to adjust. 
                // Standard behavior: wait for full range.
                setDateRange({ from: range.from, to: range.to || range.from });
                if (range.from && range.to) {
                  // Optionally auto-close or let user click away
                }
              }
            }}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}