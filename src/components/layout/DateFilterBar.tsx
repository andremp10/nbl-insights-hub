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
     <div className="flex items-center gap-2">
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="outline" size="sm" className="gap-2">
             <Calendar className="h-4 w-4" />
             <span className="hidden sm:inline">{presetLabels[preset]}</span>
             <ChevronDown className="h-3 w-3" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           <DropdownMenuItem onClick={() => handlePresetSelect('current_month')}>
             Mês Atual
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => handlePresetSelect('last_30_days')}>
             Últimos 30 dias
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => handlePresetSelect('custom')}>
             Personalizado...
           </DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
 
       <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
         <PopoverTrigger asChild>
           <Button
             variant="ghost"
             size="sm"
             className={cn(
               'text-xs text-muted-foreground',
               preset === 'custom' && 'text-foreground'
             )}
           >
             {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
             {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="end">
           <CalendarComponent
             mode="range"
             selected={{ from: dateRange.from, to: dateRange.to }}
             onSelect={(range) => {
               if (range?.from && range?.to) {
                 setDateRange({ from: range.from, to: range.to });
                 setIsCalendarOpen(false);
               }
             }}
             numberOfMonths={2}
             locale={ptBR}
             className={cn("p-3 pointer-events-auto")}
           />
         </PopoverContent>
       </Popover>
     </div>
   );
 }