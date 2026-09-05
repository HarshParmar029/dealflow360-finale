"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALES_REP");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role }) });
      const data = await response.json();
      if (response.ok) router.push("/login?signupSuccess=true");
      else setError(data.error || "Signup failed");
    } catch { setError("Something went wrong. Please try again"); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4"><div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-xl"><h1 className="text-2xl font-bold text-white mb-1">DealFlow<span className="text-blue-500">360</span></h1><p className="text-slate-400 text-sm mb-6">Create your account</p>{error && <div className="mb-4 p-3 bg-red-500/10 text-red-400 text-sm rounded-lg">{error}</div>}<form onSubmit={handleSubmit} className="space-y-4"><div><label className="block text-sm text-slate-300 mb-1">Full Name</label><input type="text" value={name} onChange={(event) => setName(event.target.value)} required className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="Your name" /></div><div><label className="block text-sm text-slate-300 mb-1">Email address</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="you@example.com" /></div><div><label className="block text-sm text-slate-300 mb-1">Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="Minimum 6 characters" /></div><div><label className="block text-sm text-slate-300 mb-1">Account type</label><select value={role} onChange={(event) => setRole(event.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600"><option value="SALES_REP">Sales Rep</option><option value="CUSTOMER">Customer</option></select></div><button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50">{loading ? "Creating account..." : "Sign Up"}</button></form><p className="text-sm text-slate-400 mt-4 text-center">Already have an account? <a href="/login" className="text-blue-500 hover:underline">Sign in</a></p></div></div>;
}
