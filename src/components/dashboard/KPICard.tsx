 import { ReactNode } from 'react';
 import { motion } from 'framer-motion';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 
 interface KPICardProps {
   title: string;
   value: string | number;
   subtitle?: string;
   icon: ReactNode;
   variant?: 'default' | 'success' | 'destructive' | 'warning' | 'info';
   isLoading?: boolean;
 }
 
 const variantStyles = {
   default: 'text-foreground',
   success: 'text-success',
   destructive: 'text-destructive',
   warning: 'text-warning',
   info: 'text-info',
 };
 
 const iconBgStyles = {
   default: 'bg-primary/10 text-primary',
   success: 'bg-success/10 text-success',
   destructive: 'bg-destructive/10 text-destructive',
   warning: 'bg-warning/10 text-warning',
   info: 'bg-info/10 text-info',
 };
 
 export function KPICard({ title, value, subtitle, icon, variant = 'default', isLoading }: KPICardProps) {
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.3 }}
     >
       <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card transition-colors duration-200">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
           {title}
         </CardTitle>
           <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', iconBgStyles[variant])}>
             <div className="h-4 w-4">{icon}</div>
         </div>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <Skeleton className="h-8 w-24" />
         ) : (
             <div className={cn('text-2xl font-semibold tracking-tight', variantStyles[variant])}>
             {value}
           </div>
         )}
         {subtitle && (
             <p className="text-[11px] text-muted-foreground/70 mt-1.5">
             {subtitle}
           </p>
         )}
       </CardContent>
     </Card>
     </motion.div>
   );
 }