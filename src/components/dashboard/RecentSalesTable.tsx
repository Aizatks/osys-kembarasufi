"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

interface RecentSale {
  id: string;
  nama_pakej: string;
  total: string;
  date_closed: string;
  status_bayaran: string;
  nama_wakil_peserta: string;
}

interface RecentSalesTableProps {
  data: RecentSale[];
}

const STATUS_COLORS: Record<string, string> = {
  'Full Payment': 'bg-emerald-100 text-emerald-700',
  'Deposit': 'bg-blue-100 text-blue-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

export function RecentSalesTable({ data }: RecentSalesTableProps) {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-500" />
          Jualan Terkini
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pakej</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tarikh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">{sale.nama_pakej || '-'}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{sale.nama_wakil_peserta || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(sale.date_closed)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[sale.status_bayaran] || 'bg-gray-100 text-gray-700'}>
                      {sale.status_bayaran || 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(sale.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Tiada jualan terkini</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
