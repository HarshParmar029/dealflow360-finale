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
  lines: { product: { name: string; category: string }; qty: number; unitPrice: number; discountPct: number; lineTotal: number }[];
}

interface SplitLine {
  productName: string;
  requestedQty: number;
  allocations: { warehouseName: string; qty: number }[];
  backorderQty: number;
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [split, setSplit] = useState<SplitLine[] | null>(null);

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
          const found = (data.quotations || []).find((item: Quotation) => item.id === id) || null;
          setQuotation(found);
          if (found && (found.status === "APPROVED" || found.status === "CONFIRMED")) {
            const splitRes = await fetch(`/api/quotations/${id}/warehouse-split`);
            const splitData = await splitRes.json();
            if (splitRes.ok) setSplit(splitData.split);
          }
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

  const oneTimeLines = quotation.lines.filter((line) => line.product.category !== "SUBSCRIPTION");
  const recurringLines = quotation.lines.filter((line) => line.product.category === "SUBSCRIPTION");
  const oneTimeTotal = oneTimeLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const recurringTotal = recurringLines.reduce((sum, line) => sum + line.lineTotal, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border p-6 mb-6 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold">{quotation.customer.name}</h2>
            <p className="text-slate-500 mt-1">{quotation.customer.tier} Tier - Rep: {quotation.rep.name}</p>
            <p className="text-sm text-slate-400 mt-1">{new Date(quotation.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">Rs.{quotation.totalAmount.toLocaleString()}</p>
            <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>{quotation.status.replace(/_/g, " ")}</span>
            {quotation.blendedRiskScore > 0 && <p className="text-sm text-amber-600 mt-2 font-medium">Risk Score: {quotation.blendedRiskScore}</p>}
          </div>
        </div>

        {oneTimeLines.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">One-Time Items</h3>
              <span className="text-sm font-medium text-slate-500">Rs.{oneTimeTotal.toLocaleString()}</span>
            </div>
            <div className="space-y-3">
              {oneTimeLines.map((line, index) => (
                <div key={`one-${index}`} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{line.product.name}</p>
                    <p className="text-sm text-slate-500">Qty: {line.qty} x Rs.{line.unitPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Rs.{line.lineTotal.toLocaleString()}</p>
                    {line.discountPct > 0 && <p className="text-sm text-red-500">{line.discountPct}% discount</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recurringLines.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                Recurring Subscription <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Monthly</span>
              </h3>
              <span className="text-sm font-medium text-blue-700">Rs.{recurringTotal.toLocaleString()}/mo</span>
            </div>
            <div className="space-y-3">
              {recurringLines.map((line, index) => (
                <div key={`rec-${index}`} className="flex justify-between items-center py-3 border-b border-blue-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{line.product.name}</p>
                    <p className="text-sm text-slate-500">Qty: {line.qty} x Rs.{line.unitPrice.toLocaleString()}/mo</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Rs.{line.lineTotal.toLocaleString()}/mo</p>
                    {line.discountPct > 0 && <p className="text-sm text-red-500">{line.discountPct}% discount</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-3">This amount will be billed monthly, separate from the one-time total above.</p>
          </div>
        )}

        {split && split.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">Suggested Warehouse Split</h3>
            <div className="space-y-4">
              {split.map((line, index) => (
                <div key={`split-${index}`} className="border rounded-lg p-4">
                  <p className="font-medium text-slate-900 mb-2">{line.productName} - Qty {line.requestedQty}</p>
                  <div className="space-y-1">
                    {line.allocations.map((alloc, i) => (
                      <div key={i} className="flex justify-between text-sm bg-slate-50 px-3 py-2 rounded">
                        <span className="text-slate-700">{alloc.warehouseName}</span>
                        <span className="font-medium text-slate-900">{alloc.qty} units</span>
                      </div>
                    ))}
                    {line.backorderQty > 0 && (
                      <div className="flex justify-between text-sm bg-red-50 px-3 py-2 rounded">
                        <span className="text-red-700">Backorder (insufficient stock)</span>
                        <span className="font-medium text-red-700">{line.backorderQty} units</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {quotation.blendedRiskScore > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-800 mb-2">Blended Risk Score: {quotation.blendedRiskScore}</h3>
            <p className="text-sm text-amber-700">This quotation exceeded category discount limits and required manager approval.</p>
          </div>
        )}
      </main>
    </div>
  );
}