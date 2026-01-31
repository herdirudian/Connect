'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface RevenueData {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1); // Avoid division by zero

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
      if (value >= 1000000000) {
          return (value / 1000000000).toFixed(1) + 'M';
      }
      if (value >= 1000000) {
          return (value / 1000000).toFixed(1) + 'jt';
      }
      if (value >= 1000) {
          return (value / 1000).toFixed(0) + 'k';
      }
      return value.toString();
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" />
          Pendapatan Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full flex items-end justify-between gap-2 pt-10">
          {data.map((item, index) => {
            const heightPercentage = (item.revenue / maxRevenue) * 100;
            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10">
                    {formatCurrency(item.revenue)}
                </div>
                
                {/* Bar */}
                <div 
                    className="w-full bg-brand/20 rounded-t-md relative group-hover:bg-brand/40 transition-colors duration-300"
                    style={{ height: `${heightPercentage}%` }}
                >
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-brand rounded-t-md transition-all duration-500 ease-out"
                        style={{ height: '100%' }} // Full fill for now, could be animated
                    />
                </div>
                
                {/* Label */}
                <div className="text-xs text-muted-foreground font-medium text-center truncate w-full">
                  {item.month}
                </div>
                
                {/* Value Label (Mobile/Compact) */}
                <div className="text-[10px] text-muted-foreground md:hidden">
                    {formatCompactCurrency(item.revenue)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
