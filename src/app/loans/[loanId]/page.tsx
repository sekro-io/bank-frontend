"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import Spinner from "@/app/components/Spinner";
import { useAuth } from "@/app/context/AuthContext";
import { formatCurrency } from "@/utils/money";

type LoanDetails = {
  id: string; // loan_application_id
  status: string;
  requested_amount: number;
  purpose?: string;
  employment_status?: string;
  declared_income?: number;
  declared_debt?: number;

  created_at?: string;
  updated_at?: string;

  selected_offer?: {
    term_months?: number;
    apr?: number;
    monthly_payment?: number;
    total_payment?: number;
    total_interest?: number;
  } | null;

  rejection_notes?: string | null;
};

function formatLoanStatus(status?: string) {
  if (!status) return "—";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function LoanDetailsPage() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const loanId = params?.loanId as string;

  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

  // auth guard
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token || !loanId) return;
    fetchLoanDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loanId]);

  async function fetchLoanDetails() {
    if (!token) return;

    setLoanLoading(true);
    setLoanError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load loan");

      setLoan(data.loan || null);
    } catch (err: any) {
      setLoanError(err?.message || "Failed to load loan");
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

  // ✅ NEW: show offers button when offers are available
  const canViewOffers =
    loan?.status?.toUpperCase() === "OFFERS_PRESENTED" ||
    loan?.status?.toUpperCase() === "APPROVED";

  return (
    <>
      <TopNav />

      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              className="text-sm text-slate-400 hover:text-slate-200 mb-3"
              onClick={() => router.push("/dashboard")}
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold">Loan Details</h1>
            <p className="text-slate-400 mt-1">
              View your loan application status and terms.
            </p>
          </div>

          {loanLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 flex items-center gap-2">
              <Spinner />
              Loading loan…
            </div>
          )}

          {loanError && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-red-400">
              {loanError}
            </div>
          )}

          {!loanLoading && !loanError && loan && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold mb-4">Summary</h2>

                  {/* ✅ NEW CTA: View Loan Offers */}
                  {canViewOffers && (
                    <button
                      className="inline-flex items-center gap-2 bg-brand-aqua text-slate-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-purple transition text-sm"
                      onClick={() => router.push(`/loan-offers/${loan.id}`)}
                    >
                      View Loan Offers →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Requested Amount</p>
                    <p className="text-slate-100 font-semibold text-lg">
                      {formatCurrency(Number(loan.requested_amount || 0))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-slate-100 font-medium">
                      {formatLoanStatus(loan.status)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Applied On</p>
                    <p className="text-slate-100 font-medium">
                      {loan.created_at
                        ? new Date(loan.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Purpose</p>
                    <p className="text-slate-100 font-medium capitalize">
                      {loan.purpose ? loan.purpose.replaceAll("_", " ") : "—"}
                    </p>
                  </div>
                </div>

                {/* ✅ Optional helper text if offers are ready */}
                {loan.status?.toUpperCase() === "OFFERS_PRESENTED" && (
                  <p className="text-xs text-slate-500 mt-4">
                    You have loan offers ready to review.
                  </p>
                )}
              </div>

              {/* Offer / Terms */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Loan Terms</h2>

                {loan.selected_offer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">APR</p>
                      <p className="text-slate-100 font-medium">
                        {loan.selected_offer.apr !== undefined
                          ? `${Number(loan.selected_offer.apr).toFixed(2)}%`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Term</p>
                      <p className="text-slate-100 font-medium">
                        {loan.selected_offer.term_months
                          ? `${loan.selected_offer.term_months} months`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Monthly Payment</p>
                      <p className="text-slate-100 font-medium">
                        {loan.selected_offer.monthly_payment !== undefined
                          ? formatCurrency(
                              Number(loan.selected_offer.monthly_payment)
                            )
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Total Paid</p>
                      <p className="text-slate-100 font-medium">
                        {loan.selected_offer.total_payment !== undefined
                          ? formatCurrency(
                              Number(loan.selected_offer.total_payment)
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Loan terms will appear here once an offer is accepted.
                  </p>
                )}
              </div>

              {/* Rejection notes */}
              {loan.status?.toUpperCase().includes("REJECT") &&
                loan.rejection_notes && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-3 text-red-300">
                      Rejection Notes
                    </h2>
                    <p className="text-sm text-slate-300">
                      {loan.rejection_notes}
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
