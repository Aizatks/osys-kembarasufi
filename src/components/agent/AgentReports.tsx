"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Users, Calendar } from "lucide-react";

export function AgentReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-500" /> Laporan Ejen
        </h2>
        <p className="text-muted-foreground">Pantau prestasi jualan dan tempahan anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50/30 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Jumlah Jualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">RM 0.00</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/30 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Users className="w-4 h-4" /> Jumlah Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">0</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/30 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Tempahan Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Senarai Tempahan Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-slate-500 italic">
            Tiada tempahan ditemui lagi.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
