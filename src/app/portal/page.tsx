"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppHeader from "@/components/AppHeader";

interface Quotation {
  id: string;
  status: string;
  totalAmount: number;
  blendedRiskScore: number;
  createdAt: string;
  lines: unknown[];
}

const statusStyles: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  UNDER_NEGOTIATION: "bg-purple-100 text-purple-700",
  PENDING_MANAGER: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
};

export default function CustomerPortalListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQuotations = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/quotations");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load quotations");
      setQuotations(data.quotations || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "CUSTOMER") {
        router.push("/workspace");
        return;
      }
      fetchQuotations();
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Loading your quotations...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Your Quotations</h2>
            <p className="text-sm text-slate-500 mt-1">Review offers and open any quotation for negotiation.</p>
          </div>
          <button onClick={fetchQuotations} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>}
        {quotations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border"><p className="text-slate-500">No quotations available yet</p></div>
        ) : (
          <div className="space-y-4">
            {quotations.map((quotation) => (
              <button key={quotation.id} onClick={() => router.push(`/portal/${quotation.id}`)} className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition cursor-pointer">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">Quotation #{quotation.id.slice(-6).toUpperCase()}</h3>
                    <p className="text-sm text-slate-500 mt-1">{new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-slate-400 mt-1">{quotation.lines.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">₹{quotation.totalAmount.toLocaleString()}</p>
                    <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${statusStyles[quotation.status] || "bg-slate-100 text-slate-600"}`}>{quotation.status.replace(/_/g, " ")}</span>
                    {quotation.blendedRiskScore > 0 && <p className="text-xs text-amber-600 mt-1">Risk: {quotation.blendedRiskScore}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
