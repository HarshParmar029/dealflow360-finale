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
  rep: { name: string };
  lines: unknown[];
}

export default function WorkspacePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      if (res.ok) setQuotations(data.quotations || []);
      else setError(data.error || "Failed to load quotations");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchQuotations();
  }, [status, router]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Loading workspace...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">DealFlow<span className="text-blue-600">360</span></h1>
            <p className="text-sm text-slate-500">{session?.user?.name} ({session?.user?.role})</p>
          </div>
          <div className="flex items-center gap-3">
            {(session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN") && (
              <button onClick={() => router.push("/approvals")} className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200">Pending Approvals</button>
            )}
            <button onClick={() => router.push("/workspace/create")} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Quotation</button>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Quotations</h2>
          <button onClick={fetchQuotations} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        {quotations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500 mb-4">No quotations yet</p>
            <button onClick={() => router.push("/workspace/create")} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Create First Quotation</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {quotations.map((quotation) => (
              <div key={quotation.id} onClick={() => router.push(`/workspace/${quotation.id}`)} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{quotation.customer.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{quotation.lines.length} items · Rep: {quotation.rep.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(quotation.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">₹{quotation.totalAmount.toLocaleString()}</p>
                    <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${quotation.status === "APPROVED" ? "bg-green-100 text-green-700" : quotation.status === "PENDING_MANAGER" ? "bg-amber-100 text-amber-700" : quotation.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{quotation.status}</span>
                    {quotation.blendedRiskScore > 0 && <p className="text-xs text-amber-600 mt-1">Risk: {quotation.blendedRiskScore}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
