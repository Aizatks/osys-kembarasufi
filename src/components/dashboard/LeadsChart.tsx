"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface LeadsChartProps {
  leadsBySource: { source: string; count: number }[];
}

const SOURCE_COLORS: Record<string, string> = {
  'ADS': '#3b82f6',
  'PS': '#8b5cf6',
  'REFERRAL': '#10b981',
  'WEBSITE': '#f59e0b',
  'WHATSAPP': '#22c55e',
  'WALK-IN': '#ec4899',
  'HAIKAL': '#06b6d4',
  'LAIN-LAIN': '#6b7280',
};

export function LeadsChart({ leadsBySource }: LeadsChartProps) {
  const chartConfig = Object.fromEntries(
    leadsBySource.map((item) => [
      item.source,
      { label: item.source, color: SOURCE_COLORS[item.source] || '#6b7280' }
    ])
  );

  const dataWithColors = leadsBySource.map(item => ({
    ...item,
    fill: SOURCE_COLORS[item.source] || '#6b7280'
  }));

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Lead Mengikut Sumber</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {leadsBySource.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={dataWithColors} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="source" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  name="Jumlah Lead"
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Tiada data</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {leadsBySource.map((item) => (
            <div key={item.source} className="flex items-center gap-1.5 text-xs">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: SOURCE_COLORS[item.source] || '#6b7280' }}
              />
              <span>{item.source}: {item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
