"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/app/components/Spinner";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If token already exists, go straight to admin dashboard
    const token = localStorage.getItem("sekro_admin_token");
    if (token) router.push("/admin");
  }, [router]);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      // ✅ Save employee token separately
      localStorage.setItem("sekro_admin_token", data.token);

      router.push("/admin");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Employee Login</h1>
        <p className="text-sm text-slate-400 mb-6">
          Sign in to the Sekro Bank employee portal.
        </p>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          className="w-full bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition flex items-center justify-center gap-2 disabled:opacity-50"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading && <Spinner />}
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <button
          className="w-full mt-4 text-sm text-slate-400 hover:text-slate-200 transition"
          onClick={() => router.push("/")}
          disabled={loading}
        >
          ← Back to Sekro Bank
        </button>
      </div>
    </main>
  );
}
