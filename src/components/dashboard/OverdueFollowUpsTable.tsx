"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone } from "lucide-react";

interface OverdueFollowUp {
  id: string;
  nama_pakej: string;
  no_phone: string;
  date_follow_up: string;
  follow_up_status: string;
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
    const diff = Math.floor((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="py-4 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          Follow-up Tertunggak
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pakej</TableHead>
                <TableHead>No. Telefon</TableHead>
                <TableHead>Tarikh Follow-up</TableHead>
                <TableHead>Tertunggak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">{item.nama_pakej || '-'}</TableCell>
                  <TableCell>
                    <a 
                      href={`https://wa.me/6${item.no_phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 hover:underline"
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
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-emerald-600 text-sm">Tiada follow-up tertunggak 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
