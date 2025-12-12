"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function TopNav() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-brand-pink flex items-center justify-center text-slate-900 font-bold">
            SB
          </div>
          <span className="text-lg font-semibold text-slate-100">
            Sekro Bank
          </span>
        </Link>

        {/* Actions */}
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="rounded-full border border-slate-700 px-4 py-1.5 text-sm hover:bg-slate-800 transition"
        >
          Log out
        </button>
      </div>
    </header>
  );
}