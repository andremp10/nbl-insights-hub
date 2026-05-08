import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface DonutChartProps {
  title: string;
  data: { name: string; value: number; percentual?: number }[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(0, 84%, 60%)',
  'hsl(173, 80%, 40%)',
  'hsl(326, 80%, 60%)',
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
  const isMobile = useIsMobile();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const innerR = isMobile ? 38 : 50;
  const outerR = isMobile ? 62 : 80;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <PieChartIcon className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-muted-foreground/60 text-sm text-center">
              Nenhum lançamento no período.<br />
              <span className="text-xs">Ajuste o filtro de datas.</span>
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ outline: 'none', transition: 'opacity 0.3s' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const pct = total > 0 ? ((item.value as number) / total) * 100 : 0;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
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
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: '10px',
                    width: '100%',
                    bottom: 0,
                    paddingTop: '20px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
