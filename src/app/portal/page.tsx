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
  lines: any[];
}

export default function PortalListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [status]);

  const fetchQuotations = async () => {
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      if (res.ok) {
        setQuotations(data.quotations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-6">Your Quotations</h2>

        {quotations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <p className="text-slate-500">No quotations yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotations.map((q) => (
              <div
                key={q.id}
                onClick={() => router.push(`/portal/${q.id}`)}
                className="bg-white border rounded-xl p-5 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      Quotation #{q.id.slice(-6).toUpperCase()}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(q.createdAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {q.lines?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      ₹{q.totalAmount.toLocaleString()}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${
                        q.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : q.status === "UNDER_NEGOTIATION"
                          ? "bg-purple-100 text-purple-700"
                          : q.status === "PENDING_MANAGER"
                          ? "bg-amber-100 text-amber-700"
                          : q.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-700"
                          : q.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {q.status.replace(/_/g, " ")}
                    </span>
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