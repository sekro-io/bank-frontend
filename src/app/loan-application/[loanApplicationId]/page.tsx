"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import Spinner from "@/app/components/Spinner";
import { useAuth } from "@/app/context/AuthContext";
import { formatCurrency } from "@/utils/money";

type LoanApplicationDetails = {
  id: string; // loan_application_id
  status: string;

  requested_amount: number;
  purpose?: string;
  employment_status?: string;
  declared_income?: number;
  declared_debt?: number;

  created_at?: string;
  updated_at?: string;
  decided_at?: string;
  accepted_at?: string;
  funded_at?: string;

  decision_reason?: string | null;

  selected_offer?: {
    term_months?: number;
    apr?: number;
    monthly_payment?: number;
    total_payment?: number;
    total_interest?: number;
  } | null;
};

function formatLoanStatus(status?: string) {
  if (!status) return "—";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function LoanApplicationDetailsPage() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const loanApplicationId = params?.loanApplicationId as string;

  const [loanApplication, setLoanApplication] =
    useState<LoanApplicationDetails | null>(null);

  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

  // ✅ auth guard
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  // ✅ fetch loan application details
  useEffect(() => {
    if (!token || !loanApplicationId) return;
    fetchLoanApplicationDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loanApplicationId]);

  async function fetchLoanApplicationDetails() {
    if (!token) return;

    setLoanLoading(true);
    setLoanError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loan-application/${loanApplicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "Failed to load loan application");

      setLoanApplication(data.loan_application || null);
    } catch (err: any) {
      setLoanError(err?.message || "Failed to load loan application");
    } finally {
      setLoanLoading(false);
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

  const status = loanApplication?.status?.toUpperCase() || "";

  // ✅ Offers page should show when offers are presented
  const canViewOffers = status === "OFFERS_PRESENTED";

  const isRejected =
    status.includes("REJECT") || status.includes("DECLINED") || status.includes("DENIED");

  const isAccepted = status.includes("ACCEPT");
  const isFunded = status.includes("FUNDED") || status.includes("ACTIVE");

  return (
    <>
      <TopNav />

      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              className="text-sm text-slate-400 hover:text-slate-200 mb-3"
              onClick={() => router.push("/dashboard")}
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold">Loan Application</h1>
            <p className="text-slate-400 mt-1">
              Review your loan application status and details.
            </p>
          </div>

          {/* Loading */}
          {loanLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 flex items-center gap-2">
              <Spinner />
              Loading loan application…
            </div>
          )}

          {/* Error */}
          {loanError && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-red-400">
              {loanError}
            </div>
          )}

          {/* Content */}
          {!loanLoading && !loanError && loanApplication && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold mb-4">Summary</h2>

                  {/* ✅ CTA: View Loan Offers */}
                  {canViewOffers && (
                    <button
                      className="inline-flex items-center gap-2 bg-brand-aqua text-slate-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-purple transition text-sm"
                      onClick={() =>
                        router.push(`/loan-offers/${loanApplication.id}`)
                      }
                    >
                      View Loan Offers →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Requested Amount</p>
                    <p className="text-slate-100 font-semibold text-lg">
                      {formatCurrency(Number(loanApplication.requested_amount || 0))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-slate-100 font-medium">
                      {formatLoanStatus(loanApplication.status)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Submitted</p>
                    <p className="text-slate-100 font-medium">
                      {loanApplication.created_at
                        ? new Date(loanApplication.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Purpose</p>
                    <p className="text-slate-100 font-medium capitalize">
                      {loanApplication.purpose
                        ? loanApplication.purpose.replaceAll("_", " ")
                        : "—"}
                    </p>
                  </div>
                </div>

                {canViewOffers && (
                  <p className="text-xs text-slate-500 mt-4">
                    Offers are ready to review and accept.
                  </p>
                )}

                {isAccepted && (
                  <p className="text-xs text-slate-500 mt-4">
                    You accepted an offer — funding will be processed shortly.
                  </p>
                )}

                {isFunded && (
                  <p className="text-xs text-slate-500 mt-4">
                    Your loan is funded and active.
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Selected Offer</h2>

                {loanApplication.selected_offer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">APR</p>
                      <p className="text-slate-100 font-medium">
                        {loanApplication.selected_offer.apr !== undefined
                          ? `${Number(loanApplication.selected_offer.apr).toFixed(2)}%`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Term</p>
                      <p className="text-slate-100 font-medium">
                        {loanApplication.selected_offer.term_months
                          ? `${loanApplication.selected_offer.term_months} months`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Monthly Payment</p>
                      <p className="text-slate-100 font-medium">
                        {loanApplication.selected_offer.monthly_payment !== undefined
                          ? formatCurrency(Number(loanApplication.selected_offer.monthly_payment))
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Total Paid</p>
                      <p className="text-slate-100 font-medium">
                        {loanApplication.selected_offer.total_payment !== undefined
                          ? formatCurrency(Number(loanApplication.selected_offer.total_payment))
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    No offer selected yet.
                  </p>
                )}
              </div>

              {/* Decision reason */}
              {isRejected && loanApplication.decision_reason && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold mb-3 text-red-300">
                    Decision Notes
                  </h2>
                  <p className="text-sm text-slate-300">
                    {loanApplication.decision_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
