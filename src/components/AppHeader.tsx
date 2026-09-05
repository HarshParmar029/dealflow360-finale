"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (!session?.user) return null;

  const role = session.user.role;
  const active = (prefix: string) => pathname.startsWith(prefix);
  const buttonClass = (prefix: string, activeClass: string) => `px-3 py-1.5 text-sm rounded-lg ${active(prefix) ? activeClass : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <button onClick={() => router.push(role === "CUSTOMER" ? "/portal" : "/workspace")} className="text-left">
          <h1 className="text-xl font-bold text-slate-900">DealFlow<span className="text-blue-600">360</span></h1>
          <p className="text-xs text-slate-500">{session.user.name} - {role.replace("_", " ")}</p>
        </button>
        <nav className="flex items-center gap-2">
          {role !== "CUSTOMER" && <>
            <button onClick={() => router.push("/workspace")} className={buttonClass("/workspace", "bg-blue-100 text-blue-700")}>Workspace</button>
            {(role === "MANAGER" || role === "ADMIN") && <button onClick={() => router.push("/approvals")} className={buttonClass("/approvals", "bg-amber-100 text-amber-700")}>Approvals</button>}
            <button onClick={() => router.push("/dashboard")} className={buttonClass("/dashboard", "bg-purple-100 text-purple-700")}>Dashboard</button>
          </>}
          {role === "CUSTOMER" && <button onClick={() => router.push("/portal")} className={buttonClass("/portal", "bg-blue-100 text-blue-700")}>My Quotations</button>}
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Logout</button>
        </nav>
      </div>
    </header>
  );
}
