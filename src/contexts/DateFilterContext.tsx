import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { startOfMonth, endOfMonth, subDays, format, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';

export type DatePreset = 'current_month' | 'last_30_days' | 'year_2023' | 'all_time' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterContextType {
  dateRange: DateRange;
  preset: DatePreset;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DatePreset) => void;
  formattedRange: string;
  hasNoDataInPeriod: boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

// Anos com dados conhecidos no banco
const DATA_YEAR_START = 2019;
const DATA_YEAR_END = 2023;

function getPresetDates(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'current_month':
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case 'last_30_days':
      return {
        from: startOfDay(subDays(now, 30)),
        to: endOfDay(now),
      };
    case 'year_2023':
      return {
        from: new Date(2023, 0, 1), // 1 Jan 2023
        to: new Date(2023, 11, 31, 23, 59, 59), // 31 Dec 2023
      };
    case 'all_time':
      return {
        from: new Date(DATA_YEAR_START, 0, 1),
        to: endOfDay(now),
      };
    default:
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
  }
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
  // Padrão: Últimos 30 dias
  const [preset, setPresetState] = useState<DatePreset>('last_30_days');
  const [dateRange, setDateRangeState] = useState<DateRange>(getPresetDates('last_30_days'));

  const setPreset = (newPreset: DatePreset) => {
    setPresetState(newPreset);
    if (newPreset !== 'custom') {
      setDateRangeState(getPresetDates(newPreset));
    }
  };

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
    setPresetState('custom');
  };

  const formattedRange = `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;

  // Verifica se o período selecionado está fora do range de dados conhecidos
  const hasNoDataInPeriod = useMemo(() => {
    const fromYear = dateRange.from.getFullYear();
    const toYear = dateRange.to.getFullYear();
    // Se o período está completamente fora do range de dados
    return fromYear > DATA_YEAR_END || toYear < DATA_YEAR_START;
  }, [dateRange]);

  return (
    <DateFilterContext.Provider value={{ dateRange, preset, setDateRange, setPreset, formattedRange, hasNoDataInPeriod }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}