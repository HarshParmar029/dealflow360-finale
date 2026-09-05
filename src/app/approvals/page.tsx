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
  customer: { name: string; tier: string };
  rep: { name: string };
  lines: { product: { name: string }; qty: number; discountPct: number; lineTotal: number }[];
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchPending = async () => {
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      if (res.ok) {
        setPending((data.quotations || []).filter((quotation: Quotation) => quotation.status === "PENDING_MANAGER"));
      } else {
        setMessage(data.error || "Failed to load approvals");
      }
    } catch {
      setMessage("Something went wrong");
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
      if (!["MANAGER", "ADMIN"].includes(session?.user?.role || "")) {
        router.push("/workspace");
        return;
      }
      fetchPending();
    }
  }, [status, session, router]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "RETURN") => {
    setActionLoading(id);
    setMessage("");
    try {
      const res = await fetch(`/api/quotations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "APPROVE" ? "Looks good" : "Needs revision" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Quotation ${action.toLowerCase()}d successfully`);
        setPending((current) => current.filter((quotation) => quotation.id !== id));
      } else {
        setMessage(data.error || "Action failed");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Loading approvals...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-2">Pending Approvals</h2>
        <p className="text-slate-500 mb-6">Quotations that exceeded discount limits and need your decision</p>
        {message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{message}</div>}
        {pending.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border"><p className="text-slate-500 text-lg">No pending approvals</p><p className="text-sm text-slate-400 mt-2">All clear for now</p></div>
        ) : (
          <div className="space-y-4">
            {pending.map((quotation) => (
              <div key={quotation.id} className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div><h3 className="text-lg font-semibold">{quotation.customer.name}</h3><p className="text-sm text-slate-500">{quotation.customer.tier} tier - Rep: {quotation.rep.name}</p><p className="text-xs text-slate-400 mt-1">{new Date(quotation.createdAt).toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-xl font-bold">₹{quotation.totalAmount.toLocaleString()}</p><p className="text-sm font-medium text-amber-600 mt-1">Risk Score: {quotation.blendedRiskScore}</p></div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 mb-4">{quotation.lines.map((line, index) => <div key={`${line.product.name}-${index}`} className="flex justify-between text-sm py-1"><span>{line.product.name} x {line.qty}</span><span className="text-slate-600">{line.discountPct}% off - ₹{line.lineTotal.toLocaleString()}</span></div>)}</div>
                <div className="flex gap-3">
                  <button onClick={() => handleAction(quotation.id, "APPROVE")} disabled={actionLoading === quotation.id} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">{actionLoading === quotation.id ? "..." : "Approve"}</button>
                  <button onClick={() => handleAction(quotation.id, "RETURN")} disabled={actionLoading === quotation.id} className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50">Return</button>
                  <button onClick={() => handleAction(quotation.id, "REJECT")} disabled={actionLoading === quotation.id} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
