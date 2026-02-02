"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, DollarSign } from "lucide-react";

interface StaffStats {
  name: string;
  sales: number;
  leads: number;
  amount: number;
}

interface TopStaffTableProps {
  data: StaffStats[];
}

export function TopStaffTable({ data }: TopStaffTableProps) {
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
      default: return <span className="text-sm text-muted-foreground">{index + 1}</span>;
    }
  };

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Leaderboard Staff
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Jualan</TableHead>
                <TableHead className="text-center">Lead</TableHead>
                <TableHead className="text-right">Jumlah (RM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((staff, index) => (
                <TableRow key={staff.name}>
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
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {formatCurrency(staff.amount)}
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
