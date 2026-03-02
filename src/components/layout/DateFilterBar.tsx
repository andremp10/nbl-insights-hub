import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format, parse, isValid, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDateFilter, DatePreset } from '@/contexts/DateFilterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function formatInputDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

function parseInputDate(value: string): Date | null {
  // Try dd/MM/yyyy
  const parsed = parse(value, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  // Try yyyy-MM-dd
  const parsed2 = parse(value, 'yyyy-MM-dd', new Date());
  if (isValid(parsed2)) return parsed2;
  return null;
}

export function DateFilterBar() {
  const { dateRange, preset, setPreset, setDateRange } = useDateFilter();
  const [isOpen, setIsOpen] = useState(false);
  const [fromInput, setFromInput] = useState(formatInputDate(dateRange.from));
  const [toInput, setToInput] = useState(formatInputDate(dateRange.to));
  const [fromMonth, setFromMonth] = useState(dateRange.from.getMonth());
  const [fromYear, setFromYear] = useState(dateRange.from.getFullYear());
  const [toMonth, setToMonth] = useState(dateRange.to.getMonth());
  const [toYear, setToYear] = useState(dateRange.to.getFullYear());

  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setFromInput(formatInputDate(dateRange.from));
      setToInput(formatInputDate(dateRange.to));
      setFromMonth(dateRange.from.getMonth());
      setFromYear(dateRange.from.getFullYear());
      setToMonth(dateRange.to.getMonth());
      setToYear(dateRange.to.getFullYear());
    }
    setIsOpen(open);
  };

  const handleApply = () => {
    const from = parseInputDate(fromInput);
    const to = parseInputDate(toInput);
    if (from && to && from <= to) {
      setDateRange({ from: startOfDay(from), to: endOfDay(to) });
      setIsOpen(false);
    }
  };

  const handleMonthYearChange = (which: 'from' | 'to', month: number, year: number) => {
    if (which === 'from') {
      setFromMonth(month);
      setFromYear(year);
      const newDate = new Date(year, month, 1);
      setFromInput(formatInputDate(newDate));
    } else {
      setToMonth(month);
      setToYear(year);
      // Last day of month
      const lastDay = new Date(year, month + 1, 0);
      setToInput(formatInputDate(lastDay));
    }
  };

  const yearOptions = [];
  for (let y = 2019; y <= new Date().getFullYear(); y++) {
    yearOptions.push(y);
  }

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

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
              ? `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
              : 'Datas'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 pointer-events-auto" align="end">
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período personalizado</p>

            {/* From */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="h-8 text-xs font-mono"
              />
              <div className="flex gap-2">
                <select
                  value={fromMonth}
                  onChange={(e) => handleMonthYearChange('from', Number(e.target.value), fromYear)}
                  className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select
                  value={fromYear}
                  onChange={(e) => handleMonthYearChange('from', fromMonth, Number(e.target.value))}
                  className="w-20 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="h-8 text-xs font-mono"
              />
              <div className="flex gap-2">
                <select
                  value={toMonth}
                  onChange={(e) => handleMonthYearChange('to', Number(e.target.value), toYear)}
                  className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select
                  value={toYear}
                  onChange={(e) => handleMonthYearChange('to', toMonth, Number(e.target.value))}
                  className="w-20 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <Button onClick={handleApply} size="sm" className="w-full h-8 text-xs">
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
