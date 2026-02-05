 import React, { createContext, useContext, useState, ReactNode } from 'react';
 import { startOfMonth, endOfMonth, subDays, format, startOfDay, endOfDay } from 'date-fns';
 
 export type DatePreset = 'current_month' | 'last_30_days' | 'custom';
 
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
     default:
       return {
         from: startOfMonth(now),
         to: endOfMonth(now),
       };
   }
 }
 
 export function DateFilterProvider({ children }: { children: ReactNode }) {
   const [preset, setPresetState] = useState<DatePreset>('current_month');
   const [dateRange, setDateRangeState] = useState<DateRange>(getPresetDates('current_month'));
 
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