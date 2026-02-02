"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Loader2,
  Search,
  Eye,
  FileDown,
  Calendar,
  Trash2,
  FileText
} from "lucide-react";
import jsPDF from "jspdf";

interface Quotation {
  _id: string;
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
  travelDate: string;
  pax: { adult: number; cwb: number; cwob: number; infant: number };
  totalAmount: number;
  status: string;
  staffName: string;
  createdAt: string;
  notes?: string;
  breakdown?: {
    baseTotal?: number;
    totalTipping?: number;
    totalSurcharge?: number;
    totalVisa?: number;
    totalInsurance?: number;
    singleRoomTotal?: number;
    discountAmount?: number;
  };
  fullBreakdown?: {
    prices?: {
      adult?: number;
      cwb?: number;
      cwob?: number;
      infant?: number;
      tip?: number;
      surcharge?: number;
      visa?: number;
      insStandard?: number;
      insSenior?: number;
      singleSupplement?: number;
    };
    totals?: {
      baseTotal?: number;
      totalTipping?: number;
      totalSurcharge?: number;
      totalVisa?: number;
      totalInsurance?: number;
      singleRoomTotal?: number;
      discountAmount?: number;
      grandTotal?: number;
    };
    pax?: { adult: number; cwb: number; cwob: number; infant: number };
    insurancePax?: { standard: number; senior: number };
    singleRoomPax?: number;
    visaManual?: { country: string; pricePerPax: number; pax: number }[];
    optionalPlaces?: { name: string; pricePerPax: number; pax: number }[];
    remarks?: string;
    pic?: { name: string; phone: string };
    packageDuration?: string;
  };
}

export function QuotationsContent() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotations();
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/b2c451c0-a884-462d-8ea5-cd5b7c2043ca/LOGO-KS-1769083457684.jpg?width=400&height=400&resize=contain";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      setLogoBase64(canvas.toDataURL("image/jpeg"));
    };
  }, []);

  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      
      const response = await fetch(`/api/quotations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations);
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (quotationId: string, status: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/quotations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationId, status }),
      });
      if (response.ok) {
        fetchQuotations();
        setSelectedQuotation(null);
      }
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const deleteQuotation = async (quotationId: string) => {
    setDeletingId(quotationId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/quotations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationId }),
      });
      if (response.ok) {
        fetchQuotations();
        setSelectedQuotation(null);
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generatePDF = async (q: Quotation) => {
    setGeneratingPdf(q._id);
    
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 20;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const contentWidth = rightMargin - leftMargin;
    
    const fb = q.fullBreakdown;
    const hasFullBreakdown = fb && fb.prices;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }
    };

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 45, "F");

    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, "JPEG", leftMargin, 6, 32, 32);
      } catch (e) {
        console.error("Failed to add logo to PDF", e);
      }
    }

    pdf.setTextColor(30, 58, 95);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("KEMBARA SUFI TRAVEL & TOURS SDN BHD", leftMargin + 38, 16);
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text("KPL 7168 | (1034333-M)", leftMargin + 38, 21);
    pdf.text("28-1A, Tingkat 1, Blok 12, Jalan Pahat J15/J,", leftMargin + 38, 26);
    pdf.text("Seksyen 15, Dataran Otomobil, 40200 Shah Alam, Selangor Darul Ehsan.", leftMargin + 38, 31);
    pdf.text("Tel: 03-6184 2133 | Web: www.kembarasufi.com", leftMargin + 38, 36);

    y = 45;
    pdf.setFillColor(30, 58, 95);
    pdf.rect(0, y, pageWidth, 15, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("SEBUTHARGA", pageWidth / 2, y + 9.5, { align: "center" });

    y = 70;
    pdf.setTextColor(0, 0, 0);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`No. Sebut Harga: ${q.quotationNo}`, leftMargin, y);
    pdf.setFont("helvetica", "normal");
    const createdDate = new Date(q.createdAt).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
    pdf.text(`Tarikh: ${createdDate}`, rightMargin, y, { align: "right" });
    y += 6;
    
    if (q.staffName) {
      pdf.setFont("helvetica", "bold");
      pdf.text(`Disediakan Oleh: ${q.staffName}`, leftMargin, y);
      pdf.setFont("helvetica", "normal");
    }
    y += 10;

    pdf.setFillColor(240, 240, 240);
    pdf.rect(leftMargin, y - 5, contentWidth, 12, "F");
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(q.packageName, leftMargin + 5, y + 3);
    y += 18;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Tarikh Perjalanan: ${q.travelDate || "Akan Dimaklumkan"}`, leftMargin, y);
    y += 7;
    const totalPax = q.pax.adult + q.pax.cwb + q.pax.cwob + q.pax.infant;
    pdf.text(`Jumlah Pax: ${totalPax} Orang`, leftMargin, y);
    y += 12;

    if (hasFullBreakdown) {
      const prices = fb.prices!;
      const pax = fb.pax || q.pax;
      const insurancePax = fb.insurancePax;
      const singleRoomPax = fb.singleRoomPax || 0;
      const totals = fb.totals;
      
      pdf.setFillColor(30, 58, 95);
      pdf.rect(leftMargin, y, contentWidth, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("PECAHAN KOS PAKEJ", leftMargin + 3, y + 5.5);
      pdf.text("HARGA", pageWidth / 2 + 20, y + 5.5, { align: "center" });
      pdf.text("PAX", pageWidth / 2 + 45, y + 5.5, { align: "center" });
      pdf.text("JUMLAH", rightMargin - 5, y + 5.5, { align: "right" });
      y += 12;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      const addRow = (label: string, price: number, paxCount: number, total: number) => {
        checkPageBreak(8);
        pdf.text(label, leftMargin + 3, y);
        pdf.text(`RM ${price.toLocaleString()}`, pageWidth / 2 + 20, y, { align: "center" });
        pdf.text(`${paxCount}`, pageWidth / 2 + 45, y, { align: "center" });
        pdf.text(`RM ${total.toLocaleString()}`, rightMargin - 5, y, { align: "right" });
        y += 6;
      };

      const hasPackagePrices = prices.adult && prices.adult > 0;
      
      if (hasPackagePrices) {
        if (pax.adult > 0 && prices.adult) {
          addRow("Dewasa", prices.adult, pax.adult, prices.adult * pax.adult);
        }
        if (pax.cwb > 0 && prices.cwb) {
          addRow("Kanak-kanak (Dengan Katil)", prices.cwb, pax.cwb, prices.cwb * pax.cwb);
        }
        if (pax.cwob > 0 && prices.cwob) {
          addRow("Kanak-kanak (Tanpa Katil)", prices.cwob, pax.cwob, prices.cwob * pax.cwob);
        }
        if (pax.infant > 0 && prices.infant) {
          addRow("Bayi", prices.infant, pax.infant, prices.infant * pax.infant);
        }
        if (singleRoomPax > 0 && prices.singleSupplement) {
          addRow("Single Room", prices.singleSupplement, singleRoomPax, prices.singleSupplement * singleRoomPax);
        }
      } else if (totals?.baseTotal && totals.baseTotal > 0) {
        const estPrice = Math.round(totals.baseTotal / Math.max(1, pax.adult + pax.cwb + pax.cwob));
        const totalBasePax = pax.adult + pax.cwb + pax.cwob + pax.infant;
        addRow("Harga Pakej", estPrice, totalBasePax, totals.baseTotal);
        
        if (totals.singleRoomTotal && totals.singleRoomTotal > 0) {
          addRow("Single Room", totals.singleRoomTotal, 1, totals.singleRoomTotal);
        }
      }

      y += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, y, rightMargin, y);
      y += 6;

      const basePax = pax.adult + pax.cwb + pax.cwob;
      if (prices.tip && basePax > 0) {
        addRow("Tipping", prices.tip, basePax, prices.tip * basePax);
      }
      if (prices.surcharge && basePax > 0) {
        addRow("Surcaj", prices.surcharge, basePax, prices.surcharge * basePax);
      }
      if (prices.visa && basePax > 0) {
        addRow("Visa", prices.visa, basePax, prices.visa * basePax);
      }

      if (insurancePax) {
        if (insurancePax.standard > 0 && prices.insStandard) {
          addRow("Insurans (Standard)", prices.insStandard, insurancePax.standard, prices.insStandard * insurancePax.standard);
        }
        if (insurancePax.senior > 0 && prices.insSenior) {
          addRow("Insurans (Senior 70+)", prices.insSenior, insurancePax.senior, prices.insSenior * insurancePax.senior);
        }
      }

      if (fb.visaManual && fb.visaManual.length > 0) {
        y += 4;
        pdf.setFont("helvetica", "bold");
        pdf.text("VISA MANUAL:", leftMargin + 3, y);
        y += 6;
        pdf.setFont("helvetica", "normal");
        
        fb.visaManual.forEach((vm) => {
          if (vm.country && vm.pricePerPax > 0 && vm.pax > 0) {
            addRow(`Visa ${vm.country}`, vm.pricePerPax, vm.pax, vm.pricePerPax * vm.pax);
          }
        });
      }

      if (fb.optionalPlaces && fb.optionalPlaces.length > 0) {
        const validOptional = fb.optionalPlaces.filter(op => op.name && op.pricePerPax > 0 && op.pax > 0);
        if (validOptional.length > 0) {
          y += 4;
          pdf.setFont("helvetica", "bold");
          pdf.text("TEMPAT OPTIONAL:", leftMargin + 3, y);
          y += 6;
          pdf.setFont("helvetica", "normal");
          
          validOptional.forEach((op) => {
            addRow(op.name, op.pricePerPax, op.pax, op.pricePerPax * op.pax);
          });
        }
      }

      if (fb.totals?.discountAmount && fb.totals.discountAmount > 0) {
        y += 2;
        pdf.setTextColor(220, 38, 38);
        pdf.text(`Diskaun: -RM ${fb.totals.discountAmount.toLocaleString()}`, rightMargin - 5, y, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        y += 6;
      }

      y += 4;
    }

    checkPageBreak(25);
    pdf.setFillColor(30, 58, 95);
    pdf.rect(leftMargin, y, contentWidth, 12, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("JUMLAH BESAR", leftMargin + 5, y + 8);
    pdf.text(`RM ${q.totalAmount.toLocaleString()}`, rightMargin - 5, y + 8, { align: "right" });
    y += 20;
    pdf.setTextColor(0, 0, 0);

    if (fb?.remarks) {
      checkPageBreak(30);
      pdf.setFillColor(245, 247, 250);
      pdf.rect(leftMargin, y, contentWidth, 20, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("CATATAN:", leftMargin + 5, y + 7);
      pdf.setFont("helvetica", "normal");
      const splitRemarks = pdf.splitTextToSize(fb.remarks, contentWidth - 10);
      pdf.text(splitRemarks, leftMargin + 5, y + 14);
      y += 25;
    }

    checkPageBreak(45);
    pdf.setFillColor(245, 247, 250);
    pdf.rect(leftMargin, y, contentWidth, 35, "F");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.text("MAKLUMAT PEMBAYARAN", leftMargin + 5, y + 7);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nilai Deposit: RM ${(q.fullBreakdown?.totals?.grandTotal ? (q.fullBreakdown.totals.grandTotal > 0 ? 300 : 0) : 0).toLocaleString()} / orang`, leftMargin + 5, y + 15);
    const depositAmount = 300; // Default to 300 if not found, though ideally we use recorded value
    const secondPayment = depositAmount * 2;
    pdf.text(`Bayaran Kedua: RM ${secondPayment.toLocaleString()} / orang`, leftMargin + 5, y + 21);
    pdf.text("Maybank : 562106630695 (Kembara Sufi Travel & Tours Sdn Bhd)", leftMargin + 5, y + 28);
    
    pdf.setFont("helvetica", "italic");
    const bankNote = "Selepas pembayaran dibuat sila sertakan salinan resit pembayaran dan salinan muka depan pasport kepada pihak kami untuk kami keluarkan resit bayaran pakej.";
    const splitNote = pdf.splitTextToSize(bankNote, contentWidth - 10);
    pdf.text(splitNote, leftMargin + 5, y + 22);
    y += 40;

    if (fb?.pic) {
      checkPageBreak(35);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const paragraphs = [
        `Terima kasih kerana membuat tempahan Pakej ${q.packageName} bersama Kembara Sufi.`,
        `Bagi urusan bayaran seterusnya sehingga selesai (full payment), Tuan/Puan boleh berhubung terus dengan PIC yang menguruskan trip iaitu ${fb.pic.name} di ${fb.pic.phone}.`,
        `Sekiranya Tuan/Puan mempunyai sebarang pertanyaan berkaitan itinerary, dokumen perjalanan, atau maklumat trip, ${fb.pic.name} sedia membantu.`
      ];

      paragraphs.forEach(p => {
        const splitP = pdf.splitTextToSize(p, contentWidth);
        checkPageBreak(splitP.length * 6 + 10);
        pdf.text(splitP, leftMargin, y, { align: "left" });
        y += (splitP.length * 6) + 4;
      });
    }

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("© 2026 Kembara Sufi Travel & Tours Sdn Bhd. Hak Cipta Terpelihara. (KPL 7168)", pageWidth / 2, footerY, { align: "center" });
    }

    const fileName = `Sebutharga_${q.quotationNo}.pdf`;
    
    try {
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      pdf.save(fileName);
    }
    
    setGeneratingPdf(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6" /> Senarai Sebut Harga
        </h2>
        <p className="text-sm text-muted-foreground">Lihat dan urus semua sebut harga</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nombor, pelanggan, atau pakej..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 text-sm"
            title="Dari tarikh"
          />
          <span className="text-gray-400">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 text-sm"
            title="Hingga tarikh"
          />
          {(dateFrom || dateTo) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          Semua
        </Button>
        <Button
          variant={statusFilter === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("draft")}
        >
          Draft
        </Button>
        <Button
          variant={statusFilter === "sent" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("sent")}
        >
          Dihantar
        </Button>
        <Button
          variant={statusFilter === "confirmed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("confirmed")}
        >
          Disahkan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sebut Harga ({quotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Tiada sebut harga dijumpai</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-sm">No. Sebut Harga</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-sm">Pelanggan</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-sm hidden md:table-cell">Pakej</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium text-sm hidden sm:table-cell">Pax</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium text-sm">Jumlah</th>
                    <th className="text-center py-3 px-2 text-gray-500 font-medium text-sm">Status</th>
                    <th className="text-center py-3 px-2 text-gray-500 font-medium text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q._id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-3 px-2">
                        <p className="font-medium">{q.quotationNo}</p>
                        <p className="text-xs text-gray-500">{formatDate(q.createdAt)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p>{q.customerName}</p>
                        <p className="text-xs text-gray-400">{q.customerPhone}</p>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <p className="text-sm">{q.packageName}</p>
                        <p className="text-xs text-gray-400">{q.travelDate}</p>
                      </td>
                      <td className="py-3 px-2 text-sm hidden sm:table-cell">
                        {q.pax.adult}A {q.pax.cwb > 0 && `${q.pax.cwb}C`}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-emerald-600">
                        {formatCurrency(q.totalAmount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          q.status === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
                          q.status === "sent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" :
                          q.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" :
                          "bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300"
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedQuotation(q)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generatePDF(q)}
                            disabled={generatingPdf === q._id}
                            className="text-amber-600"
                            title="Muat Turun PDF"
                          >
                            {generatingPdf === q._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(q._id)}
                            disabled={deletingId === q._id}
                            className="text-red-600"
                            title="Padam"
                          >
                            {deletingId === q._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center">Padam Sebut Harga?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-500 text-center">
                Adakah anda pasti mahu padam sebut harga ini? Tindakan ini tidak boleh dibatalkan.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => deleteQuotation(deleteConfirm)}
                  disabled={deletingId === deleteConfirm}
                  variant="destructive"
                  className="flex-1"
                >
                  {deletingId === deleteConfirm ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Ya, Padam
                </Button>
                <Button
                  onClick={() => setDeleteConfirm(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedQuotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Detail Sebut Harga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">No. Sebut Harga</p>
                  <p className="font-medium">{selectedQuotation.quotationNo}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedQuotation.status === "confirmed" ? "bg-green-100 text-green-700" :
                    selectedQuotation.status === "sent" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedQuotation.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Pelanggan</p>
                  <p>{selectedQuotation.customerName}</p>
                  <p className="text-sm text-gray-400">{selectedQuotation.customerPhone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Jumlah</p>
                  <p className="text-emerald-600 font-bold text-xl">{formatCurrency(selectedQuotation.totalAmount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-sm">Pakej</p>
                  <p>{selectedQuotation.packageName}</p>
                  <p className="text-sm text-gray-400">{selectedQuotation.travelDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-sm">Pax</p>
                  <p>
                    {selectedQuotation.pax.adult} Dewasa
                    {selectedQuotation.pax.cwb > 0 && `, ${selectedQuotation.pax.cwb} CWB`}
                    {selectedQuotation.pax.cwob > 0 && `, ${selectedQuotation.pax.cwob} CWOB`}
                    {selectedQuotation.pax.infant > 0 && `, ${selectedQuotation.pax.infant} Bayi`}
                  </p>
                </div>
                {selectedQuotation.fullBreakdown?.pic && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-sm">PIC</p>
                    <p>
                      {selectedQuotation.fullBreakdown.pic.name} ({selectedQuotation.fullBreakdown.pic.phone})
                    </p>
                  </div>
                )}
                {selectedQuotation.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-sm">Catatan</p>
                    <p className="text-sm">{selectedQuotation.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t flex-wrap">
                {selectedQuotation.status === "draft" && (
                  <Button onClick={() => updateStatus(selectedQuotation._id, "sent")} className="flex-1">
                    Tandakan Dihantar
                  </Button>
                )}
                {selectedQuotation.status === "sent" && (
                  <Button onClick={() => updateStatus(selectedQuotation._id, "confirmed")} className="flex-1 bg-green-600 hover:bg-green-700">
                    Sahkan Tempahan
                  </Button>
                )}
                {selectedQuotation.status !== "cancelled" && selectedQuotation.status !== "confirmed" && (
                  <Button onClick={() => updateStatus(selectedQuotation._id, "cancelled")} variant="destructive">
                    Batalkan
                  </Button>
                )}
                <Button 
                  onClick={() => generatePDF(selectedQuotation)}
                  disabled={generatingPdf === selectedQuotation._id}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {generatingPdf === selectedQuotation._id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
                <Button onClick={() => setSelectedQuotation(null)} variant="outline">
                  Tutup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
