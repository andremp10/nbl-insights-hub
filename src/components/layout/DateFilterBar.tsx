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
     <div className="flex items-center gap-1.5">
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button 
             variant="ghost" 
             size="sm" 
             className="gap-2 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border-0 rounded-lg"
           >
             <Calendar className="h-3.5 w-3.5" />
             <span className="hidden sm:inline">{presetLabels[preset]}</span>
             <ChevronDown className="h-3 w-3 opacity-60" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="glass-card min-w-[160px]">
           <DropdownMenuItem 
             onClick={() => handlePresetSelect('current_month')}
             className={cn("text-sm cursor-pointer", preset === 'current_month' && "text-primary")}
           >
             Mês Atual
           </DropdownMenuItem>
           <DropdownMenuItem 
             onClick={() => handlePresetSelect('last_30_days')}
             className={cn("text-sm cursor-pointer", preset === 'last_30_days' && "text-primary")}
           >
             Últimos 30 dias
           </DropdownMenuItem>
           <DropdownMenuItem 
             onClick={() => handlePresetSelect('custom')}
             className={cn("text-sm cursor-pointer", preset === 'custom' && "text-primary")}
           >
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
         <PopoverContent className="w-auto p-0 glass-card" align="end">
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
             className="p-3 pointer-events-auto"
           />
         </PopoverContent>
       </Popover>
     </div>
   );
 }