"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, DollarSign, Users, Percent } from "lucide-react";

interface StaffStats {
  name: string;
  sales: number;
  leads: number;
  amount: number;
  pax: number;
  closingRate: number;
}

interface TopStaffTableProps {
  data: StaffStats[];
}

type SortMode = "amount" | "pax" | "closingRate";

export function TopStaffTable({ data }: TopStaffTableProps) {
  const [sortMode, setSortMode] = useState<SortMode>("amount");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return <span className="text-xl">🥇</span>;
      case 1: return <span className="text-xl">🥈</span>;
      case 2: return <span className="text-xl">🥉</span>;
      default: return <span className="text-sm text-muted-foreground font-medium">{index + 1}</span>;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortMode === "amount") return b.amount - a.amount;
    if (sortMode === "pax") return b.pax - a.pax;
    return b.closingRate - a.closingRate;
  });

  const filterButtons: { mode: SortMode; label: string; icon: React.ReactNode; color: string }[] = [
    { mode: "amount", label: "Jumlah RM", icon: <DollarSign className="h-3 w-3" />, color: "emerald" },
    { mode: "pax", label: "Jumlah Pax", icon: <Users className="h-3 w-3" />, color: "blue" },
    { mode: "closingRate", label: "Closing Rate", icon: <Percent className="h-3 w-3" />, color: "purple" },
  ];

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Leaderboard Staff
          </CardTitle>
          <div className="flex gap-1">
            {filterButtons.map(btn => (
              <Button
                key={btn.mode}
                variant={sortMode === btn.mode ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs flex items-center gap-1 ${
                  sortMode === btn.mode
                    ? btn.color === "emerald"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : btn.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-purple-600 hover:bg-purple-700"
                    : ""
                }`}
                onClick={() => setSortMode(btn.mode)}
              >
                {btn.icon}
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Resit</TableHead>
                <TableHead className="text-center">Lead</TableHead>
                <TableHead className="text-center">Pax</TableHead>
                <TableHead className="text-right">RM</TableHead>
                <TableHead className="text-right">Closing %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((staff, index) => (
                <TableRow key={staff.name} className={index < 3 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                  <TableCell className="text-center">{getMedal(index)}</TableCell>
                  <TableCell className="font-medium">{staff.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {staff.sales}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {staff.leads}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {staff.pax}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600 text-sm">
                    {formatCurrency(staff.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${
                      staff.closingRate >= 30 ? "text-emerald-600" :
                      staff.closingRate >= 15 ? "text-amber-600" :
                      "text-red-500"
                    }`}>
                      {staff.closingRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Tiada data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
