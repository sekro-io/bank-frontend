"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import Spinner from "../components/Spinner";
import { formatCurrency, parseCurrency } from "@/utils/money";
import { formatLocalDateTime, formatLocalDate } from "@/utils/time";


type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};


export default function DashboardPage() {
  const { isAuthenticated, loading, token } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- Auth guard ---
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);
  
  // --- Fetch data ---
  useEffect(() => {
    if (!loading && isAuthenticated && token) {
      fetchUser();      
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, token]);

  async function fetchUser() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) setUser(data.user);
  }

  async function handleStartProcess() {
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      console.log("URL is "+ `${process.env.NEXT_PUBLIC_START_DEMO_URL}`);
      const res = await fetch(`${process.env.NEXT_PUBLIC_START_DEMO_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitResult({ success: true, message: data.message ?? "Process started successfully!" });
        setName("");
      } else {
        setSubmitResult({ success: false, message: data.message ?? "Something went wrong. Please try again." });
      }
    } catch (err) {
      setSubmitResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Checking session…
      </div>
    );
  }

  if (!token) return null;

  return (
    <>
      <TopNav />

      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              Welcome back{user ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-slate-400 mt-1">Let's start a process in Orkes!</p>
          </div>

          {/* Process Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md">
            <h2 className="text-lg font-semibold mb-4">Start a Process</h2>

            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartProcess()}
                placeholder="Enter a name"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-50 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {submitResult && (
              <p className={`text-sm mb-4 ${submitResult.success ? "text-emerald-400" : "text-red-400"}`}>
                {submitResult.message}
              </p>
            )}

            <button
              onClick={handleStartProcess}
              disabled={isSubmitting || !name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 px-4 rounded-lg transition"
            >
              {isSubmitting ? <Spinner /> : "Start Process"}
            </button>
          </div>
        </div>
      </main>      
    </>
  );
}