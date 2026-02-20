"use client";

import Link from "next/link";
import { useAuth } from "./context/AuthContext";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Top nav */}
        <header className="flex items-center justify-between mb-24">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-brand-pink flex items-center justify-center text-slate-900 font-bold">
              SI
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Sekro Industries
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <Link href="/dashboard" className="hover:underline">
                Banking
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:underline">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full border border-brand-aqua px-4 py-1.5 font-medium hover:bg-brand-aqua hover:text-slate-950 transition"
                >
                  Open an account
                </Link>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section className="max-w-3xl">
          <p className="text-brand-pink text-sm font-semibold mb-3">
            Demo platform
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-6">
            Modern digital orchestration,{" "}
            <span className="text-brand-pink">
              powered by Orkes Conductor workflows.
            </span>
          </h1>

          <p className="text-slate-300 mb-8">
            Sekro Industries is a fictional company used to demonstrate Orkes Conductor
            workflows end-to-end — including user onboarding, authentication,
            and loan approvals backed by real data flows.
          </p>

          <div className="flex flex-wrap gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-brand-aqua px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-brand-purple transition"
              >
                Banking
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded-full bg-brand-aqua px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-brand-purple transition"
                >
                  Open an account
                </Link>

                <Link
                  href="/login"
                  className="rounded-full border border-brand-aqua px-6 py-3 text-sm font-semibold hover:bg-slate-900 transition"
                >
                  Log in
                </Link>
              </>
            )}

            {/* ✅ New: Employee entry point in hero actions */}
            <Link
              href="/admin/login"
              className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold hover:bg-slate-900 transition"
            >
              Employee Portal
            </Link>
            
          </div>

          <p className="text-xs text-slate-400 mt-10 max-w-xl">
            Demo environment only. No real money is handled. Workflows are
            orchestrated using Orkes Conductor with AWS Lambda, API Gateway,
            and PostgreSQL.
          </p>
        </section>

      </div>
    </main>
  );
}