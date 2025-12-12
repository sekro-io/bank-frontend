"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TopNav from "../components/TopNav";

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[Dashboard] loading:", loading, "auth:", isAuthenticated);

    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
    <TopNav />
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sekro Bank</h1>
            <p className="text-slate-400 mt-1">
              Welcome to your personal banking dashboard
            </p>
          </div>
        </div>

        {/* Account Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">Checking Account</p>
            <p className="text-2xl font-semibold mt-2">$12,450.32</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">Savings Account</p>
            <p className="text-2xl font-semibold mt-2">$38,920.10</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">Credit Balance</p>
            <p className="text-2xl font-semibold mt-2">$-1,250.00</p>
          </div>

        </section>

        {/* Actions */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              className="bg-brand-aqua text-slate-950 font-semibold px-6 py-3 rounded-lg hover:bg-brand-purple transition"
              onClick={() => alert("Loan application coming soon")}
            >
              Apply for a Loan
            </button>

            <button
              className="bg-slate-800 text-slate-300 px-6 py-3 rounded-lg hover:bg-slate-700 transition"
              disabled
            >
              Transfer Funds (Coming Soon)
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

          <p className="text-slate-400 text-sm">
            No recent transactions to display.
          </p>
        </section>

      </div>
    </main>
    </>
  );
}
