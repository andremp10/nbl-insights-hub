import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface HorizontalBarChartProps {
  title: string;
  data: { name: string; value: number }[];
  isLoading?: boolean;
  maxItems?: number;
  color?: string;
  onBarClick?: (name: string) => void;
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
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export function HorizontalBarChart({
  title,
  data,
  isLoading,
  maxItems = 10,
  color = 'hsl(217, 91%, 60%)',
  onBarClick,
}: HorizontalBarChartProps) {
  const isMobile = useIsMobile();
  const displayData = data.slice(0, maxItems);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const yAxisWidth = isMobile ? 90 : 150;
  const truncLen = isMobile ? 14 : 25;

  const handleBarClick = (data: any) => {
    if (onBarClick && data?.name) {
      onBarClick(data.name);
    }
  };

  return (
    <Card className="border-border bg-card">
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
          <div className="h-72 flex flex-col items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-muted-foreground/60 text-sm text-center">
              Nenhum lançamento no período.<br />
              <span className="text-xs">Ajuste o filtro de datas.</span>
            </p>
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
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    value.length > truncLen ? `${value.substring(0, truncLen)}...` : value
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const pct = total > 0 ? ((item.value as number) / total) * 100 : 0;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
                          <p className="text-sm font-medium text-foreground">{item.payload.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(item.value as number)} ({pct.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  isAnimationActive={true}
                  animationBegin={200}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  onClick={handleBarClick}
                  style={onBarClick ? { cursor: 'pointer' } : undefined}
                >
                  {displayData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={color}
                      fillOpacity={1 - index * 0.06}
                    />
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
