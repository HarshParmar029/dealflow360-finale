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
  lines: { product: { name: string }; qty: number; discountPct: number; lineTotal: number }[];
  comments?: { message: string; counterPct: number | null }[];
}

export default function CustomerPortalDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [counterPct, setCounterPct] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/quotations/${id}`);
      const data = await response.json();
      if (response.ok) setQuotation(data.quotation);
      else setMessage(data.error || "Could not load quotation");
    } catch { setMessage("Something went wrong"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if (status === "authenticated" && id) fetchQuotation();
    }
  }, [status, id, router]);

  const handleCounter = async () => {
    if (counterPct <= 0) { setMessage("Please enter a discount percentage greater than 0"); return; }
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/quotations/${id}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterPct, message: `Customer requested additional ${counterPct}% discount` }),
      });
      const data = await response.json();
      if (response.ok) { setMessage("Counter-offer submitted successfully!"); setCounterPct(0); await fetchQuotation(); }
      else setMessage(data.error || "Failed to submit counter-offer");
    } catch { setMessage("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  const handleConfirm = async () => {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/quotations/${id}/confirm`, { method: "POST" });
      const data = await response.json();
      if (response.ok) { setMessage("Quotation confirmed successfully!"); await fetchQuotation(); }
      else setMessage(data.error || "Failed to confirm");
    } catch { setMessage("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading your quotation...</div>;
  if (!quotation) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><p className="text-slate-500 mb-4">Quotation not found</p><button onClick={() => router.push("/portal")} className="text-blue-600">Back to Portal</button></div></div>;

  const statusColors: Record<string, string> = { APPROVED: "bg-green-100 text-green-700", PENDING_MANAGER: "bg-amber-100 text-amber-700", CONFIRMED: "bg-blue-100 text-blue-700", REJECTED: "bg-red-100 text-red-700", UNDER_NEGOTIATION: "bg-purple-100 text-purple-700" };
  const canCounter = !["REJECTED", "CONFIRMED"].includes(quotation.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.push("/portal")} className="text-sm text-blue-600 mb-4">Back to all quotations</button>
        <section className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex justify-between items-start gap-4 mb-4"><div><h2 className="text-lg font-semibold">{quotation.customer.name}</h2><p className="text-sm text-slate-500">{quotation.customer.tier} Tier</p><p className="text-xs text-slate-400 mt-1">{new Date(quotation.createdAt).toLocaleString()}</p></div><div className="text-right"><span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[quotation.status] || "bg-slate-100 text-slate-600"}`}>{quotation.status.replace(/_/g, " ")}</span>{quotation.blendedRiskScore > 0 && <p className="text-sm text-amber-600 mt-2">Risk: {quotation.blendedRiskScore}</p>}</div></div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 mb-4">{quotation.lines.map((line, index) => <div key={`${line.product.name}-${index}`} className="flex justify-between text-sm"><span>{line.product.name} x {line.qty}{line.discountPct > 0 && <span className="text-red-500 ml-2">({line.discountPct}% off)</span>}</span><span className="font-medium">₹{line.lineTotal.toLocaleString()}</span></div>)}</div>
          <div className="flex justify-between items-center pt-3 border-t"><span className="text-slate-500">Total Amount</span><span className="text-2xl font-bold">₹{quotation.totalAmount.toLocaleString()}</span></div>
        </section>
        {canCounter && <section className="bg-white rounded-2xl border p-6"><h3 className="font-semibold mb-2">Request a Better Discount</h3><p className="text-sm text-slate-500 mb-4">Propose a discount percentage for review by the sales team.</p><div className="flex gap-3"><input type="number" value={counterPct || ""} onChange={(event) => setCounterPct(Number(event.target.value))} min={1} max={50} placeholder="e.g. 15" className="flex-1 border rounded-lg px-3 py-2.5" /><button onClick={handleCounter} disabled={submitting || counterPct <= 0} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">{submitting ? "Submitting..." : "Submit Counter-Offer"}</button></div></section>}
        {quotation.status === "APPROVED" && <section className="bg-white rounded-2xl border p-6 mt-4"><h3 className="font-semibold mb-2">Confirm Quotation</h3><p className="text-sm text-slate-500 mb-4">Happy with the terms? Confirm to proceed.</p><button onClick={handleConfirm} disabled={submitting} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">{submitting ? "Confirming..." : "Confirm Quotation"}</button></section>}
        {quotation.comments?.length ? <section className="bg-white rounded-2xl border p-6 mt-6"><h3 className="font-semibold mb-3">Negotiation History</h3>{quotation.comments.map((comment, index) => <p key={index} className="text-sm text-slate-600 py-1">{comment.message}</p>)}</section> : null}
        {message && <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">{message}</div>}
      </main>
    </div>
  );
}
