import { fetchSheetData } from "@/lib/sheets";
import { QuotationCalculatorV2 } from "@/components/QuotationCalculatorV2";
import { MainLayout } from "@/components/MainLayout";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/components/AuthGate";

export default async function Home() {
  const data = await fetchSheetData();

  return (
    <AuthGate>
      <Suspense fallback={<QuotationSkeleton />}>
        <MainLayout>
          <QuotationCalculatorV2 data={data} />
        </MainLayout>
      </Suspense>
    </AuthGate>
  );
}

function QuotationSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-slate-800" />
      <div className="flex-1 p-8">
        <div className="grid gap-6 md:grid-cols-12 max-w-6xl mx-auto">
          <div className="md:col-span-7 space-y-6">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
          <div className="md:col-span-5 space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
