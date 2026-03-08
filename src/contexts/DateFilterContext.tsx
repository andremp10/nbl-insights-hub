import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { startOfMonth, endOfMonth, subDays, format, startOfDay, endOfDay, subMonths, startOfYear, endOfYear } from 'date-fns';

export type DatePreset = 'last_7_days' | 'last_30_days' | 'this_month' | 'this_year' | 'all_time' | 'custom';

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
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

const DATA_YEAR_START = 2019;

function getPresetDates(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'last_7_days':
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    case 'last_30_days':
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfDay(now) };
    case 'all_time':
      return { from: new Date(DATA_YEAR_START, 0, 1), to: endOfDay(now) };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DatePreset>('this_month');
  const [dateRange, setDateRangeState] = useState<DateRange>(getPresetDates('this_month'));

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

  return (
    <DateFilterContext.Provider value={{ dateRange, preset, setDateRange, setPreset, formattedRange }}>
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
