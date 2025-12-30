"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";

export default function LoanApplicationPage() {
  const { isAuthenticated, loading, token } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [existingDebt, setExistingDebt] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const creditScoreValid =
    creditScore !== "" &&
    Number.isInteger(Number(creditScore)) &&
    Number(creditScore) >= 0 &&
    Number(creditScore) <= 850;

  const formValid =
    name.trim() &&
    email.trim() &&
    requestedAmount &&
    creditScoreValid &&
    annualIncome &&
    existingDebt &&
    employmentStatus;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSubmit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loan/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            email,
            requested_amount: Number(requestedAmount),
            credit_score: Number(creditScore),
            annual_income: Number(annualIncome),
            existing_debt: Number(existingDebt),
            employment_status: employmentStatus,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Loan application failed");
      } else {
        setSuccess("Loan application submitted successfully");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }

    setLoadingSubmit(false);
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">

          <h1 className="text-2xl font-bold mb-6">Apply for a Loan</h1>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>

            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              type="number"
              placeholder="Requested loan amount"
              value={requestedAmount}
              min={1}
              onChange={(e) => setRequestedAmount(e.target.value)}
              required
            />

            <div>
              <input
                className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 w-full"
                type="number"
                placeholder="Credit score (0–850)"
                value={creditScore}
                min={0}
                max={850}
                onChange={(e) => setCreditScore(e.target.value)}
                required
              />
              {!creditScoreValid && creditScore !== "" && (
                <p className="text-red-400 text-xs mt-1">
                  Credit score must be between 0 and 850
                </p>
              )}
            </div>

            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              type="number"
              placeholder="Annual income"
              min={0}
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              required
            />

            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              type="number"
              placeholder="Existing debt"
              min={0}
              value={existingDebt}
              onChange={(e) => setExistingDebt(e.target.value)}
              required
            />

            <select
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              required
            >
              <option value="">Employment status</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="unemployed">Unemployed</option>
            </select>

            <button
              className={`py-3 rounded-lg font-semibold transition ${
                formValid
                  ? "bg-brand-aqua text-slate-950 hover:bg-brand-purple"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
              type="submit"
              disabled={!formValid || loadingSubmit}
            >
              {loadingSubmit ? "Submitting…" : "Submit Loan Application"}
            </button>
          </form>

          {error && (
            <p className="text-red-400 mt-4 text-sm">Error: {error}</p>
          )}

          {success && (
            <p className="text-emerald-400 mt-4 text-sm">{success}</p>
          )}

        </div>
      </main>
    </>
  );
}