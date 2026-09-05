"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface Quotation {
  id: string;
  status: string;
  totalAmount: number;
  blendedRiskScore: number;
  createdAt: string;
  customer: { name: string; tier: string };
  lines: { product: { name: string }; qty: number; discountPct: number; lineTotal: number; unitPrice: number }[];
  comments?: { authorRole: string; message: string; counterPct: number | null }[];
}

export default function CustomerPortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [counterPct, setCounterPct] = useState(0);
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMyQuotations = async () => {
    try {
      const response = await fetch("/api/quotations");
      const data = await response.json();
      if (response.ok) setQuotations(data.quotations || []);
      else setMessage(data.error || "Could not load quotations");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (session?.user?.role !== "CUSTOMER") { router.push("/workspace"); return; }
      fetchMyQuotations();
    }
  }, [status, session, router]);

  const submitCounter = async () => {
    if (!selected || counterPct <= 0) return;
    setActionLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/quotations/${selected.id}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Customer requesting additional ${counterPct}% discount`, counterPct }),
      });
      const data = await response.json();
      if (response.ok) { setMessage("Counter offer submitted successfully! Waiting for review."); setSelected(null); setCounterPct(0); fetchMyQuotations(); }
      else setMessage(data.error || "Failed to submit");
    } catch { setMessage("Something went wrong"); }
    finally { setActionLoading(false); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between"><div><h1 className="text-xl font-bold">DealFlow<span className="text-blue-600">360</span> Portal</h1><p className="text-sm text-slate-500">Welcome, {session?.user?.name}</p></div><button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-slate-600 hover:text-slate-900">Logout</button></div></header>
      <main className="max-w-5xl mx-auto px-4 py-8"><h2 className="text-2xl font-semibold mb-6">Your Quotations</h2>{message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{message}</div>}
        {quotations.length === 0 ? <div className="text-center py-16 bg-white rounded-xl border"><p className="text-slate-500">No quotations available yet</p></div> : <div className="space-y-4">{quotations.map((quotation) => <button key={quotation.id} onClick={() => setSelected(quotation)} className="w-full text-left bg-white border rounded-xl p-5 hover:shadow-md transition"><div className="flex justify-between items-start"><div><h3 className="font-semibold text-lg">Quotation #{quotation.id.slice(-6)}</h3><p className="text-sm text-slate-500 mt-1">{new Date(quotation.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="text-xl font-bold">₹{quotation.totalAmount.toLocaleString()}</p><span className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${quotation.status === "APPROVED" ? "bg-green-100 text-green-700" : quotation.status === "UNDER_NEGOTIATION" ? "bg-purple-100 text-purple-700" : quotation.status === "PENDING_MANAGER" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{quotation.status}</span></div></div></button>)}</div>}
      </main>
      {selected && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold">Quotation Details</h3><button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close">X</button></div><div className="space-y-3 mb-6">{selected.lines.map((line, index) => <div key={`${line.product.name}-${index}`} className="flex justify-between text-sm border-b pb-2"><span>{line.product.name} x {line.qty}</span><span>{line.discountPct > 0 && <span className="text-red-500 mr-2">{line.discountPct}% off</span>}₹{line.lineTotal.toLocaleString()}</span></div>)}</div><div className="bg-slate-50 rounded-lg p-4 mb-4"><p className="text-sm text-slate-600 mb-1">Current Total</p><p className="text-2xl font-bold">₹{selected.totalAmount.toLocaleString()}</p></div>{selected.comments?.length ? <div className="mb-4 text-sm text-slate-600"><p className="font-medium mb-1">Negotiation history</p>{selected.comments.map((comment, index) => <p key={index}>{comment.message}</p>)}</div> : null}{["APPROVED", "PENDING_MANAGER", "UNDER_NEGOTIATION"].includes(selected.status) && <div className="border-t pt-4"><label className="block text-sm font-medium mb-2" htmlFor="counterPct">Request additional discount (%)</label><input id="counterPct" type="number" min={1} max={30} value={counterPct} onChange={(event) => setCounterPct(Number(event.target.value))} className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="e.g. 5" /><button onClick={submitCounter} disabled={actionLoading || counterPct <= 0} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">{actionLoading ? "Submitting..." : "Submit Counter Offer"}</button></div>}</div></div>}
    </div>
  );
}
