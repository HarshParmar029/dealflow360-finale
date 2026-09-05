"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppHeader from "@/components/AppHeader";

interface Customer { id: string; name: string; tier: string }
interface Product { id: string; name: string; price: number; category: string; imageUrl?: string | null }
interface Line { productId: string; name: string; qty: number; discountPct: number; unitPrice: number }
interface UpsellSuggestion { productId: string; name: string; price: number; margin: number; promoted: boolean }

const CATEGORY_LABELS: Record<string, string> = {
  HARDWARE: "Hardware",
  SERVICE: "Services",
  SUBSCRIPTION: "Subscriptions",
};

export default function CreateQuotationPage() {
  const { status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [discountMap, setDiscountMap] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    Promise.all([fetch("/api/customers"), fetch("/api/products")])
      .then(async ([customerRes, productRes]) => {
        const customerData = await customerRes.json();
        const productData = await productRes.json();
        if (!customerRes.ok || !productRes.ok) throw new Error("Could not load catalog");
        setCustomers(customerData.customers);
        setProducts(productData.products);
      })
      .catch(() => setMessage("Could not load customers and products"))
      .finally(() => setLoadingData(false));
  }, [status, router]);

  const handleProductSelect = async (productId: string) => {
    if (!productId) { setUpsellSuggestions([]); return; }
    try {
      const response = await fetch(`/api/upsell?productId=${productId}`);
      const data = await response.json();
      if (response.ok) setUpsellSuggestions(data.suggestions || []);
    } catch {
      setUpsellSuggestions([]);
    }
  };

  const addLine = (product: Product) => {
    void handleProductSelect(product.id);
    const qty = qtyMap[product.id] || 1;
    const discountPct = discountMap[product.id] || 0;
    setLines((current) => [...current, { productId: product.id, name: product.name, qty, discountPct, unitPrice: product.price }]);
    setQtyMap((current) => ({ ...current, [product.id]: 1 }));
    setDiscountMap((current) => ({ ...current, [product.id]: 0 }));
  };

  const handleSubmit = async () => {
    if (!customerId || lines.length === 0) { setMessage("Customer and at least one product required"); return; }
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, lines: lines.map(({ productId, qty: lineQty, discountPct: lineDiscount }) => ({ productId, qty: lineQty, discountPct: lineDiscount })) }) });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Failed to create quotation"); return; }
      setMessage(`Success! Status: ${data.quotation.status} | Risk: ${data.risk.blendedRiskScore}`);
      setTimeout(() => router.push("/workspace"), 1200);
    } catch { setMessage("Error creating quotation"); }
    finally { setLoading(false); }
  };

  if (status === "loading" || loadingData) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Loading catalog...</div>;

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    acc[product.category] = acc[product.category] || [];
    acc[product.category].push(product);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <AppHeader />
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push("/workspace")} className="text-sm text-blue-600 mb-4">Back to Workspace</button>
        <h1 className="text-2xl font-bold mb-6 text-slate-900">Create Quotation</h1>

        <div className="bg-white p-5 rounded-xl border mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-700">Customer</label>
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full border rounded-lg px-3 py-2 text-slate-900">
            <option value="">Select customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.tier})</option>)}
          </select>
        </div>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">{CATEGORY_LABELS[category] || category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((product) => (
                <div key={product.id} className="bg-white border rounded-xl overflow-hidden flex flex-col">
                  <div className="h-36 bg-slate-100">
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No image</div>}
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    <p className="text-blue-600 font-bold">₹{product.price.toLocaleString()}</p>
                    <div className="flex gap-2 mt-auto">
                      <input type="number" min={1} value={qtyMap[product.id] ?? 1} onChange={(event) => setQtyMap((current) => ({ ...current, [product.id]: Number(event.target.value) }))} className="w-16 border rounded-lg px-2 py-1 text-sm text-slate-900" aria-label="Quantity" />
                      <input type="number" min={0} max={100} value={discountMap[product.id] ?? 0} onChange={(event) => setDiscountMap((current) => ({ ...current, [product.id]: Number(event.target.value) }))} className="w-20 border rounded-lg px-2 py-1 text-sm text-slate-900" aria-label="Discount percentage" />
                      <button onClick={() => addLine(product)} className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-2 py-1 hover:bg-slate-700">Add</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {lines.length > 0 && <div className="bg-white p-5 rounded-xl border mb-6"><h2 className="text-lg font-semibold mb-3 text-slate-800">Cart</h2><div className="space-y-2">{lines.map((line, index) => <div key={`${line.productId}-${index}`} className="flex justify-between text-sm bg-slate-50 p-2 rounded"><span className="text-slate-800">{line.name} x {line.qty} ({line.discountPct}% off)</span><button onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="text-red-500">Remove</button></div>)}</div></div>}
        {upsellSuggestions.length > 0 && <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6"><h4 className="font-semibold text-blue-800 mb-3">Suggested Upsells</h4><div className="space-y-2">{upsellSuggestions.map((suggestion) => <div key={suggestion.productId} className="flex items-center justify-between bg-white p-3 rounded-lg"><div><p className="font-medium">{suggestion.name}</p><p className="text-sm text-slate-500">₹{suggestion.price.toLocaleString()} - Margin {suggestion.margin}% {suggestion.promoted && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Promoted</span>}</p></div><button onClick={() => setLines((current) => [...current, { productId: suggestion.productId, name: suggestion.name, qty: 1, discountPct: 0, unitPrice: suggestion.price }])} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Add</button></div>)}</div></div>}
        {message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{message}</div>}
        <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50">{loading ? "Creating..." : "Create Quotation"}</button>
      </div>
    </div>
  );
}
