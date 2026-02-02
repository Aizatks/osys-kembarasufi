"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Clock, UserCheck, CalendarPlus } from "lucide-react";

interface SummaryData {
  totalSales: number;
  totalLeads: number;
  conversionRate: number;
  outstandingPayment: number;
  totalPax: number;
  newLeadsThisWeek: number;
}

interface DashboardStatsProps {
  data: SummaryData;
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const stats = [
    {
      label: "Jumlah Jualan",
      value: formatCurrency(data.totalSales),
      icon: DollarSign,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
    },
    {
      label: "Jumlah Lead",
      value: data.totalLeads.toString(),
      icon: Users,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
    },
    {
      label: "Kadar Penukaran",
      value: `${data.conversionRate}%`,
      icon: TrendingUp,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgLight: "bg-purple-50",
    },
    {
      label: "Baki Belum Bayar",
      value: formatCurrency(data.outstandingPayment),
      icon: Clock,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      bgLight: "bg-amber-50",
    },
    {
      label: "Pax Bulan Ini",
      value: data.totalPax.toString(),
      icon: UserCheck,
      color: "bg-rose-500",
      textColor: "text-rose-600",
      bgLight: "bg-rose-50",
    },
    {
      label: "Lead Baru (Minggu Ini)",
      value: data.newLeadsThisWeek.toString(),
      icon: CalendarPlus,
      color: "bg-cyan-500",
      textColor: "text-cyan-600",
      bgLight: "bg-cyan-50",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="relative overflow-hidden py-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgLight}`}>
                  <Icon className={`h-5 w-5 ${stat.textColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.textColor} truncate`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
