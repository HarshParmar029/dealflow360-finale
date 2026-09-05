"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppHeader from "@/components/AppHeader";

interface Quote { id: string; status: string; totalAmount: number; blendedRiskScore: number; createdAt: string; customer: { name: string } }

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      if (!["MANAGER", "ADMIN", "SALES_REP"].includes(session?.user?.role || "")) { router.push("/workspace"); return; }
      fetch("/api/quotations")
        .then(async (response) => { if (!response.ok) throw new Error("Could not load dashboard"); const data = await response.json(); setQuotes(data.quotations || []); })
        .catch(() => setQuotes([]))
        .finally(() => setLoading(false));
    }
  }, [status, session, router]);

  if (loading || status === "loading") return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading dashboard...</div>;

  const now = Date.now();
  const stalled = quotes.filter((quote) => (now - new Date(quote.createdAt).getTime()) > 2 * 24 * 60 * 60 * 1000 && ["DRAFT", "PENDING_MANAGER", "UNDER_NEGOTIATION"].includes(quote.status));
  const highRiskQuotes = quotes.filter((quote) => quote.blendedRiskScore >= 5);
  const stats = [
    { label: "Total", value: quotes.length, color: "bg-slate-100 text-slate-800" },
    { label: "Pending", value: quotes.filter((quote) => quote.status === "PENDING_MANAGER").length, color: "bg-amber-100 text-amber-800" },
    { label: "Approved", value: quotes.filter((quote) => quote.status === "APPROVED").length, color: "bg-green-100 text-green-800" },
    { label: "Rejected", value: quotes.filter((quote) => quote.status === "REJECTED").length, color: "bg-red-100 text-red-800" },
    { label: "High Risk", value: highRiskQuotes.length, color: "bg-orange-100 text-orange-800" },
    { label: "Stalled", value: stalled.length, color: "bg-purple-100 text-purple-800" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8"><h2 className="text-2xl font-semibold mb-6">Deal Health Dashboard</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">{stats.map((stat) => <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}><p className="text-sm font-medium opacity-80">{stat.label}</p><p className="text-2xl font-bold mt-1">{stat.value}</p></div>)}</div><div className="bg-white rounded-xl border p-6"><h3 className="font-semibold text-lg mb-4">High Risk Quotations</h3>{highRiskQuotes.length === 0 ? <p className="text-slate-500">No high risk deals right now</p> : <div className="space-y-3">{highRiskQuotes.slice(0, 5).map((quote) => <button key={quote.id} onClick={() => router.push(`/workspace/${quote.id}`)} className="w-full flex justify-between items-center p-3 bg-orange-50 rounded-lg text-left hover:bg-orange-100"><div><p className="font-medium">{quote.customer.name}</p><p className="text-sm text-slate-500">Risk: {quote.blendedRiskScore} - {quote.status}</p></div><p className="font-bold">₹{quote.totalAmount.toLocaleString()}</p></button>)}</div>}</div></main>
    </div>
  );
}
