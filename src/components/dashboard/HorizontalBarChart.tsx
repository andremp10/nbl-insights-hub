 import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
 import { motion } from 'framer-motion';
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
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.3, delay: 0.15 }}
     >
       <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
         <CardHeader className="pb-2">
           <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <div className="h-72 space-y-2">
             {[...Array(6)].map((_, i) => (
               <Skeleton key={i} className="h-7 w-full" />
             ))}
           </div>
         ) : displayData.length === 0 ? (
           <div className="h-72 flex items-center justify-center">
             <p className="text-muted-foreground/60 text-sm">Sem dados no período</p>
           </div>
         ) : (
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart
                 data={displayData}
                 layout="vertical"
                 margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
               >
                 <XAxis 
                   type="number" 
                   tickFormatter={formatCompact}
                   tick={{ fontSize: 10, fill: 'hsl(220, 9%, 55%)' }}
                   axisLine={{ stroke: 'hsl(230, 15%, 18%)' }}
                   tickLine={false}
                 />
                 <YAxis
                   type="category"
                   dataKey="name"
                   width={90}
                   tick={{ fontSize: 10, fill: 'hsl(220, 9%, 55%)' }}
                   axisLine={false}
                   tickLine={false}
                   tickFormatter={(value) => 
                     value.length > 12 ? `${value.substring(0, 12)}...` : value
                   }
                 />
                 <Tooltip
                   content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       const item = payload[0];
                       const pct = total > 0 ? ((item.value as number) / total) * 100 : 0;
                       return (
                         <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-xl">
                           <p className="text-sm font-medium text-foreground">{item.payload.name}</p>
                           <p className="text-xs text-muted-foreground mt-1">
                             {formatCurrency(item.value as number)} ({pct.toFixed(1)}%)
                           </p>
                         </div>
                       );
                     }
                     return null;
                   }}
                   cursor={{ fill: 'hsl(230, 15%, 15%)' }}
                 />
                 <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                   {displayData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - index * 0.06} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         )}
       </CardContent>
     </Card>
     </motion.div>
   );
 }