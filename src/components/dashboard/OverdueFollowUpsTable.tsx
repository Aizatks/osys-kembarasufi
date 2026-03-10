"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, User } from "lucide-react";

interface OverdueFollowUp {
  id: string;
  nama_pakej: string;
  no_phone: string;
  date_follow_up: string;
  follow_up_status: string;
  staff_name?: string;
  staff_overdue_count?: number;
}

interface OverdueFollowUpsTableProps {
  data: OverdueFollowUp[];
}

export function OverdueFollowUpsTable({ data }: OverdueFollowUpsTableProps) {
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (date: string) => {
    const followUpDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Group data by staff untuk papar header ranking
  const staffGroups: Record<string, { staffName: string; count: number; items: OverdueFollowUp[] }> = {};
  data.forEach(item => {
    const key = item.staff_name || 'Tiada Staff';
    if (!staffGroups[key]) {
      staffGroups[key] = { staffName: key, count: item.staff_overdue_count || 0, items: [] };
    }
    staffGroups[key].items.push(item);
  });

  const sortedGroups = Object.values(staffGroups).sort((a, b) => b.count - a.count);

  return (
    <Card className="py-4 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Follow-up Tertunggak
          </CardTitle>
          <Badge variant="destructive" className="text-xs">{data.length} rekod</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-4">
            {/* Ranking summary by staff */}
            <div className="flex flex-wrap gap-2 pb-2 border-b">
              {sortedGroups.map((group, idx) => (
                <div key={group.staffName} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                  <span className="text-xs font-bold text-amber-700">
                    {idx === 0 ? '🔴' : idx === 1 ? '🟠' : '🟡'}
                  </span>
                  <span className="text-xs font-medium text-amber-800">{group.staffName}</span>
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">{group.count}</Badge>
                </div>
              ))}
            </div>

            {/* Table grouped by staff */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Pakej</TableHead>
                  <TableHead>No. Telefon</TableHead>
                  <TableHead>Tarikh FU</TableHead>
                  <TableHead>Tertunggak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroups.flatMap(group =>
                  group.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {idx === 0 ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700 truncate max-w-[80px]">
                              {group.staffName}
                            </span>
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">{group.count}</Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 pl-4">↳</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[130px] truncate text-sm">{item.nama_pakej || '-'}</TableCell>
                      <TableCell>
                        <a
                          href={`https://wa.me/6${item.no_phone?.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:underline text-sm"
                        >
                          <Phone className="h-3 w-3" />
                          {item.no_phone || '-'}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(item.date_follow_up)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {getDaysOverdue(item.date_follow_up)} hari
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-emerald-600 text-sm">Tiada follow-up tertunggak 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
