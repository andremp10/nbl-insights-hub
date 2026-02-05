 import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface DonutChartProps {
   title: string;
   data: { name: string; value: number; percentual?: number }[];
   isLoading?: boolean;
 }
 
 const COLORS = [
   'hsl(217, 91%, 60%)',  // chart-1 (blue)
   'hsl(142, 71%, 45%)',  // chart-2 (green)
   'hsl(38, 92%, 50%)',   // chart-3 (orange)
   'hsl(280, 65%, 60%)',  // chart-4 (purple)
   'hsl(199, 89%, 48%)',  // chart-5 (cyan)
   'hsl(0, 84%, 60%)',    // chart-6 (red)
   'hsl(173, 80%, 40%)',  // chart-7 (teal)
   'hsl(326, 80%, 60%)',  // chart-8 (pink)
 ];
 
 function formatCurrency(value: number): string {
   return new Intl.NumberFormat('pt-BR', {
     style: 'currency',
     currency: 'BRL',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0,
   }).format(value);
 }
 
 export function DonutChart({ title, data, isLoading }: DonutChartProps) {
   const total = data.reduce((sum, item) => sum + item.value, 0);
 
   return (
     <Card className="border-border bg-card">
       <CardHeader>
         <CardTitle className="text-base">{title}</CardTitle>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <div className="h-64 flex items-center justify-center">
             <Skeleton className="h-48 w-48 rounded-full" />
           </div>
         ) : data.length === 0 ? (
           <div className="h-64 flex items-center justify-center">
             <p className="text-muted-foreground text-sm">Sem dados no período</p>
           </div>
         ) : (
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data}
                   cx="50%"
                   cy="45%"
                   innerRadius={50}
                   outerRadius={80}
                   paddingAngle={2}
                   dataKey="value"
                   nameKey="name"
                 >
                   {data.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip
                   content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       const item = payload[0];
                       const pct = total > 0 ? ((item.value as number) / total) * 100 : 0;
                       return (
                         <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                           <p className="text-sm font-medium text-foreground">{item.name}</p>
                           <p className="text-sm text-muted-foreground">
                             {formatCurrency(item.value as number)} ({pct.toFixed(1)}%)
                           </p>
                         </div>
                       );
                     }
                     return null;
                   }}
                 />
                 <Legend
                   layout="horizontal"
                   verticalAlign="bottom"
                   align="center"
                   wrapperStyle={{ fontSize: '12px' }}
                   formatter={(value) => (
                     <span className="text-muted-foreground text-xs">{value}</span>
                   )}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }