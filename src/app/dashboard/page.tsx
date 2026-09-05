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
  const pendingQuotes = quotes.filter((quote) => quote.status === "PENDING_MANAGER");
  const approvedQuotes = quotes.filter((quote) => quote.status === "APPROVED");
  const rejectedQuotes = quotes.filter((quote) => quote.status === "REJECTED");

  const isManagerOrAdmin = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  const stats = [
    { label: "Total Deals", value: quotes.length, icon: "📊", color: "bg-slate-100 text-slate-800", onClick: () => router.push("/workspace") },
    { label: "Pending Approval", value: pendingQuotes.length, icon: "⏳", color: "bg-amber-100 text-amber-800", onClick: () => isManagerOrAdmin && router.push("/approvals") },
    { label: "Approved", value: approvedQuotes.length, icon: "✅", color: "bg-green-100 text-green-800", onClick: () => router.push("/workspace") },
    { label: "Rejected", value: rejectedQuotes.length, icon: "❌", color: "bg-red-100 text-red-800", onClick: () => router.push("/workspace") },
    { label: "High Risk", value: highRiskQuotes.length, icon: "⚠️", color: "bg-orange-100 text-orange-800", onClick: () => {} },
    { label: "Stalled", value: stalled.length, icon: "🐌", color: "bg-purple-100 text-purple-800", onClick: () => {} },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-2 text-slate-900">Deal Health Dashboard</h2>
        <p className="text-slate-500 mb-6">Real-time visibility into every quotation in the pipeline</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className={`rounded-xl p-4 text-left transition hover:shadow-md hover:-translate-y-0.5 ${stat.color}`}
            >
              <p className="text-xl mb-1">{stat.icon}</p>
              <p className="text-sm font-medium opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">⚠️ High Risk Quotations</h3>
            {highRiskQuotes.length === 0 ? (
              <p className="text-slate-500 text-sm">No high risk deals right now</p>
            ) : (
              <div className="space-y-3">
                {highRiskQuotes.slice(0, 5).map((quote) => (
                  <button key={quote.id} onClick={() => router.push(`/workspace/${quote.id}`)} className="w-full flex justify-between items-center p-3 bg-orange-50 rounded-lg text-left hover:bg-orange-100 transition">
                    <div>
                      <p className="font-medium text-slate-900">{quote.customer.name}</p>
                      <p className="text-sm text-slate-500">Risk: {quote.blendedRiskScore} · {quote.status.replace(/_/g, " ")}</p>
                    </div>
                    <p className="font-bold text-slate-900">₹{quote.totalAmount.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">🐌 Stalled Deals</h3>
            {stalled.length === 0 ? (
              <p className="text-slate-500 text-sm">No stalled deals — everything moving smoothly</p>
            ) : (
              <div className="space-y-3">
                {stalled.slice(0, 5).map((quote) => (
                  <button key={quote.id} onClick={() => router.push(`/workspace/${quote.id}`)} className="w-full flex justify-between items-center p-3 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition">
                    <div>
                      <p className="font-medium text-slate-900">{quote.customer.name}</p>
                      <p className="text-sm text-slate-500">{quote.status.replace(/_/g, " ")} · {new Date(quote.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-bold text-slate-900">₹{quote.totalAmount.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
