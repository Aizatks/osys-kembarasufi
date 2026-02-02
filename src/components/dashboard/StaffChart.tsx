"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface StaffStats {
  name: string;
  sales: number;
  leads: number;
  amount: number;
}

interface StaffChartProps {
  staffStats: StaffStats[];
}

export function StaffChart({ staffStats }: StaffChartProps) {
  const chartConfig = {
    amount: { label: "Jumlah (RM)", color: "#8b5cf6" },
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `RM${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `RM${(value / 1000).toFixed(0)}K`;
    return `RM${value}`;
  };

  const top5 = staffStats.slice(0, 5);

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Prestasi Staff (Top 5)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {top5.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={top5} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatCurrency}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent 
                      formatter={(value) => [`RM ${Number(value).toLocaleString()}`, 'Jumlah Jualan']}
                    />
                  }
                />
                <Bar
                  dataKey="amount"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  name="Jumlah Jualan"
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Tiada data</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
