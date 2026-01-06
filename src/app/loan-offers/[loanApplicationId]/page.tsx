"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import Spinner from "@/app/components/Spinner";
import { useAuth } from "@/app/context/AuthContext";
import { formatCurrency } from "@/utils/money";

type LoanOffer = {
  id: string;
  offer_id: "OFFER_12" | "OFFER_24" | "OFFER_36";
  term_months: number;
  apr: number;
  loan_amount: number;
  monthly_payment: number;
  total_payment: number;
  created_at: string;
};

type HumanTaskResponse =
  | {
      status: "SUCCESS";
      found: true;
      task: {
        taskId: string;
        state: string;
        displayName?: string;
        definitionName?: string;
        taskRefName?: string;
        workflowId?: string;
        workflowName?: string;
        assignee?: any;
        claimant?: any;
        loan_application_id?: string;
        userFormTemplate?: { name: string; version: number };
      };
    }
  | {
      status: "SUCCESS";
      found: false;
      alreadyCompleted?: boolean;
      message?: string;
    };

export default function LoanOffersPage() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    console.log("params:", params);
  }, [params]);

  const loanApplicationId = params?.loanApplicationId as string;

  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  const [humanTask, setHumanTask] = useState<HumanTaskResponse | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeclineOpen, setConfirmDeclineOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // --- auth guard ---
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  // --- fetch offers + human task ---
  useEffect(() => {
    if (!token || !loanApplicationId) return;
    fetchOffers();
    fetchHumanTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loanApplicationId]);

  async function fetchOffers() {
    if (!token) return;

    setOffersLoading(true);
    setOffersError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loan-application/${loanApplicationId}/offers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("loan-application-id: ", loanApplicationId)

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load loan offers");

      setOffers(data.offers || []);
    } catch (err: any) {
      setOffersError(err?.message || "Failed to load loan offers");
    } finally {
      setOffersLoading(false);
    }
  }

  async function fetchHumanTask() {
    if (!token) return;

    setTaskLoading(true);
    setTaskError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loan-application/${loanApplicationId}/human-task`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load human task");

      setHumanTask(data);
    } catch (err: any) {
      setTaskError(err?.message || "Failed to load human task");
    } finally {
      setTaskLoading(false);
    }
  }

  const taskIsActive = useMemo(() => {
    return humanTask?.status === "SUCCESS" && (humanTask as any).found === true;
  }, [humanTask]);

  const isReadOnly = useMemo(() => {
    // If there's no active task, user can't submit selection
    return !taskIsActive;
  }, [taskIsActive]);

  function offerLabel(offerId: LoanOffer["offer_id"]) {
    if (offerId === "OFFER_12") return "12 Month Term";
    if (offerId === "OFFER_24") return "24 Month Term";
    if (offerId === "OFFER_36") return "36 Month Term";
    return offerId;
  }

  async function completeTask(selected_offer_id: string) {
    if (!token) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loan-application/${loanApplicationId}/human-task/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ selected_offer_id }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit selection");
      }

      setSubmitSuccess(data?.message || "Selection submitted successfully!");
      setSelectedOffer(null);

      // refresh task state so page becomes read-only if completed
      setTimeout(() => {
        fetchHumanTask();
      }, 700);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit selection");
    } finally {
      setSubmitting(false);
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
            <button
              className="text-sm text-slate-400 hover:text-slate-200 mb-3"
              onClick={() => router.push("/")}
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold">Your Loan Offers</h1>
            <p className="text-slate-400 mt-1">
              Review your offers below and choose the best option.
            </p>
          </div>

          {/* Loading + errors */}
          {(offersLoading || taskLoading) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 flex items-center gap-2">
              <Spinner />
              Loading loan offers…
            </div>
          )}

          {(offersError || taskError) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-red-400">
              {offersError || taskError}
            </div>
          )}

          {/* Completed / no task */}
          {!offersLoading && !taskLoading && !offersError && !taskError && isReadOnly && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300 mb-6">
              <p className="font-semibold text-slate-100 mb-1">
                This offer selection is no longer active.
              </p>
              <p className="text-sm text-slate-400">
                You may have already selected an offer or declined them.
              </p>
            </div>
          )}

          {/* Offers */}
          {!offersLoading && !offersError && offers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {offers.map((offer) => {
                const selected = selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    onClick={() => {
                      if (isReadOnly) return;
                      setSelectedOffer(offer);
                    }}
                    className={`text-left bg-slate-900 border rounded-2xl p-6 transition
                      ${
                        selected
                          ? "border-brand-aqua bg-slate-800"
                          : "border-slate-800 hover:border-brand-aqua hover:bg-slate-800"
                      }
                      ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}
                    `}
                  >
                    <p className="text-xs text-slate-500 mb-2">
                      {offerLabel(offer.offer_id)}
                    </p>

                    <p className="text-xl font-semibold mb-3">
                      {formatCurrency(Number(offer.loan_amount))}
                    </p>

                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">APR</span>
                        <span className="font-semibold">
                          {Number(offer.apr).toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Term</span>
                        <span className="font-semibold">{offer.term_months} mo</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly</span>
                        <span className="font-semibold">
                          {formatCurrency(Number(offer.monthly_payment))}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Paid</span>
                        <span className="font-semibold">
                          {formatCurrency(Number(offer.total_payment))}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {!offersLoading && !offersError && offers.length > 0 && (
            <div className="flex flex-col gap-3">
              {submitError && (
                <div className="text-sm text-red-400">{submitError}</div>
              )}

              {submitSuccess && (
                <div className="text-sm text-emerald-400">{submitSuccess}</div>
              )}

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isReadOnly || submitting || !selectedOffer}
                onClick={() => setConfirmSubmitOpen(true)}
              >
                {selectedOffer ? `Accept ${offerLabel(selectedOffer.offer_id)}` : "Select an offer"}
              </button>

              <button
                className="bg-slate-800 text-slate-100 font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isReadOnly || submitting}
                onClick={() => setConfirmDeclineOpen(true)}
              >
                Decline All Offers
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Accept Modal */}
      {confirmSubmitOpen && selectedOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-3">Confirm Selection</h3>
            <p className="text-slate-300 text-sm mb-4">
              You’re about to accept the{" "}
              <span className="font-semibold text-slate-100">
                {offerLabel(selectedOffer.offer_id)}
              </span>{" "}
              offer. Continue?
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setConfirmSubmitOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition flex items-center gap-2"
                onClick={() => {
                  setConfirmSubmitOpen(false);
                  completeTask(selectedOffer.offer_id);
                }}
                disabled={submitting}
              >
                {submitting && <Spinner />}
                {submitting ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Decline Modal */}
      {confirmDeclineOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-3">Decline Offers?</h3>
            <p className="text-slate-300 text-sm mb-4">
              This will decline all offers and your loan application will be closed. Continue?
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setConfirmDeclineOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                onClick={() => {
                  setConfirmDeclineOpen(false);
                  completeTask("DECLINE");
                }}
                disabled={submitting}
              >
                {submitting && <Spinner />}
                {submitting ? "Submitting…" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
