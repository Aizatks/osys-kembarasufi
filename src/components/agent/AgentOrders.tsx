"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AgentOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plus className="w-6 h-6 text-emerald-500" /> Hantar Order Baru
        </h2>
        <p className="text-muted-foreground">Ejen boleh menghantar tempahan pakej di sini</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-emerald-100">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" /> Pilih Pakej
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-4">Mula dengan memilih pakej pelancongan yang diminati pelanggan.</p>
            <Button className="w-full bg-emerald-600">Pilih Pakej</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100">
          <CardHeader className="bg-blue-50/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Semak Tarikh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-4">Pastikan tarikh trip masih mempunyai kekosongan sebelum hantar order.</p>
            <Button variant="outline" className="w-full border-blue-200 text-blue-700">Lihat Kalendar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
