"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TrendItem {
  month: string;
  sales: number;
  leads: number;
  pax: number;
  closingRate: number;
}

interface SalesChartProps {
  salesTrend: TrendItem[];
  paymentBreakdown: { status: string; count: number }[];
}

type TrendMode = "sales" | "leads" | "closingRate" | "pax";

const TREND_MODES: { key: TrendMode; label: string; color: string; }[] = [
  { key: "sales", label: "Jualan (RM)", color: "#10b981" },
  { key: "leads", label: "Jumlah Lead", color: "#3b82f6" },
  { key: "closingRate", label: "Kadar Penukaran (%)", color: "#8b5cf6" },
  { key: "pax", label: "Jumlah Pax", color: "#f59e0b" },
];

const PAYMENT_COLORS: Record<string, string> = {
  'Full Payment': '#10b981',
  'Deposit': '#3b82f6',
  'Second Payment': '#6b7280',
  'Pending': '#f59e0b',
  'Cancelled': '#ef4444',
};

export function SalesChart({ salesTrend, paymentBreakdown }: SalesChartProps) {
  const [trendMode, setTrendMode] = useState<TrendMode>("sales");

  const activeMode = TREND_MODES.find(m => m.key === trendMode)!;

  const chartConfig = {
    [trendMode]: {
      label: activeMode.label,
      color: activeMode.color,
    },
  };

  const paymentConfig = Object.fromEntries(
    paymentBreakdown.map((item) => [
      item.status,
      { label: item.status, color: PAYMENT_COLORS[item.status] || '#6b7280' }
    ])
  );

  const formatValue = (value: number) => {
    if (trendMode === "sales") {
      if (value >= 1000000) return `RM${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `RM${(value / 1000).toFixed(0)}K`;
      return `RM${value}`;
    }
    if (trendMode === "closingRate") return `${value}%`;
    return value.toString();
  };

  const formatTooltip = (value: number): [string, string] => {
    if (trendMode === "sales") return [`RM ${Number(value).toLocaleString()}`, "Jualan"];
    if (trendMode === "leads") return [value.toString(), "Lead"];
    if (trendMode === "closingRate") return [`${value}%`, "Closing Rate"];
    return [value.toString(), "Pax"];
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-base font-semibold">Trend Bulanan</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {TREND_MODES.map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setTrendMode(mode.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    trendMode === mode.key
                      ? "text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={trendMode === mode.key ? { backgroundColor: mode.color } : undefined}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={formatValue}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatTooltip(Number(value))}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey={trendMode}
                stroke={activeMode.color}
                strokeWidth={2}
                dot={{ fill: activeMode.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Status Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full flex items-center justify-center">
            {paymentBreakdown.length > 0 ? (
              <ChartContainer config={paymentConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PAYMENT_COLORS[entry.status] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="status" />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Tiada data</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {paymentBreakdown.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: PAYMENT_COLORS[item.status] || '#6b7280' }}
                />
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
