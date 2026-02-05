 import { ReactNode } from 'react';
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
 
 const iconVariantStyles = {
   default: 'text-primary',
   success: 'text-success',
   destructive: 'text-destructive',
   warning: 'text-warning',
   info: 'text-info',
 };
 
 export function KPICard({ title, value, subtitle, icon, variant = 'default', isLoading }: KPICardProps) {
   return (
     <Card className="border-border bg-card">
       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
         <CardTitle className="text-sm font-medium text-muted-foreground">
           {title}
         </CardTitle>
         <div className={cn('h-4 w-4', iconVariantStyles[variant])}>
           {icon}
         </div>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <Skeleton className="h-8 w-24" />
         ) : (
           <div className={cn('text-2xl font-bold', variantStyles[variant])}>
             {value}
           </div>
         )}
         {subtitle && (
           <p className="text-xs text-muted-foreground mt-1">
             {subtitle}
           </p>
         )}
       </CardContent>
     </Card>
   );
 }