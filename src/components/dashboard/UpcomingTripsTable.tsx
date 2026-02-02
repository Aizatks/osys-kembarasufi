"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plane } from "lucide-react";

interface UpcomingTrip {
  id: string;
  nama_pakej: string;
  tarikh_trip: string;
  jumlah_pax: string;
  nama_wakil_peserta: string;
}

interface UpcomingTripsTableProps {
  data: UpcomingTrip[];
}

export function UpcomingTripsTable({ data }: UpcomingTripsTableProps) {
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntil = (date: string) => {
    const tripDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="py-4 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-600">
          <Plane className="h-4 w-4" />
          Trip Akan Datang (30 Hari)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pakej</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tarikh Trip</TableHead>
                <TableHead className="text-center">Pax</TableHead>
                <TableHead>Countdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((trip) => {
                const daysUntil = getDaysUntil(trip.tarikh_trip);
                return (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium max-w-[150px] truncate">{trip.nama_pakej || '-'}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{trip.nama_wakil_peserta || '-'}</TableCell>
                    <TableCell className="text-sm">{formatDate(trip.tarikh_trip)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{trip.jumlah_pax || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          daysUntil <= 7 
                            ? 'bg-red-100 text-red-700' 
                            : daysUntil <= 14 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-blue-100 text-blue-700'
                        }
                      >
                        {daysUntil} hari lagi
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Tiada trip dalam 30 hari akan datang</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
