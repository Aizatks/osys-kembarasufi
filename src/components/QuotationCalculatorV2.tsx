"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MasterData, TripDate, InsuranceRates } from "@/lib/sheets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Calculator, Info, Sparkles, Calendar, AlertCircle, Plus, Trash2, Package, X, FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  data: MasterData;
}

interface PackageSelection {
  id: string;
  pkgKey: string;
  dateIdx: string;
  manualDate: string;
  pax: { adult: number; cwb: number; cwob: number; infant: number };
  insurancePax: { standard: number; senior: number };
  surchargeOverride: number | "";
  singleRoomCount: number;
  dates: TripDate[];
  loadingDates: boolean;
  visaManual: { 
    enabled: boolean; 
    entries: { country: string; price: number; pax: number }[];
  };
  optionalPlaces: { name: string; price: number; pax: number }[];
  manualPrices: { enabled: boolean; adult: number; cwb: number; cwob: number; infant: number };
}

const createEmptyPackage = (): PackageSelection => ({
  id: crypto.randomUUID(),
  pkgKey: "",
  dateIdx: "",
  manualDate: "",
  pax: { adult: 1, cwb: 0, cwob: 0, infant: 0 },
  insurancePax: { standard: 0, senior: 0 },
  surchargeOverride: "",
  singleRoomCount: 0,
  dates: [],
  loadingDates: false,
  visaManual: { enabled: false, entries: [] },
  optionalPlaces: [],
  manualPrices: { enabled: false, adult: 0, cwb: 0, cwob: 0, infant: 0 },
});

const PIC_MAPPING: Record<string, { name: string; phone: string }> = {
  'CEE': { name: 'Aisyah', phone: '018-9834498' },
  'SWISS': { name: 'Aisyah', phone: '018-9834498' },
  'SWITZERLAND': { name: 'Aisyah', phone: '018-9834498' },
  'CIKGU LOH': { name: 'Rina', phone: '018-2614498' },
  'PAKEJ CIKGU LOH': { name: 'Rina', phone: '018-2614498' },
  'BALKAN': { name: 'Latifah', phone: '013-3504498' },
  'HARBIN': { name: 'Latifah', phone: '013-3504498' },
  'CHENGDU': { name: 'Latifah', phone: '013-3504498' },
  'CHONGQING': { name: 'Latifah', phone: '013-3504498' },
  'SILK ROAD': { name: 'Latifah', phone: '013-3504498' },
  'DOMESTIK': { name: 'Latifah', phone: '013-3504498' },
  'SABAH': { name: 'Latifah', phone: '013-3504498' },
  'SARAWAK': { name: 'Latifah', phone: '013-3504498' },
  'KENYIR': { name: 'Latifah', phone: '013-3504498' },
  'TAMAN NEGARA': { name: 'Latifah', phone: '013-3504498' },
  'UK': { name: 'Fatin', phone: '019-2144498' },
  'UNITED KINGDOM': { name: 'Fatin', phone: '019-2144498' },
  'WEST EUROPE': { name: 'Fatin', phone: '019-2144498' },
  'WEST': { name: 'Fatin', phone: '019-2144498' },
  'KEMBARA EROPAH': { name: 'Fatin', phone: '019-2144498' },
  'VIETNAM': { name: 'Shazuan', phone: '013-7784498' },
  'INDONESIA': { name: 'Syahidur', phone: '012-2364498' },
  'TRANS INDO': { name: 'Syahidur', phone: '012-2364498' },
  'BALI': { name: 'Syahidur', phone: '012-2364498' },
  'JAKARTA': { name: 'Syahidur', phone: '012-2364498' },
  'BANDUNG': { name: 'Syahidur', phone: '012-2364498' },
  'MEDAN': { name: 'Syahidur', phone: '012-2364498' },
  'ACEH': { name: 'Syahidur', phone: '012-2364498' },
  'KASHMIR': { name: 'Aiman', phone: '010-4314498' },
  'PAKISTAN': { name: 'Aiman', phone: '010-4314498' },
  'TAIWAN': { name: 'Aiman', phone: '010-4314498' },
  'KOREA': { name: 'Aiman', phone: '010-4314498' },
  'SEOUL': { name: 'Aiman', phone: '010-4314498' },
  'TIMOR': { name: 'Aiman', phone: '010-4314498' },
  'TIMOR LESTE': { name: 'Aiman', phone: '010-4314498' },
  'SYRIA': { name: 'Aiman', phone: '010-4314498' },
  'LEBANON': { name: 'Aiman', phone: '010-4314498' },
  'UMRAH': { name: 'Aiman', phone: '010-4314498' },
  'YUNNAN': { name: 'Hazim', phone: '019-7754498' },
  'JAPAN': { name: 'Hazim', phone: '019-7754498' },
  'JEPUN': { name: 'Hazim', phone: '019-7754498' },
  'CHINA': { name: 'Hazim', phone: '019-7754498' },
  'BEIJING': { name: 'Hazim', phone: '019-7754498' },
  'XIAN': { name: 'Hazim', phone: '019-7754498' },
  'MONGOLIA': { name: 'Hazim', phone: '019-7754498' },
  'TURKEY': { name: 'Anas', phone: '019-3504498' },
  'TURKI': { name: 'Anas', phone: '019-3504498' },
  'TURKIYE': { name: 'Anas', phone: '019-3504498' },
  'CAUCASUS': { name: 'Anas', phone: '019-3504498' },
  'JORDAN': { name: 'Shafina', phone: '018-7854498' },
  'AQSA': { name: 'Shafina', phone: '018-7854498' },
  'PALESTIN': { name: 'Shafina', phone: '018-7854498' },
  'MESIR': { name: 'Shafina', phone: '018-7854498' },
  'EGYPT': { name: 'Shafina', phone: '018-7854498' },
  'NILE': { name: 'Shafina', phone: '018-7854498' },
  'SPM': { name: 'Shafina', phone: '018-7854498' },
  'SPAIN': { name: 'Shafina', phone: '018-7854498' },
  'PORTUGAL': { name: 'Shafina', phone: '018-7854498' },
  'MOROCCO': { name: 'Shafina', phone: '018-7854498' },
  'KEMBOJA': { name: 'Shazuan', phone: '013-7784498' },
  'CAMBODIA': { name: 'Shazuan', phone: '013-7784498' },
  'THAILAND': { name: 'Shazuan', phone: '013-7784498' },
  'BANGKOK': { name: 'Shazuan', phone: '013-7784498' },
};

function getPicForPackage(pkgName: string): { name: string; phone: string } | null {
  const upperName = pkgName.toUpperCase();
  for (const [key, pic] of Object.entries(PIC_MAPPING)) {
    if (upperName.includes(key)) {
      return pic;
    }
  }
  return null;
}

export function QuotationCalculatorV2({ data }: Props) {
  const { token } = useAuth();
  const [packages, setPackages] = useState<PackageSelection[]>([createEmptyPackage()]);
  const [searchQuery, setSearchQuery] = useState("");
  const [discount, setDiscount] = useState({ mode: "none", value: 0, applyInfant: false });
  const [staffInfo, setStaffInfo] = useState({ name: "", number: "" });
  const [depositValue, setDepositValue] = useState("300");
  const [quotationText, setQuotationText] = useState("");
  const [showQuotation, setShowQuotation] = useState(false);
  const [activePackageIdx, setActivePackageIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [customDeposit, setCustomDeposit] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [isRecording, setIsRecording] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const DEFAULT_TERMASUK = [
    "Tiket Penerbangan Pergi & Balik",
    "Penginapan Hotel (Seperti Dalam Pakej)",
    "Makan Mengikut Itinerari",
    "Pengangkutan Darat (Bas/Van)",
    "Mutawwif / Tour Leader",
    "Ziarah Mengikut Itinerari",
  ];
  
  const DEFAULT_TIDAK_TERMASUK = [
    "Insurans Perjalanan",
    "Tipping Guide & Pemandu",
    "Visa (Jika Berkaitan)",
    "Lebihan Bagasi",
    "Perbelanjaan Peribadi",
  ];
  
  const [termasukItems, setTermasukItems] = useState<Record<string, boolean>>(() => 
    DEFAULT_TERMASUK.reduce((acc, item) => ({ ...acc, [item]: true }), {})
  );
  const [tidakTermasukItems, setTidakTermasukItems] = useState<Record<string, boolean>>(() =>
    DEFAULT_TIDAK_TERMASUK.reduce((acc, item) => ({ ...acc, [item]: true }), {})
  );
  const [showTermasukSection, setShowTermasukSection] = useState(false);

  const activePackage = packages[activePackageIdx];
  const selectedPkg = activePackage ? data[activePackage.pkgKey] : null;
  
  // Pre-load logo
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
  
  // Fetch dates when package changes
  useEffect(() => {
    if (!activePackage || !activePackage.pkgKey) return;
    const pkgData = data[activePackage.pkgKey];
    if (!pkgData || !pkgData.sheetGid) return;

    // Only fetch if we don't have dates yet
    if (activePackage.dates.length === 0 && !activePackage.loadingDates) {
      const fetchDates = async () => {
        updatePackage(activePackageIdx, { loadingDates: true });
        try {
          const res = await fetch(`/api/dates?gid=${pkgData.sheetGid}&pkgName=${encodeURIComponent(pkgData.name)}`);
          if (res.ok) {
            const json = await res.json();
            updatePackage(activePackageIdx, { dates: json.dates || [], loadingDates: false });
          } else {
            updatePackage(activePackageIdx, { loadingDates: false });
          }
        } catch (e) {
          updatePackage(activePackageIdx, { loadingDates: false });
        }
      };
      fetchDates();
    }
  }, [activePackage?.pkgKey, activePackageIdx]);

  const availableDates = activePackage?.dates || [];
  const selectedDate: TripDate | null = 
    activePackage?.dateIdx !== "" && activePackage?.dateIdx !== "manual" 
      ? availableDates[parseInt(activePackage.dateIdx)] || null 
      : null;

    useEffect(() => {
      if (activePackage?.dateIdx && activePackage.dateIdx !== "manual" && selectedDate) {
        if (selectedDate.sur > 0) {
          updatePackage(activePackageIdx, { surchargeOverride: selectedDate.sur });
        } else if (selectedPkg && selectedPkg.costs.surcharge_base === 0) {
          updatePackage(activePackageIdx, { surchargeOverride: 0 });
        } else {
          updatePackage(activePackageIdx, { surchargeOverride: "" });
        }
      }
    }, [activePackage?.dateIdx, selectedDate?.sur, selectedPkg]);


  const filteredPkgKeys = useMemo(() => {
    return Object.keys(data)
      .filter((key) => data[key].name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => data[a].name.localeCompare(data[b].name));
  }, [data, searchQuery]);

  const updatePackage = (idx: number, updates: Partial<PackageSelection>) => {
    setPackages(prev => prev.map((pkg, i) => i === idx ? { ...pkg, ...updates } : pkg));
  };

  const addPackage = () => {
    if (packages.length >= 5) {
      toast.error("Maksimum 5 pakej sahaja!");
      return;
    }
    setPackages(prev => [...prev, createEmptyPackage()]);
    setActivePackageIdx(packages.length);
  };

  const removePackage = (idx: number) => {
    if (packages.length <= 1) {
      toast.error("Mesti ada sekurang-kurangnya 1 pakej!");
      return;
    }
    setPackages(prev => prev.filter((_, i) => i !== idx));
    if (activePackageIdx >= packages.length - 1) {
      setActivePackageIdx(Math.max(0, packages.length - 2));
    }
  };

  const calculatePackage = (pkg: PackageSelection) => {
    const pkgData = data[pkg.pkgKey];
    if (!pkgData) return null;

    const prices = pkgData.prices;
    const costs = pkgData.costs;
    const insRates = pkgData.insuranceRates;
    
    const insStandard = insRates?.malaysian || costs.insurance;
    const insSenior = insRates?.seniorMalaysian || (costs.insurance * 2);
    const totalInsurance = (pkg.insurancePax.standard * insStandard) + (pkg.insurancePax.senior * insSenior);
    
    const surcharge = pkg.surchargeOverride !== "" ? Number(pkg.surchargeOverride) : costs.surcharge_base;

    const totalPaxExcludingInfant = pkg.pax.adult + pkg.pax.cwb + pkg.pax.cwob;
    const totalPaxIncludingInfant = totalPaxExcludingInfant + pkg.pax.infant;

    const actualPrices = pkg.manualPrices.enabled ? {
      adult: pkg.manualPrices.adult || prices.adult,
      cwb: pkg.manualPrices.cwb || prices.cwb,
      cwob: pkg.manualPrices.cwob || prices.cwob,
      infant: pkg.manualPrices.infant || prices.infant,
    } : prices;

    const adultBaseTotal = pkg.pax.adult * actualPrices.adult;
    const cwbBaseTotal = pkg.pax.cwb * actualPrices.cwb;
    const cwobBaseTotal = pkg.pax.cwob * actualPrices.cwob;
    const infantTotal = pkg.pax.infant * actualPrices.infant;
    
    const baseTotal = adultBaseTotal + cwbBaseTotal + cwobBaseTotal + infantTotal;
    
    const totalTipping = totalPaxExcludingInfant * costs.tip;
    const totalVisa = pkg.visaManual.enabled && pkg.visaManual.entries.length > 0
      ? pkg.visaManual.entries.reduce((sum, entry) => sum + (entry.price * entry.pax), 0)
      : totalPaxExcludingInfant * costs.visa;
    const totalSurcharge = totalPaxExcludingInfant * surcharge;
    const singleRoomTotal = pkg.singleRoomCount * costs.singleRoom;

    const optionalTotal = pkg.optionalPlaces.reduce((sum, place) => sum + (place.price * place.pax), 0);

    const total = baseTotal + totalTipping + totalVisa + totalSurcharge + singleRoomTotal + totalInsurance + optionalTotal;

    return {
      total,
      baseTotal,
      adultBaseTotal,
      cwbBaseTotal,
      cwobBaseTotal,
      infantTotal,
      singleRoomTotal,
      totalInsurance,
      totalTipping,
      totalVisa,
      totalSurcharge,
      surcharge,
      insStandard,
      insSenior,
      tip: costs.tip,
      visa: costs.visa,
      totalPaxExcludingInfant,
      totalPaxIncludingInfant,
      pricePerAdult: actualPrices.adult,
      pricePerCwb: actualPrices.cwb,
      pricePerCwob: actualPrices.cwob,
      pricePerInfant: actualPrices.infant,
      optionalTotal,
    };
  };

  const grandTotal = useMemo(() => {
    let subtotal = 0;
    let totalPaxIncludingInfant = 0;
    let totalPaxExcludingInfant = 0;
    
    packages.forEach(pkg => {
      const calc = calculatePackage(pkg);
      if (calc) {
        subtotal += calc.total;
        totalPaxIncludingInfant += calc.totalPaxIncludingInfant;
        totalPaxExcludingInfant += calc.totalPaxExcludingInfant;
      }
    });

    let discountAmount = 0;
    if (discount.mode === "per_pax_rm") {
      const paxForDiscount = discount.applyInfant ? totalPaxIncludingInfant : totalPaxExcludingInfant;
      discountAmount = discount.value * paxForDiscount;
    } else if (discount.mode === "total_rm") {
      discountAmount = discount.value;
    } else if (discount.mode === "percent_total") {
      discountAmount = subtotal * (discount.value / 100);
    }

    return {
      subtotal,
      discountAmount,
      total: subtotal - discountAmount,
      totalPax: totalPaxIncludingInfant,
      totalPaxExcludingInfant,
    };
  }, [packages, discount, data]);

  const getDisplayDate = (pkg: PackageSelection) => {
    if (pkg.dateIdx === "manual") return pkg.manualDate;
    const dates = pkg.dates || [];
    if (pkg.dateIdx !== "" && dates[parseInt(pkg.dateIdx)]) {
      return dates[parseInt(pkg.dateIdx)].txt;
    }
    return "";
  };

  const generateQuotationText = () => {
    let text = "";
    
    if (packages.length === 1) {
      const pkg = packages[0];
      const pkgData = data[pkg.pkgKey];
      const calc = calculatePackage(pkg);
      if (!pkgData || !calc) return "";
      
      const dateStr = getDisplayDate(pkg) || "Akan Dimaklumkan";
      
      text = `*SEBUTHARGA / QUOTATION*\n`;
      text += `📦 Pakej: ${pkgData.name}\n`;
      text += `📅 Tarikh: ${dateStr}\n`;
      text += `👤 Bilangan Pax: ${calc.totalPaxIncludingInfant} Orang\n\n`;

      text += `*PECAHAN HARGA:*\n`;
      if (pkg.pax.adult > 0) text += `- Dewasa: ${pkg.pax.adult} x RM${calc.pricePerAdult.toLocaleString()} = RM${calc.adultBaseTotal.toLocaleString()}\n`;
      if (pkg.pax.cwb > 0) text += `- Child (Bed): ${pkg.pax.cwb} x RM${calc.pricePerCwb.toLocaleString()} = RM${calc.cwbBaseTotal.toLocaleString()}\n`;
      if (pkg.pax.cwob > 0) text += `- Child (No Bed): ${pkg.pax.cwob} x RM${calc.pricePerCwob.toLocaleString()} = RM${calc.cwobBaseTotal.toLocaleString()}\n`;
      if (pkg.pax.infant > 0) text += `- Infant: ${pkg.pax.infant} x RM${calc.pricePerInfant.toLocaleString()} = RM${calc.infantTotal.toLocaleString()}\n`;
      if (pkg.singleRoomCount > 0) text += `- Single Room: ${pkg.singleRoomCount} x RM${pkgData.costs.singleRoom.toLocaleString()} = RM${calc.singleRoomTotal.toLocaleString()}\n`;
      
      text += `\n*KOS TAMBAHAN:*\n`;
      if (calc.totalTipping > 0) text += `- Tipping: ${calc.totalPaxExcludingInfant} pax x RM${calc.tip} = RM${calc.totalTipping.toLocaleString()}\n`;
      if (calc.totalSurcharge > 0) text += `- Surcharge: ${calc.totalPaxExcludingInfant} pax x RM${calc.surcharge} = RM${calc.totalSurcharge.toLocaleString()}\n`;
      if (pkg.visaManual.enabled && pkg.visaManual.entries.length > 0) {
        pkg.visaManual.entries.forEach(entry => {
          if (entry.pax > 0 && entry.price > 0) {
            text += `- Visa (${entry.country}): ${entry.pax} pax x RM${entry.price} = RM${(entry.price * entry.pax).toLocaleString()}\n`;
          }
        });
      } else if (calc.totalVisa > 0) {
        text += `- Visa: ${calc.totalPaxExcludingInfant} pax x RM${calc.visa} = RM${calc.totalVisa.toLocaleString()}\n`;
      }
      if (pkg.insurancePax.standard > 0) text += `- Insurans (Standard): ${pkg.insurancePax.standard} x RM${calc.insStandard} = RM${(pkg.insurancePax.standard * calc.insStandard).toLocaleString()}\n`;
      if (pkg.insurancePax.senior > 0) text += `- Insurans (71+): ${pkg.insurancePax.senior} x RM${calc.insSenior} = RM${(pkg.insurancePax.senior * calc.insSenior).toLocaleString()}\n`;
      
      if (pkg.optionalPlaces.length > 0) {
        text += `\n*TEMPAT OPTIONAL:*\n`;
        pkg.optionalPlaces.forEach(place => {
          if (place.name && place.pax > 0) {
            text += `- ${place.name}: ${place.pax} pax x RM${place.price} = RM${(place.price * place.pax).toLocaleString()}\n`;
          }
        });
      }

      if (grandTotal.discountAmount > 0) {
        if (discount.mode === "per_pax_rm") {
          const paxForDiscount = discount.applyInfant ? calc.totalPaxIncludingInfant : calc.totalPaxExcludingInfant;
          text += `\n✨ Diskaun: ${paxForDiscount} pax x RM${discount.value.toLocaleString()} = -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        } else if (discount.mode === "percent_total") {
          text += `\n✨ Diskaun (${discount.value}%): -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        } else {
          text += `\n✨ Diskaun: -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        }
      }

      text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 *JUMLAH KESELURUHAN: RM${grandTotal.total.toLocaleString()}*\n`;
      const paid = Number(paidAmount) || 0;
      if (paid > 0) {
        text += `✅ Jumlah Dibayar: RM${paid.toLocaleString()}\n`;
        text += `⏳ Baki Bayaran: RM${(grandTotal.total - paid).toLocaleString()}\n`;
      }
      text += `━━━━━━━━━━━━━━━━━━━━\n`;

      if (showTermasukSection) {
        const selectedTermasuk = Object.entries(termasukItems).filter(([_, v]) => v).map(([k]) => k);
        const selectedTidakTermasuk = Object.entries(tidakTermasukItems).filter(([_, v]) => v).map(([k]) => k);
        
        if (selectedTermasuk.length > 0) {
          text += `\n✅ *TERMASUK:*\n`;
          selectedTermasuk.forEach(item => text += `• ${item}\n`);
        }
        
        if (selectedTidakTermasuk.length > 0) {
          text += `\n❌ *TIDAK TERMASUK:*\n`;
          selectedTidakTermasuk.forEach(item => text += `• ${item}\n`);
        }
      }

      text += `\n_Disediakan secara automatik oleh Kembara Sufi Quotation System_`;
      return text;
    } else {
      text = `*SEBUTHARGA GABUNGAN*\n\n`;
    
      packages.forEach((pkg, idx) => {
        const pkgData = data[pkg.pkgKey];
        const calc = calculatePackage(pkg);
        if (!pkgData || !calc) return;
        
        const dateStr = getDisplayDate(pkg) || "Akan Dimaklumkan";
        
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📦 *PAKEJ ${idx + 1}: ${pkgData.name}*\n`;
        text += `📅 Tarikh: ${dateStr}\n`;
        text += `👤 Pax: ${calc.totalPaxIncludingInfant} Orang\n\n`;
        
        text += `*Pecahan Harga:*\n`;
        if (pkg.pax.adult > 0) text += `- Dewasa: ${pkg.pax.adult} x RM${calc.pricePerAdult.toLocaleString()} = RM${calc.adultBaseTotal.toLocaleString()}\n`;
        if (pkg.pax.cwb > 0) text += `- Child (Bed): ${pkg.pax.cwb} x RM${calc.pricePerCwb.toLocaleString()} = RM${calc.cwbBaseTotal.toLocaleString()}\n`;
        if (pkg.pax.cwob > 0) text += `- Child (No Bed): ${pkg.pax.cwob} x RM${calc.pricePerCwob.toLocaleString()} = RM${calc.cwobBaseTotal.toLocaleString()}\n`;
        if (pkg.pax.infant > 0) text += `- Infant: ${pkg.pax.infant} x RM${calc.pricePerInfant.toLocaleString()} = RM${calc.infantTotal.toLocaleString()}\n`;
        if (pkg.singleRoomCount > 0) text += `- Single Room: ${pkg.singleRoomCount} x RM${pkgData.costs.singleRoom.toLocaleString()} = RM${calc.singleRoomTotal.toLocaleString()}\n`;
        
        text += `\n*Kos Tambahan:*\n`;
        if (calc.totalTipping > 0) text += `- Tipping: ${calc.totalPaxExcludingInfant} pax x RM${calc.tip} = RM${calc.totalTipping.toLocaleString()}\n`;
        if (calc.totalSurcharge > 0) text += `- Surcharge: ${calc.totalPaxExcludingInfant} pax x RM${calc.surcharge} = RM${calc.totalSurcharge.toLocaleString()}\n`;
        if (pkg.visaManual.enabled && pkg.visaManual.entries.length > 0) {
          pkg.visaManual.entries.forEach(entry => {
            if (entry.pax > 0 && entry.price > 0) {
              text += `- Visa (${entry.country}): ${entry.pax} pax x RM${entry.price} = RM${(entry.price * entry.pax).toLocaleString()}\n`;
            }
          });
        } else if (calc.totalVisa > 0) {
          text += `- Visa: ${calc.totalPaxExcludingInfant} pax x RM${calc.visa} = RM${calc.totalVisa.toLocaleString()}\n`;
        }
        if (pkg.insurancePax.standard > 0) text += `- Insurans: ${pkg.insurancePax.standard} x RM${calc.insStandard} = RM${(pkg.insurancePax.standard * calc.insStandard).toLocaleString()}\n`;
        if (pkg.insurancePax.senior > 0) text += `- Insurans (71+): ${pkg.insurancePax.senior} x RM${calc.insSenior} = RM${(pkg.insurancePax.senior * calc.insSenior).toLocaleString()}\n`;
        
        if (pkg.optionalPlaces.length > 0) {
          pkg.optionalPlaces.forEach(place => {
            if (place.name && place.pax > 0) {
              text += `- ${place.name}: ${place.pax} pax x RM${place.price} = RM${(place.price * place.pax).toLocaleString()}\n`;
            }
          });
        }
        
        text += `\n💵 *Subtotal Pakej ${idx + 1}: RM${calc.total.toLocaleString()}*\n\n`;
      });
      
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (grandTotal.discountAmount > 0) {
        if (discount.mode === "per_pax_rm") {
          const paxForDiscount = discount.applyInfant ? grandTotal.totalPax : grandTotal.totalPaxExcludingInfant;
          text += `✨ Diskaun: ${paxForDiscount} pax x RM${discount.value.toLocaleString()} = -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        } else if (discount.mode === "percent_total") {
          text += `✨ Diskaun (${discount.value}%): -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        } else {
          text += `✨ Diskaun: -RM${grandTotal.discountAmount.toLocaleString()}\n`;
        }
      }
      text += `💰 *JUMLAH KESELURUHAN: RM${grandTotal.total.toLocaleString()}*\n`;
      text += `👥 Total Pax: ${grandTotal.totalPax} Orang\n`;

      if (showTermasukSection) {
        const selectedTermasuk = Object.entries(termasukItems).filter(([_, v]) => v).map(([k]) => k);
        const selectedTidakTermasuk = Object.entries(tidakTermasukItems).filter(([_, v]) => v).map(([k]) => k);
        
        if (selectedTermasuk.length > 0) {
          text += `\n✅ *TERMASUK:*\n`;
          selectedTermasuk.forEach(item => text += `• ${item}\n`);
        }
        
        if (selectedTidakTermasuk.length > 0) {
          text += `\n❌ *TIDAK TERMASUK:*\n`;
          selectedTidakTermasuk.forEach(item => text += `• ${item}\n`);
        }
      }

      text += `\nTerma kasih kerana memilih Kembara Sufi.\n`;
    }
    
    text += `\n_Disediakan secara automatik oleh Kembara Sufi Quotation System_`;
    return text;
  };

  const copyToClipboard = async () => {
    const text = generateQuotationText();
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Quotation disalin ke clipboard!");
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) { }
    
    if (textAreaRef.current) {
      textAreaRef.current.select();
      textAreaRef.current.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success("Quotation disalin ke clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.info("Text dipilih. Tekan Ctrl+C / Cmd+C untuk salin.");
      }
    }
  };

  const handleDownloadPDF = async () => {
    const actualDeposit = depositValue === "custom" ? customDeposit : depositValue;
    
    setIsRecording(true);
    let currentInvoiceNumber = '';
    
    try {
      const mainPkg = packages[0];
      const pkgData = data[mainPkg?.pkgKey];
      const calc = calculatePackage(mainPkg);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const picInfo = getPicForPackage(pkgData?.name || '');
      
      const response = await fetch('/api/record-quotation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          packageName: pkgData?.name || 'N/A',
          tripDate: getDisplayDate(mainPkg) || 'Akan Dimaklumkan',
          totalPax: calc?.totalPaxIncludingInfant || 0,
          totalAmount: grandTotal.total,
          deposit: actualDeposit,
          staffName: staffInfo.name || '-',
          staffNumber: staffInfo.number || '-',
          remark: remark || '-',
          packageCount: packages.length,
          pax: mainPkg?.pax,
          breakdown: {
            baseTotal: calc?.baseTotal,
            totalTipping: calc?.totalTipping,
            totalSurcharge: calc?.totalSurcharge,
            totalVisa: calc?.totalVisa,
            totalInsurance: calc?.totalInsurance,
            singleRoomTotal: calc?.singleRoomTotal,
            discountAmount: grandTotal.discountAmount,
          },
          fullBreakdown: {
            prices: {
              adult: calc?.pricePerAdult,
              cwb: calc?.pricePerCwb,
              cwob: calc?.pricePerCwob,
              infant: calc?.pricePerInfant,
              tip: calc?.tip,
              surcharge: calc?.surcharge,
              visa: calc?.visa,
              insStandard: calc?.insStandard,
              insSenior: calc?.insSenior,
              singleSupplement: data[mainPkg?.pkgKey]?.costs?.singleRoom,
            },
            totals: {
              baseTotal: calc?.baseTotal,
              totalTipping: calc?.totalTipping,
              totalSurcharge: calc?.totalSurcharge,
              totalVisa: calc?.totalVisa,
              totalInsurance: calc?.totalInsurance,
              singleRoomTotal: calc?.singleRoomTotal,
              discountAmount: grandTotal.discountAmount,
              grandTotal: grandTotal.total,
            },
            pax: mainPkg?.pax,
            insurancePax: mainPkg?.insurancePax,
            singleRoomPax: mainPkg?.singleRoomCount,
            visaManual: mainPkg?.visaManual,
            optionalPlaces: mainPkg?.optionalPlaces,
            remarks: remark,
            pic: picInfo,
            packageDuration: pkgData?.duration,
          },
        })
      });
      
      const result = await response.json();
      if (!result.success || !result.record?.invoiceNumber) {
        toast.error("Gagal menyimpan rekod. Sila cuba lagi.");
        setIsRecording(false);
        return;
      }
      
      currentInvoiceNumber = result.record.invoiceNumber;
      setInvoiceNumber(currentInvoiceNumber);
      toast.success("Rekod disimpan!");
      
      generatePDF(currentInvoiceNumber);
    } catch (err) {
      console.error("Failed to record quotation:", err);
      toast.error("Gagal menyimpan rekod. Sila cuba lagi.");
    } finally {
      setIsRecording(false);
    }
  };

  const generatePDF = (currentInvoiceNumber: string) => {
    const actualDeposit = depositValue === "custom" ? customDeposit : depositValue;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 20;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const contentWidth = rightMargin - leftMargin;

    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight - 25) {
        pdf.addPage();
        y = 20;
        return true;
      }
      return false;
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
    pdf.text("SEBUTHARGA", pageWidth / 2, y + 9.5, { align: "center", charSpace: 2 });

    y = 70;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`No. Invois: ${currentInvoiceNumber}`, leftMargin, y);
    pdf.setFont("helvetica", "normal");
    const today = new Date().toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
    pdf.text(`Tarikh: ${today}`, rightMargin, y, { align: "right" });
    y += 6;
    
    if (staffInfo.name) {
      pdf.setFont("helvetica", "bold");
      pdf.text(`Disediakan Oleh: ${staffInfo.name}`, leftMargin, y);
      if (staffInfo.number) {
        y += 5;
        pdf.text(`No. Telefon: ${staffInfo.number}`, leftMargin, y);
      }
      pdf.setFont("helvetica", "normal");
    }

    y += 10;

    if (packages.length === 1) {
      const pkg = packages[0];
      const pkgData = data[pkg.pkgKey];
      const calc = calculatePackage(pkg);
      if (!pkgData || !calc) return;

      const dateStr = getDisplayDate(pkg) || "Akan Dimaklumkan";

      pdf.setFillColor(240, 240, 240);
      pdf.rect(leftMargin, y - 5, contentWidth, 12, "F");
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(pkgData.name, leftMargin + 5, y + 3);
      y += 18;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Tarikh Perjalanan: ${dateStr}`, leftMargin, y);
      y += 7;
      pdf.text(`Jumlah Pax: ${calc.totalPaxIncludingInfant} Orang`, leftMargin, y);
      y += 12;

      pdf.setFillColor(30, 58, 95);
      pdf.rect(leftMargin, y, contentWidth, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("PECAHAN HARGA", leftMargin + 3, y + 5.5);
      y += 12;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      const addRow = (label: string, qty: number, price: number, total: number) => {
        pdf.text(label, leftMargin + 3, y);
        pdf.text(`${qty}`, leftMargin + 70, y, { align: "right" });
        pdf.text(`RM ${price.toLocaleString()}`, leftMargin + 110, y, { align: "right" });
        pdf.text(`RM ${total.toLocaleString()}`, rightMargin - 3, y, { align: "right" });
        y += 7;
      };

      pdf.setFont("helvetica", "bold");
      pdf.text("Item", leftMargin + 3, y);
      pdf.text("Qty", leftMargin + 70, y, { align: "right" });
      pdf.text("Harga", leftMargin + 110, y, { align: "right" });
      pdf.text("Jumlah", rightMargin - 3, y, { align: "right" });
      y += 3;
      pdf.line(leftMargin, y, rightMargin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");

      if (pkg.pax.adult > 0) addRow("Dewasa", pkg.pax.adult, calc.pricePerAdult, calc.adultBaseTotal);
      if (pkg.pax.cwb > 0) addRow("Child (With Bed)", pkg.pax.cwb, calc.pricePerCwb, calc.cwbBaseTotal);
      if (pkg.pax.cwob > 0) addRow("Child (No Bed)", pkg.pax.cwob, calc.pricePerCwob, calc.cwobBaseTotal);
      if (pkg.pax.infant > 0) addRow("Infant", pkg.pax.infant, calc.pricePerInfant, calc.infantTotal);
      if (pkg.singleRoomCount > 0) addRow("Single Room", pkg.singleRoomCount, pkgData.costs.singleRoom, calc.singleRoomTotal);

      y += 3;
      pdf.line(leftMargin, y, rightMargin, y);
      y += 8;

      pdf.setFillColor(30, 58, 95);
      pdf.rect(leftMargin, y, contentWidth, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("KOS TAMBAHAN", leftMargin + 3, y + 5.5);
      y += 12;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      if (calc.totalTipping > 0) addRow("Tipping", calc.totalPaxExcludingInfant, calc.tip, calc.totalTipping);
      if (calc.totalSurcharge > 0) addRow("Surcharge", calc.totalPaxExcludingInfant, calc.surcharge, calc.totalSurcharge);
      
      if (pkg.visaManual.enabled && pkg.visaManual.entries.length > 0) {
        pkg.visaManual.entries.forEach(entry => {
          if (entry.pax > 0 && entry.price > 0) {
            addRow(`Visa (${entry.country})`, entry.pax, entry.price, entry.price * entry.pax);
          }
        });
      } else if (calc.totalVisa > 0) {
        addRow("Visa", calc.totalPaxExcludingInfant, calc.visa, calc.totalVisa);
      }
      
      if (pkg.insurancePax.standard > 0) addRow("Insurans (Standard)", pkg.insurancePax.standard, calc.insStandard, pkg.insurancePax.standard * calc.insStandard);
      if (pkg.insurancePax.senior > 0) addRow("Insurans (71+)", pkg.insurancePax.senior, calc.insSenior, pkg.insurancePax.senior * calc.insSenior);

      if (pkg.optionalPlaces && pkg.optionalPlaces.length > 0) {
        const validOptional = pkg.optionalPlaces.filter(p => p.name && p.price > 0 && p.pax > 0);
        if (validOptional.length > 0) {
          y += 3;
          pdf.setFillColor(156, 39, 176);
          pdf.rect(leftMargin, y, contentWidth, 8, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text("TEMPAT OPTIONAL", leftMargin + 3, y + 5.5);
          y += 12;
          pdf.setTextColor(0, 0, 0);
          pdf.setFont("helvetica", "normal");
          
          validOptional.forEach(place => {
            addRow(place.name, place.pax, place.price, place.price * place.pax);
          });
        }
      }

      y += 5;

      if (grandTotal.discountAmount > 0) {
        pdf.setTextColor(34, 139, 34);
        pdf.text(`Diskaun: -RM ${grandTotal.discountAmount.toLocaleString()}`, rightMargin - 3, y, { align: "right" });
        y += 10;
        pdf.setTextColor(0, 0, 0);
      }

      pdf.setFillColor(30, 58, 95);
      pdf.rect(leftMargin, y, contentWidth, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("JUMLAH KESELURUHAN", leftMargin + 5, y + 8);
      pdf.text(`RM ${grandTotal.total.toLocaleString()}`, rightMargin - 5, y + 8, { align: "right" });
      y += 20;
      pdf.setTextColor(0, 0, 0);

    } else {
      pdf.setFillColor(240, 240, 240);
      pdf.rect(leftMargin, y - 5, contentWidth, 12, "F");
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(`SEBUTHARGA GABUNGAN (${packages.length} PAKEJ)`, leftMargin + 5, y + 3);
      y += 20;

      packages.forEach((pkg, idx) => {
        const pkgData = data[pkg.pkgKey];
        const calc = calculatePackage(pkg);
        if (!pkgData || !calc) return;

        const dateStr = getDisplayDate(pkg) || "Akan Dimaklumkan";
        checkPageBreak(80);

        pdf.setFillColor(30, 58, 95);
        pdf.rect(leftMargin, y, contentWidth, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(`PAKEJ ${idx + 1}: ${pkgData.name}`, leftMargin + 3, y + 5.5);
        y += 12;
        pdf.setTextColor(0, 0, 0);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Tarikh: ${dateStr} | Pax: ${calc.totalPaxIncludingInfant}`, leftMargin, y);
        y += 8;

        if (pkg.pax.adult > 0) { pdf.text(`Dewasa: ${pkg.pax.adult} x RM${calc.pricePerAdult.toLocaleString()} = RM${calc.adultBaseTotal.toLocaleString()}`, leftMargin, y); y += 6; }
        if (pkg.pax.cwb > 0) { pdf.text(`CWB: ${pkg.pax.cwb} x RM${calc.pricePerCwb.toLocaleString()} = RM${calc.cwbBaseTotal.toLocaleString()}`, leftMargin, y); y += 6; }
        if (pkg.pax.cwob > 0) { pdf.text(`CWOB: ${pkg.pax.cwob} x RM${calc.pricePerCwob.toLocaleString()} = RM${calc.cwobBaseTotal.toLocaleString()}`, leftMargin, y); y += 6; }
        if (pkg.pax.infant > 0) { pdf.text(`Infant: ${pkg.pax.infant} x RM${calc.pricePerInfant.toLocaleString()} = RM${calc.infantTotal.toLocaleString()}`, leftMargin, y); y += 6; }
        if (pkg.singleRoomCount > 0) { pdf.text(`Single Room: ${pkg.singleRoomCount} x RM${pkgData.costs.singleRoom.toLocaleString()} = RM${calc.singleRoomTotal.toLocaleString()}`, leftMargin, y); y += 6; }
        if (calc.totalTipping > 0) { pdf.text(`Tipping: RM${calc.totalTipping.toLocaleString()}`, leftMargin, y); y += 6; }
        if (calc.totalSurcharge > 0) { pdf.text(`Surcharge: RM${calc.totalSurcharge.toLocaleString()}`, leftMargin, y); y += 6; }
        
        if (pkg.visaManual.enabled && pkg.visaManual.entries.length > 0) {
          pkg.visaManual.entries.forEach(entry => {
            if (entry.pax > 0 && entry.price > 0) {
              pdf.text(`Visa (${entry.country}): ${entry.pax} x RM${entry.price} = RM${(entry.price * entry.pax).toLocaleString()}`, leftMargin, y); y += 6;
            }
          });
        } else if (calc.totalVisa > 0) {
          pdf.text(`Visa: RM${calc.totalVisa.toLocaleString()}`, leftMargin, y); y += 6;
        }
        
        if (calc.totalInsurance > 0) { pdf.text(`Insurans: RM${calc.totalInsurance.toLocaleString()}`, leftMargin, y); y += 6; }

        if (pkg.optionalPlaces && pkg.optionalPlaces.length > 0) {
          const validOptional = pkg.optionalPlaces.filter(p => p.name && p.price > 0 && p.pax > 0);
          validOptional.forEach(place => {
            pdf.text(`${place.name}: ${place.pax} x RM${place.price} = RM${(place.price * place.pax).toLocaleString()}`, leftMargin, y); y += 6;
          });
        }

        pdf.setFont("helvetica", "bold");
        pdf.text(`Subtotal Pakej ${idx + 1}: RM${calc.total.toLocaleString()}`, rightMargin - 3, y, { align: "right" });
        y += 12;
        pdf.setFont("helvetica", "normal");
      });

      checkPageBreak(40);

      if (grandTotal.discountAmount > 0) {
        pdf.setTextColor(34, 139, 34);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Diskaun: -RM ${grandTotal.discountAmount.toLocaleString()}`, rightMargin - 3, y, { align: "right" });
        y += 10;
        pdf.setTextColor(0, 0, 0);
      }
  
      pdf.setFillColor(30, 58, 95);
      pdf.rect(leftMargin, y, contentWidth, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("JUMLAH KESELURUHAN", leftMargin + 5, y + 8);
      pdf.text(`RM ${grandTotal.total.toLocaleString()}`, rightMargin - 5, y + 8, { align: "right" });
      y += 15;
      pdf.setFontSize(10);
      pdf.text(`Total Pax: ${grandTotal.totalPax} Orang`, rightMargin - 5, y, { align: "right" });
      y += 15;
      pdf.setTextColor(0, 0, 0);
    }

    checkPageBreak(70);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(`* NOTA: SebutHarga promosi ini sah dalam tempoh 5 hari bekerja selepas tempoh invoice dikeluarkan.`, leftMargin, y);
    y += 10;

    pdf.setFillColor(245, 247, 250);
    pdf.rect(leftMargin, y, contentWidth, 45, "F");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.text("MAKLUMAT PEMBAYARAN & DEPOSIT", leftMargin + 5, y + 7);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nilai Deposit: RM ${actualDeposit} / orang`, leftMargin + 5, y + 15);
    const secondPayment = Number(actualDeposit) * 2;
    pdf.text(`Bayaran Kedua: RM ${secondPayment.toLocaleString()} / orang`, leftMargin + 5, y + 21);
    pdf.text("Maybank : 562106630695 (Kembara Sufi Travel & Tours Sdn Bhd)", leftMargin + 5, y + 28);
    
    pdf.setFont("helvetica", "italic");
    const bankNote = "Selepas pembayaran dibuat sila sertakan salinan resit pembayaran dan salinan muka depan pasport kepada pihak kami untuk kami keluarkan resit bayaran pakej.";
    const splitNote = pdf.splitTextToSize(bankNote, contentWidth - 10);
    pdf.text(splitNote, leftMargin + 5, y + 35);
    
    y += 55;

    if (remark && remark.trim()) {
      checkPageBreak(20);
      pdf.setFillColor(255, 250, 230);
      pdf.rect(leftMargin, y, contentWidth, 15, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 120, 0);
      pdf.text("CATATAN / REMARK:", leftMargin + 5, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      const remarkLines = pdf.splitTextToSize(remark, contentWidth - 10);
      pdf.text(remarkLines, leftMargin + 5, y + 11);
      y += 20;
    }
    
    if (packages.length > 0) {
      const mainPkg = packages[0];
      const pkgData = data[mainPkg.pkgKey];
      if (pkgData) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        const picInfo = getPicForPackage(pkgData.name);
        const tripPicName = picInfo?.name || "PIC Pakej";
        const tripPicNumber = picInfo?.phone || "-";

        const paragraphs = [
          `Terima kasih kerana membuat tempahan Pakej ${pkgData.name} bersama Kembara Sufi.`,
          `Bagi urusan bayaran seterusnya sehingga selesai (full payment), Tuan/Puan boleh berhubung terus dengan PIC yang menguruskan trip iaitu ${tripPicName} di ${tripPicNumber}.`,
          `Sekiranya Tuan/Puan mempunyai sebarang pertanyaan berkaitan itinerary, dokumen perjalanan, atau maklumat trip, ${tripPicName} sedia membantu.`
        ];

        paragraphs.forEach(p => {
          const splitP = pdf.splitTextToSize(p, contentWidth);
          checkPageBreak(splitP.length * 6 + 10);
          pdf.text(splitP, leftMargin, y, { align: "left" });
          y += (splitP.length * 6) + 4;
        });
        y += 2;
      }
    }

    checkPageBreak(15);
    pdf.setFont("helvetica", "bold");
    const tsMsg = "Mohon isi dan tanda tangan Terma dan Syarat: https://kembarasufi.com/terma/";
    pdf.text(tsMsg, leftMargin, y);

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("© 2026 Kembara Sufi Travel & Tours Sdn Bhd. Hak Cipta Terpelihara. (KPL 7168)", pageWidth / 2, footerY, { align: "center" });
      pdf.text(`Muka Surat ${i} / ${totalPages}`, rightMargin, footerY, { align: "right" });
    }

    const pkgName = packages.length === 1 && data[packages[0].pkgKey] 
      ? data[packages[0].pkgKey].name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)
      : "Gabungan";
    const fileName = `Quotation_${currentInvoiceNumber}_${pkgName}.pdf`;
    
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
      toast.success("PDF berjaya dimuat turun!");
    } catch (error) {
      pdf.save(fileName);
      toast.success("PDF berjaya dimuat turun!");
    }
  };

  const selectAllText = () => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
      textAreaRef.current.setSelectionRange(0, 99999);
      toast.info("Text dipilih. Tekan Ctrl+C / Cmd+C untuk salin.");
    }
  };

  const handleGenerateQuotation = () => {
    const text = generateQuotationText();
    setQuotationText(text);
    setShowQuotation(true);
    toast.success("Sebut harga dijana!");
  };

  const handleReset = () => {
    setShowQuotation(false);
    setQuotationText("");
  };

  if (!activePackage) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-12 max-w-6xl mx-auto px-2 sm:px-4 overflow-x-hidden">
      <div className="md:col-span-7 space-y-6 min-w-0">
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <CardTitle className="text-2xl font-bold">Quotation Generator 2026</CardTitle>
            </div>
            <CardDescription>
              Pilih pakej dan masukkan bilangan pax untuk menjana sebut harga.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {packages.map((pkg, idx) => {
                const pkgData = data[pkg.pkgKey];
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setActivePackageIdx(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      activePackageIdx === idx 
                        ? 'bg-primary text-white shadow-md' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">
                      {pkgData?.name ? pkgData.name.split(' ').slice(0, 2).join(' ') : `Pakej ${idx + 1}`}
                    </span>
                    {packages.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removePackage(idx);
                        }}
                        className="ml-1 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                );
              })}
              {packages.length < 5 && (
                <button
                  onClick={addPackage}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Pakej
                </button>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <Label className="font-bold">Pilih Pakej</Label>
              </div>
              <Input 
                placeholder="Cari pakej..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white"
              />
                <div className="flex gap-2">
                  <Select 
                    value={activePackage?.pkgKey || ""} 
                    onValueChange={(val) => {
                      updatePackage(activePackageIdx, { 
                        pkgKey: val, 
                        dateIdx: "", 
                        manualDate: "", 
                        surchargeOverride: "",
                        dates: []
                      });
                    }}
                  >
                    <SelectTrigger className="bg-white flex-1 min-w-0">
                      <SelectValue placeholder="-- Sila Pilih Pakej --" className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPkgKeys.map((key) => (
                        <SelectItem key={key} value={key}>{data[key].name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activePackage?.pkgKey && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="flex-shrink-0 h-10 w-10"
                      onClick={() => updatePackage(activePackageIdx, { 
                        pkgKey: "", 
                        dateIdx: "", 
                        manualDate: "", 
                        surchargeOverride: "",
                        dates: []
                      })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
            </div>

            {selectedPkg && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1 break-words">
                  <p className="flex flex-wrap gap-x-2"><span><strong>Harga Dewasa:</strong> RM{selectedPkg.prices.adult.toLocaleString()}</span> <span><strong>CWB:</strong> RM{selectedPkg.prices.cwb.toLocaleString()}</span> <span><strong>CWOB:</strong> RM{selectedPkg.prices.cwob.toLocaleString()}</span></p>
                  <p className="flex flex-wrap gap-x-2"><span><strong>Tipping:</strong> RM{selectedPkg.costs.tip}</span> <span><strong>Surcharge:</strong> RM{selectedPkg.costs.surcharge_base}</span> <span><strong>Visa:</strong> RM{selectedPkg.costs.visa}</span></p>
                  {selectedPkg.pic && <p className="text-muted-foreground italic">Info PIC: {selectedPkg.pic}</p>}
                </div>
              )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <Label className="font-bold">Tarikh Perjalanan</Label>
              </div>
              
              {activePackage?.loadingDates ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuatkan tarikh...
                </div>
              ) : availableDates.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select 
                        value={activePackage?.dateIdx || ""} 
                        onValueChange={(val) => {
                          updatePackage(activePackageIdx, { 
                            dateIdx: val,
                            manualDate: val === "manual" ? activePackage?.manualDate || "" : ""
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white flex-1 min-w-0">
                          <SelectValue placeholder="-- Pilih Tarikh --" className="truncate" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-2rem)]">
                            {availableDates.map((date, idx) => (
                              <SelectItem key={idx} value={String(idx)} disabled={date.status === 'CLOSED'}>
                                <div className="flex flex-wrap items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm">{date.txt}</span>
                                    {date.surLabel && (
                                      <span className="text-[10px] sm:text-xs text-orange-600 font-semibold bg-orange-100 px-1 sm:px-1.5 py-0.5 rounded">Surcharge</span>
                                    )}
                                  </div>
                                  {date.availability !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                      date.status === 'CLOSED' ? 'bg-red-100 text-red-600' :
                                      date.status === 'LIMITED' ? 'bg-amber-100 text-amber-600' :
                                      'bg-emerald-100 text-emerald-600'
                                    }`}>
                                      Kekosongan: {date.availability}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          <SelectItem value="manual">
                            <span className="text-muted-foreground italic">Masukkan tarikh manual...</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {activePackage?.dateIdx && activePackage.dateIdx !== "" && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          className="flex-shrink-0 h-10 w-10"
                          onClick={() => updatePackage(activePackageIdx, { dateIdx: "", manualDate: "" })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  
                  {selectedDate && selectedDate.surLabel && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-700">{selectedDate.surLabel}</span>
                    </div>
                  )}
                  
                  {activePackage?.dateIdx === "manual" && (
                    <Input 
                      placeholder="Contoh: 13 - 23 APR 2026" 
                      value={activePackage?.manualDate || ""}
                      onChange={(e) => updatePackage(activePackageIdx, { manualDate: e.target.value })}
                      className="bg-white"
                    />
                  )}
                </div>
              ) : (
                <Input 
                  placeholder="Contoh: 13 - 23 APR 2026" 
                  value={activePackage?.manualDate || ""}
                  onChange={(e) => {
                    updatePackage(activePackageIdx, { manualDate: e.target.value, dateIdx: "manual" });
                  }}
                  className="bg-white"
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <Label className="font-bold">Bilangan Pax</Label>
              </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Dewasa</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={activePackage?.pax.adult === 0 ? "" : activePackage?.pax.adult} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updatePackage(activePackageIdx, { 
                          pax: { ...activePackage!.pax, adult: val === "" ? 0 : parseInt(val) } 
                        });
                      }} 
                      placeholder="0"
                      className="bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Child Bed</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={activePackage?.pax.cwb === 0 ? "" : activePackage?.pax.cwb} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updatePackage(activePackageIdx, { 
                          pax: { ...activePackage!.pax, cwb: val === "" ? 0 : parseInt(val) } 
                        });
                      }} 
                      placeholder="0"
                      className="bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">No Bed</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={activePackage?.pax.cwob === 0 ? "" : activePackage?.pax.cwob} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updatePackage(activePackageIdx, { 
                          pax: { ...activePackage!.pax, cwob: val === "" ? 0 : parseInt(val) } 
                        });
                      }} 
                      placeholder="0"
                      className="bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Infant</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      value={activePackage?.pax.infant === 0 ? "" : activePackage?.pax.infant} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updatePackage(activePackageIdx, { 
                          pax: { ...activePackage!.pax, infant: val === "" ? 0 : parseInt(val) } 
                        });
                      }} 
                      placeholder="0"
                      className="bg-white" 
                    />
                  </div>
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="options" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Info className="w-4 h-4" /> Tetapan Tambahan (PIC, Insurans, Diskaun)
                  </span>
                </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Disediakan Oleh (Nama Staff)</Label>
                          <Input 
                            placeholder="Nama Staff / Sales" 
                            value={staffInfo.name} 
                            onChange={(e) => setStaffInfo({...staffInfo, name: e.target.value})}
                            className="bg-white h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">No. Telefon Staff</Label>
                          <Input 
                            placeholder="60133504498" 
                            value={staffInfo.number} 
                            onChange={(e) => setStaffInfo({...staffInfo, number: e.target.value})}
                            className="bg-white h-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Nilai Deposit (RM)</Label>
                        <div className="flex gap-2">
                          <Select value={depositValue} onValueChange={(val) => {
                            setDepositValue(val);
                            if (val !== "custom") setCustomDeposit("");
                          }}>
                            <SelectTrigger className="bg-white h-9 flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">RM 300</SelectItem>
                              <SelectItem value="500">RM 500</SelectItem>
                              <SelectItem value="750">RM 750</SelectItem>
                              <SelectItem value="1000">RM 1000</SelectItem>
                              <SelectItem value="custom">Manual...</SelectItem>
                            </SelectContent>
                          </Select>
                          {depositValue === "custom" && (
                            <Input 
                              type="text"
                              inputMode="numeric"
                              placeholder="Jumlah"
                              value={customDeposit}
                              onChange={(e) => setCustomDeposit(e.target.value.replace(/\D/g, ''))}
                              className="bg-white h-9 w-24"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Remark / Catatan (Voucher, Claim, dll)</Label>
                        <Input 
                          placeholder="Cth: Claim voucher RM100 dari promo raya"
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          className="bg-white h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Jumlah Dibayar (Placeholder {`{paid_amount}`})</Label>
                        <Input 
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value.replace(/\D/g, ''))}
                          className="bg-white h-9"
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            id="showTermasuk"
                            checked={showTermasukSection}
                            onChange={(e) => setShowTermasukSection(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="showTermasuk" className="text-xs font-semibold cursor-pointer">
                            Tambah Bahagian Termasuk / Tidak Termasuk
                          </Label>
                        </div>
                        
                        {showTermasukSection && (
                          <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                            <div>
                              <Label className="text-xs font-semibold text-green-700 mb-2 block">✅ TERMASUK:</Label>
                              <div className="grid grid-cols-1 gap-1">
                                {DEFAULT_TERMASUK.map((item) => (
                                  <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={termasukItems[item] ?? true}
                                      onChange={(e) => setTermasukItems(prev => ({ ...prev, [item]: e.target.checked }))}
                                      className="h-3.5 w-3.5 rounded border-gray-300"
                                    />
                                    {item}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <Separator />
                            <div>
                              <Label className="text-xs font-semibold text-red-700 mb-2 block">❌ TIDAK TERMASUK:</Label>
                              <div className="grid grid-cols-1 gap-1">
                                {DEFAULT_TIDAK_TERMASUK.map((item) => (
                                  <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={tidakTermasukItems[item] ?? true}
                                      onChange={(e) => setTidakTermasukItems(prev => ({ ...prev, [item]: e.target.checked }))}
                                      className="h-3.5 w-3.5 rounded border-gray-300"
                                    />
                                    {item}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                    <div className="space-y-3">
                    <Label className="text-xs font-semibold">Insurans Perjalanan</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Standard (0-70 tahun)</Label>
                          <Input 
                            type="text"
                            inputMode="numeric"
                            value={activePackage?.insurancePax.standard === 0 ? "" : activePackage?.insurancePax.standard} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              updatePackage(activePackageIdx, { 
                                insurancePax: { ...activePackage!.insurancePax, standard: val === "" ? 0 : parseInt(val) } 
                              });
                            }} 
                            placeholder="0"
                            className="bg-white h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Senior (71+ tahun)</Label>
                          <Input 
                            type="text"
                            inputMode="numeric"
                            value={activePackage?.insurancePax.senior === 0 ? "" : activePackage?.insurancePax.senior} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              updatePackage(activePackageIdx, { 
                                insurancePax: { ...activePackage!.insurancePax, senior: val === "" ? 0 : parseInt(val) } 
                              });
                            }} 
                            placeholder="0"
                            className="bg-white h-9"
                          />
                        </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Single Room Count</Label>
                        <Input 
                          type="text"
                          inputMode="numeric"
                          value={activePackage?.singleRoomCount === 0 ? "" : activePackage?.singleRoomCount} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            updatePackage(activePackageIdx, { 
                              singleRoomCount: val === "" ? 0 : parseInt(val) 
                            });
                          }}
                          className="bg-white h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Surcharge Manual (RM/pax)</Label>
                        <Input 
                          type="text"
                          inputMode="numeric"
                          placeholder={selectedPkg ? `Default: ${selectedPkg.costs.surcharge_base}` : "0"}
                          value={activePackage?.surchargeOverride === "" ? "" : activePackage?.surchargeOverride} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            updatePackage(activePackageIdx, { 
                              surchargeOverride: val === "" ? "" : parseInt(val) 
                            });
                          }}
                          className="bg-white h-9"
                        />
                      </div>
                    </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="enableManualPrices"
                        checked={activePackage?.manualPrices.enabled || false}
                        onChange={(e) => updatePackage(activePackageIdx, { 
                          manualPrices: { ...activePackage!.manualPrices, enabled: e.target.checked }
                        })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="enableManualPrices" className="text-xs font-semibold cursor-pointer">
                        Harga Manual (Override)
                      </Label>
                    </div>
                    
                    {activePackage?.manualPrices.enabled && (
                      <div className="bg-amber-50 rounded-lg p-3 space-y-2 border border-amber-200">
                        <p className="text-xs text-amber-700">Masukkan harga manual untuk tarikh/promosi khas:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Dewasa (RM)</Label>
                            <Input 
                              type="text"
                              inputMode="numeric"
                              placeholder={selectedPkg ? `${selectedPkg.prices.adult}` : "0"}
                              value={activePackage?.manualPrices.adult === 0 ? "" : activePackage?.manualPrices.adult}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                updatePackage(activePackageIdx, { 
                                  manualPrices: { ...activePackage!.manualPrices, adult: val === "" ? 0 : parseInt(val) }
                                });
                              }}
                              className="bg-white h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">CWB (RM)</Label>
                            <Input 
                              type="text"
                              inputMode="numeric"
                              placeholder={selectedPkg ? `${selectedPkg.prices.cwb}` : "0"}
                              value={activePackage?.manualPrices.cwb === 0 ? "" : activePackage?.manualPrices.cwb}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                updatePackage(activePackageIdx, { 
                                  manualPrices: { ...activePackage!.manualPrices, cwb: val === "" ? 0 : parseInt(val) }
                                });
                              }}
                              className="bg-white h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">CWOB (RM)</Label>
                            <Input 
                              type="text"
                              inputMode="numeric"
                              placeholder={selectedPkg ? `${selectedPkg.prices.cwob}` : "0"}
                              value={activePackage?.manualPrices.cwob === 0 ? "" : activePackage?.manualPrices.cwob}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                updatePackage(activePackageIdx, { 
                                  manualPrices: { ...activePackage!.manualPrices, cwob: val === "" ? 0 : parseInt(val) }
                                });
                              }}
                              className="bg-white h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Infant (RM)</Label>
                            <Input 
                              type="text"
                              inputMode="numeric"
                              placeholder={selectedPkg ? `${selectedPkg.prices.infant}` : "0"}
                              value={activePackage?.manualPrices.infant === 0 ? "" : activePackage?.manualPrices.infant}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                updatePackage(activePackageIdx, { 
                                  manualPrices: { ...activePackage!.manualPrices, infant: val === "" ? 0 : parseInt(val) }
                                });
                              }}
                              className="bg-white h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            id="enableVisaManual"
                            checked={activePackage?.visaManual.enabled || false}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              updatePackage(activePackageIdx, { 
                                visaManual: { 
                                  enabled,
                                  entries: enabled && activePackage!.visaManual.entries.length === 0 
                                    ? [{ country: "Malaysia", price: 0, pax: 0 }]
                                    : activePackage!.visaManual.entries
                                }
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="enableVisaManual" className="text-xs font-semibold cursor-pointer">
                            Visa Manual (Pelbagai Warganegara)
                          </Label>
                        </div>
                        {activePackage?.visaManual.enabled && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newEntries = [...(activePackage?.visaManual.entries || []), { country: "", price: 0, pax: 0 }];
                              updatePackage(activePackageIdx, { visaManual: { ...activePackage!.visaManual, entries: newEntries } });
                            }}
                            className="h-7 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Tambah Negara
                          </Button>
                        )}
                      </div>
                      
                      {activePackage?.visaManual.enabled && (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-3 border border-blue-200">
                          <p className="text-xs text-blue-700">Masukkan harga visa mengikut warganegara:</p>
                          {(activePackage?.visaManual.entries || []).map((entry, entryIdx) => (
                            <div key={entryIdx} className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Warganegara</Label>
                                <Select 
                                  value={entry.country} 
                                  onValueChange={(val) => {
                                    const newEntries = [...activePackage!.visaManual.entries];
                                    newEntries[entryIdx] = { ...newEntries[entryIdx], country: val };
                                    updatePackage(activePackageIdx, { visaManual: { ...activePackage!.visaManual, entries: newEntries } });
                                  }}
                                >
                                  <SelectTrigger className="bg-white h-8 text-sm">
                                    <SelectValue placeholder="Pilih negara" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                                    <SelectItem value="Singapore">Singapore</SelectItem>
                                    <SelectItem value="Brunei">Brunei</SelectItem>
                                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                                    <SelectItem value="Thailand">Thailand</SelectItem>
                                    <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Harga (RM)</Label>
                                <Input 
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={entry.price === 0 ? "" : entry.price}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const newEntries = [...activePackage!.visaManual.entries];
                                    newEntries[entryIdx] = { ...newEntries[entryIdx], price: val === "" ? 0 : parseInt(val) };
                                    updatePackage(activePackageIdx, { visaManual: { ...activePackage!.visaManual, entries: newEntries } });
                                  }}
                                  className="bg-white h-8 text-sm"
                                />
                              </div>
                              <div className="w-16 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Pax</Label>
                                <Input 
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={entry.pax === 0 ? "" : entry.pax}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const newEntries = [...activePackage!.visaManual.entries];
                                    newEntries[entryIdx] = { ...newEntries[entryIdx], pax: val === "" ? 0 : parseInt(val) };
                                    updatePackage(activePackageIdx, { visaManual: { ...activePackage!.visaManual, entries: newEntries } });
                                  }}
                                  className="bg-white h-8 text-sm"
                                />
                              </div>
                              {activePackage.visaManual.entries.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newEntries = activePackage!.visaManual.entries.filter((_, i) => i !== entryIdx);
                                    updatePackage(activePackageIdx, { visaManual: { ...activePackage!.visaManual, entries: newEntries } });
                                  }}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {(activePackage?.visaManual.entries || []).length > 0 && (
                            <div className="pt-2 border-t border-blue-200">
                              <p className="text-xs font-semibold text-blue-800">
                                Jumlah Visa: RM {activePackage.visaManual.entries.reduce((sum, e) => sum + (e.price * e.pax), 0).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Tempat Optional</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPlaces = [...(activePackage?.optionalPlaces || []), { name: "", price: 0, pax: 0 }];
                          updatePackage(activePackageIdx, { optionalPlaces: newPlaces });
                        }}
                        className="h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Tambah
                      </Button>
                    </div>
                    
                    {(activePackage?.optionalPlaces || []).length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-3 space-y-2 border border-purple-200">
                        <p className="text-xs text-purple-700">Senarai tempat/aktiviti optional:</p>
                        {(activePackage?.optionalPlaces || []).map((place, placeIdx) => (
                          <div key={placeIdx} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Nama Tempat</Label>
                              <Input 
                                type="text"
                                placeholder="Cth: Ski Dubai"
                                value={place.name}
                                onChange={(e) => {
                                  const newPlaces = [...activePackage!.optionalPlaces];
                                  newPlaces[placeIdx] = { ...newPlaces[placeIdx], name: e.target.value };
                                  updatePackage(activePackageIdx, { optionalPlaces: newPlaces });
                                }}
                                className="bg-white h-8 text-sm"
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Harga</Label>
                              <Input 
                                type="text"
                                inputMode="numeric"
                                placeholder="RM"
                                value={place.price === 0 ? "" : place.price}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  const newPlaces = [...activePackage!.optionalPlaces];
                                  newPlaces[placeIdx] = { ...newPlaces[placeIdx], price: val === "" ? 0 : parseInt(val) };
                                  updatePackage(activePackageIdx, { optionalPlaces: newPlaces });
                                }}
                                className="bg-white h-8 text-sm"
                              />
                            </div>
                            <div className="w-16 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Pax</Label>
                              <Input 
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={place.pax === 0 ? "" : place.pax}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  const newPlaces = [...activePackage!.optionalPlaces];
                                  newPlaces[placeIdx] = { ...newPlaces[placeIdx], pax: val === "" ? 0 : parseInt(val) };
                                  updatePackage(activePackageIdx, { optionalPlaces: newPlaces });
                                }}
                                className="bg-white h-8 text-sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPlaces = activePackage!.optionalPlaces.filter((_, i) => i !== placeIdx);
                                updatePackage(activePackageIdx, { optionalPlaces: newPlaces });
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                        <Label className="text-xs font-semibold">Diskaun (Gabungan)</Label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Select value={discount.mode} onValueChange={(val) => setDiscount({...discount, mode: val})}>
                            <SelectTrigger className="bg-white h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tiada</SelectItem>
                              <SelectItem value="per_pax_rm">RM (Setiap Pax)</SelectItem>
                              <SelectItem value="total_rm">RM (Jumlah)</SelectItem>
                              <SelectItem value="percent_total">% (Jumlah)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            type="text"
                            inputMode="decimal"
                            placeholder="Nilai" 
                            value={discount.value === 0 ? "" : discount.value} 
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d.]/g, '');
                              setDiscount({...discount, value: val === "" ? 0 : parseFloat(val) || 0});
                            }}
                            className="bg-white h-9"
                          />
                        </div>
                        {discount.mode === "per_pax_rm" && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={discount.applyInfant} 
                              onChange={(e) => setDiscount({...discount, applyInfant: e.target.checked})}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-slate-600">Termasuk Infant dalam diskaun</span>
                          </label>
                        )}
                      </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-5">
        <div className="sticky top-6 space-y-6">
          <Card className="bg-primary text-primary-foreground shadow-2xl overflow-hidden border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" /> Ringkasan Harga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-black">
                RM {grandTotal.total.toLocaleString()}
              </div>
              <div className="text-xs opacity-80 font-medium">
                {packages.length > 1 ? `${packages.length} pakej dipilih` : "Sebut harga dijana berdasarkan pilihan semasa."}
              </div>
              
              <div className="space-y-2 text-sm bg-white/10 p-4 rounded-xl backdrop-blur-sm max-h-[250px] overflow-y-auto">
                {packages.map((pkg, idx) => {
                  const pkgData = data[pkg.pkgKey];
                  const calc = calculatePackage(pkg);
                  if (!pkgData || !calc) return null;
                  
                  return (
                    <div key={pkg.id} className="border-b border-white/20 pb-2 last:border-0">
                      <div className="flex justify-between">
                        <span className="truncate max-w-[150px] text-xs">{pkgData.name.split(' ').slice(0, 3).join(' ')}</span>
                        <span className="font-bold text-xs">RM{calc.total.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button 
                disabled={packages.every(p => !p.pkgKey)}
                onClick={handleGenerateQuotation}
                className="w-full bg-white text-primary hover:bg-white/90 font-black h-12 shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Jana Sebut Harga
              </Button>

              {showQuotation && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={handleReset}
                      className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 font-bold h-10"
                    >
                      Reset
                    </Button>
                    
                    <textarea 
                      ref={textAreaRef}
                      readOnly
                      value={quotationText}
                      onClick={selectAllText}
                      className="w-full bg-white text-gray-800 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner border border-gray-100 resize-none min-h-[300px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    
                      <div className="flex gap-2">
                        <Button 
                          onClick={selectAllText}
                          variant="outline"
                          className="flex-1 bg-transparent border-white/30 text-white hover:bg-white/10 font-bold h-12"
                        >
                          Pilih
                        </Button>
                        <Button 
                          onClick={copyToClipboard}
                          className={`flex-1 font-black h-12 shadow-lg ${copied ? 'bg-green-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white`}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>

                      <Button 
                        onClick={handleDownloadPDF}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black h-12 shadow-lg"
                      >
                        <FileDown className="w-4 h-4 mr-2" /> Muat Turun PDF
                      </Button>
                  </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
