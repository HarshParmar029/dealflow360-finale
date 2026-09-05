"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Customer { id: string; name: string; tier: string }
interface Product { id: string; name: string; price: number; category: string }
interface Line { productId: string; name: string; qty: number; discountPct: number; unitPrice: number }

export default function CreateQuotationPage() {
  const { status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
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

  const addLine = () => {
    const product = products.find((item) => item.id === selectedProduct);
    if (!product || qty < 1) return;
    setLines((current) => [...current, { productId: product.id, name: product.name, qty, discountPct, unitPrice: product.price }]);
    setSelectedProduct(""); setQty(1); setDiscountPct(0);
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push("/workspace")} className="text-sm text-blue-600 mb-4">← Back to Workspace</button>
        <h1 className="text-2xl font-bold mb-6">Create Quotation</h1>
        <div className="bg-white p-5 rounded-xl border mb-4">
          <label className="block text-sm font-medium mb-2">Customer</label>
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full border rounded-lg px-3 py-2"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.tier})</option>)}</select>
        </div>
        <div className="bg-white p-5 rounded-xl border mb-4">
          <label className="block text-sm font-medium mb-2">Add Product</label>
          <div className="flex gap-3 mb-3">
            <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="flex-1 border rounded-lg px-3 py-2"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · ₹{product.price.toLocaleString()}</option>)}</select>
            <input type="number" value={qty} onChange={(event) => setQty(Number(event.target.value))} min={1} className="w-20 border rounded-lg px-3 py-2" aria-label="Quantity" />
            <input type="number" value={discountPct} onChange={(event) => setDiscountPct(Number(event.target.value))} min={0} max={100} className="w-24 border rounded-lg px-3 py-2" aria-label="Discount percentage" />
            <button onClick={addLine} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Add</button>
          </div>
          {lines.length > 0 && <div className="mt-4 space-y-2">{lines.map((line, index) => <div key={`${line.productId}-${index}`} className="flex justify-between text-sm bg-slate-50 p-2 rounded"><span>{line.name} × {line.qty} ({line.discountPct}% off)</span><button onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="text-red-500">Remove</button></div>)}</div>}
        </div>
        {message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{message}</div>}
        <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50">{loading ? "Creating..." : "Create Quotation"}</button>
      </div>
    </div>
  );
}
