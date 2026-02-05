 import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface HorizontalBarChartProps {
   title: string;
   data: { name: string; value: number }[];
   isLoading?: boolean;
   maxItems?: number;
   color?: string;
 }
 
 function formatCurrency(value: number): string {
   return new Intl.NumberFormat('pt-BR', {
     style: 'currency',
     currency: 'BRL',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0,
   }).format(value);
 }
 
 function formatCompact(value: number): string {
   if (value >= 1000000) {
     return `${(value / 1000000).toFixed(1)}M`;
   }
   if (value >= 1000) {
     return `${(value / 1000).toFixed(0)}K`;
   }
   return value.toString();
 }
 
 export function HorizontalBarChart({ 
   title, 
   data, 
   isLoading, 
   maxItems = 10,
   color = 'hsl(217, 91%, 60%)'
 }: HorizontalBarChartProps) {
   const displayData = data.slice(0, maxItems);
   const total = data.reduce((sum, item) => sum + item.value, 0);
 
   return (
     <Card className="border-border bg-card">
       <CardHeader>
         <CardTitle className="text-base">{title}</CardTitle>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <div className="h-64 space-y-3">
             {[...Array(5)].map((_, i) => (
               <Skeleton key={i} className="h-8 w-full" />
             ))}
           </div>
         ) : displayData.length === 0 ? (
           <div className="h-64 flex items-center justify-center">
             <p className="text-muted-foreground text-sm">Sem dados no período</p>
           </div>
         ) : (
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart
                 data={displayData}
                 layout="vertical"
                 margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
               >
                 <XAxis 
                   type="number" 
                   tickFormatter={formatCompact}
                   tick={{ fontSize: 11, fill: 'hsl(215, 20%, 65%)' }}
                   axisLine={{ stroke: 'hsl(222, 20%, 23%)' }}
                 />
                 <YAxis
                   type="category"
                   dataKey="name"
                   width={100}
                   tick={{ fontSize: 11, fill: 'hsl(215, 20%, 65%)' }}
                   axisLine={{ stroke: 'hsl(222, 20%, 23%)' }}
                   tickFormatter={(value) => 
                     value.length > 15 ? `${value.substring(0, 15)}...` : value
                   }
                 />
                 <Tooltip
                   content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       const item = payload[0];
                       const pct = total > 0 ? ((item.value as number) / total) * 100 : 0;
                       return (
                         <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                           <p className="text-sm font-medium text-foreground">{item.payload.name}</p>
                           <p className="text-sm text-muted-foreground">
                             {formatCurrency(item.value as number)} ({pct.toFixed(1)}%)
                           </p>
                         </div>
                       );
                     }
                     return null;
                   }}
                 />
                 <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                   {displayData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - index * 0.08} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }