"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppHeader from "@/components/AppHeader";

interface Quotation {
  id: string;
  status: string;
  totalAmount: number;
  blendedRiskScore: number;
  createdAt: string;
  customer: { name: string; tier: string };
  rep: { name: string };
  lines: { product: { name: string }; qty: number; unitPrice: number; discountPct: number; lineTotal: number }[];
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated" || !id) return;

    fetch("/api/quotations")
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          setQuotation((data.quotations || []).find((item: Quotation) => item.id === id) || null);
        }
      })
      .catch(() => setQuotation(null))
      .finally(() => setLoading(false));
  }, [status, id, router]);

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!quotation) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><p className="text-slate-500 mb-4">Quotation not found</p><button onClick={() => router.push("/workspace")} className="text-blue-600">Back to Workspace</button></div></div>;
  }

  const statusClass = quotation.status === "APPROVED" ? "bg-green-100 text-green-700" : quotation.status === "PENDING_MANAGER" ? "bg-amber-100 text-amber-700" : quotation.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600";

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border p-6 mb-6 flex justify-between items-start gap-4"><div><h2 className="text-2xl font-bold">{quotation.customer.name}</h2><p className="text-slate-500 mt-1">{quotation.customer.tier} Tier · Rep: {quotation.rep.name}</p><p className="text-sm text-slate-400 mt-1">{new Date(quotation.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="text-2xl font-bold">₹{quotation.totalAmount.toLocaleString()}</p><span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>{quotation.status}</span>{quotation.blendedRiskScore > 0 && <p className="text-sm text-amber-600 mt-2 font-medium">Risk Score: {quotation.blendedRiskScore}</p>}</div></div>
        <div className="bg-white rounded-xl border p-6 mb-6"><h3 className="font-semibold mb-4">Line Items</h3><div className="space-y-3">{quotation.lines.map((line, index) => <div key={`${line.product.name}-${index}`} className="flex justify-between items-center py-3 border-b last:border-0"><div><p className="font-medium">{line.product.name}</p><p className="text-sm text-slate-500">Qty: {line.qty} × ₹{line.unitPrice.toLocaleString()}</p></div><div className="text-right"><p className="font-medium">₹{line.lineTotal.toLocaleString()}</p>{line.discountPct > 0 && <p className="text-sm text-red-500">{line.discountPct}% discount</p>}</div></div>)}</div></div>
        {quotation.blendedRiskScore > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-5"><h3 className="font-semibold text-amber-800 mb-2">Blended Risk Score: {quotation.blendedRiskScore}</h3><p className="text-sm text-amber-700">This quotation exceeded category discount limits and required manager approval.</p></div>}
      </main>
    </div>
  );
}
