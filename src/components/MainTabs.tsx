"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, Users, LayoutDashboard } from "lucide-react";
import { SalesReportTab } from "./SalesReportTab";
import { LeadReportTab } from "./LeadReportTab";
import { DashboardContent } from "./dashboard/DashboardContent";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

export function MainTabs({ children }: Props) {
  const [activeTab, setActiveTab] = useState("quotation");
  const { isSales, isAdmin } = useAuth();
  
  const canSeeSalesReports = isSales || isAdmin;

  const getGridCols = () => {
    if (isAdmin) return 'grid-cols-4';
    if (canSeeSalesReports) return 'grid-cols-3';
    return 'grid-cols-1';
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${getGridCols()} mb-6 bg-white/80 backdrop-blur-sm shadow-md rounded-xl p-1 h-auto`}>
        <TabsTrigger 
          value="quotation" 
          className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
        >
          <Calculator className="w-4 h-4" />
          <span className="hidden sm:inline">Quotation</span>
        </TabsTrigger>
        {canSeeSalesReports && (
          <>
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Sales Report</span>
            </TabsTrigger>
            <TabsTrigger 
              value="leads" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Lead Report</span>
            </TabsTrigger>
          </>
        )}
        {isAdmin && (
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
        )}
      </TabsList>
      
      <TabsContent value="quotation" className="mt-0">
        {children}
      </TabsContent>
      
      {canSeeSalesReports && (
        <>
          <TabsContent value="sales" className="mt-0">
            <SalesReportTab />
          </TabsContent>
          
          <TabsContent value="leads" className="mt-0">
            <LeadReportTab />
          </TabsContent>
        </>
      )}
      
      {isAdmin && (
        <TabsContent value="dashboard" className="mt-0">
          <DashboardContent />
        </TabsContent>
      )}
    </Tabs>
  );
}
