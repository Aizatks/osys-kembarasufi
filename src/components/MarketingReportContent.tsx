"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart2, Filter } from "lucide-react";
import { MarketingReport } from "./dashboard/MarketingReport";
import { MarketingSpendingForm } from "./dashboard/MarketingSpendingForm";

export function MarketingReportContent() {
  const [preset, setPreset] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Calculate dates for MarketingReport if using presets
  let mDateFrom = dateFrom;
  let mDateTo = dateTo;
  
  if (!showCustomDate) {
    const now = new Date();
    if (preset === 'today') {
      mDateFrom = now.toISOString().split('T')[0];
      mDateTo = now.toISOString().split('T')[0];
    } else if (preset === 'week') {
      const d = new Date(now);
      const weekAgo = new Date(d.setDate(d.getDate() - 7));
      mDateFrom = weekAgo.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      mDateFrom = monthStart.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    } else if (preset === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      mDateFrom = yearStart.toISOString().split('T')[0];
      mDateTo = new Date().toISOString().split('T')[0];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing Report</h1>
        </div>
        <MarketingSpendingForm />
      </div>

      <Card className="py-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Tempoh:</span>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tempoh</Label>
              <Select 
                value={showCustomDate ? 'custom' : preset} 
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setShowCustomDate(true);
                  } else {
                    setShowCustomDate(false);
                    setPreset(v);
                  }
                }}
              >
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCustomDate && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Dari</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Hingga</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <MarketingReport dateFrom={mDateFrom} dateTo={mDateTo} />
      </div>
    </div>
  );
}
