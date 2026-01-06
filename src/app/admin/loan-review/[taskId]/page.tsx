"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/app/components/Spinner";

type LoanReviewTaskDetails = {
  taskId: string;
  state: string;
  displayName?: string;
  definitionName?: string;
  workflowId?: string;
  workflowName?: string;
  taskRefName?: string;
  assignee?: any;
  claimant?: any;
  input?: any;
  createdOn?: number;
  updatedOn?: number;
};

type UserProfile = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  dob?: string;
  customer_status?: string;
};

function badgeColor(value?: string) {
  const v = (value || "").toUpperCase();

  if (v.includes("APPROVE")) return "bg-emerald-500 text-slate-950";
  if (v.includes("REJECT") || v.includes("DECLINE"))
    return "bg-red-500 text-white";
  if (v.includes("REVIEW")) return "bg-yellow-400 text-slate-950";
  if (v.includes("FAIR")) return "bg-yellow-500 text-slate-950";
  if (v.includes("GOOD")) return "bg-emerald-400 text-slate-950";
  if (v.includes("POOR")) return "bg-red-500 text-white";

  return "bg-slate-700 text-slate-100";
}

export default function LoanReviewTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.taskId as string;

  const [token, setToken] = useState<string | null>(null);

  const [task, setTask] = useState<LoanReviewTaskDetails | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [claiming, setClaiming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Decision + Notes
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [notes, setNotes] = useState("");

  // ✅ Modal
  const [confirmDecisionOpen, setConfirmDecisionOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("sekro_admin_token");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    setToken(t);
  }, [router]);

  async function fetchTaskDetails(adminToken: string) {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/loan-review/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load task");

      setTask(data.task || null);
      setUser(data.user || null);

      // ✅ if task is unclaimed after refresh, clear any local decision selection
      if (!data?.task?.claimant?.user) {
        setDecision(null);
        setNotes("");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchTaskDetails(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, taskId]);

  async function claimTask() {
    if (!token || !taskId) return;

    setClaiming(true);
    setActionError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/loan-review/tasks/${taskId}/claim`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to claim task");
      }

      await fetchTaskDetails(token);
    } catch (err: any) {
      setActionError(err?.message || "Failed to claim task");
    } finally {
      setClaiming(false);
    }
  }

  async function releaseTask() {
    if (!token || !taskId) return;

    setReleasing(true);
    setActionError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/loan-review/tasks/${taskId}/release`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to release task");
      }

      await fetchTaskDetails(token);

      // ✅ clear local state
      setDecision(null);
      setNotes("");
      setConfirmDecisionOpen(false);
    } catch (err: any) {
      setActionError(err?.message || "Failed to release task");
    } finally {
      setReleasing(false);
    }
  }

  async function submitDecisionConfirmed() {
    if (!token || !taskId) return;

    if (!decision) {
      setActionError("Please select Approve or Reject before submitting.");
      return;
    }

    // ✅ enforce notes for rejected decisions (optional but recommended)
    if (decision === "REJECTED" && notes.trim().length < 5) {
      setActionError("Please include a brief rejection note before submitting.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/loan-review/tasks/${taskId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision, notes }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit decision");
      }

      // ✅ Completed — return to dashboard
      router.push("/admin");
    } catch (err: any) {
      setActionError(err?.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
      setConfirmDecisionOpen(false);
    }
  }

  const input = useMemo(() => task?.input || {}, [task]);

  const credit = input.credit_report || {};
  const analysis = input.loan_analysis || {};

  const claimedBy = task?.claimant?.user || null;

  if (!token) return null;

  const isClaimed = !!claimedBy;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            className="text-sm text-slate-400 hover:text-slate-200 mb-4"
            onClick={() => router.push("/admin")}
          >
            ← Back to Employee Dashboard
          </button>

          <h1 className="text-3xl font-bold">Loan Review</h1>
          <p className="text-slate-400 mt-1">
            Review customer application details and make a decision.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-2 text-slate-400">
            <Spinner />
            Loading task…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-red-400">
            {error}
          </div>
        )}

        {/* Body */}
        {!loading && !error && task && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Customer</h2>

                {user ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="text-slate-100 font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-slate-100 font-medium">{user.email}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Customer Status</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badgeColor(
                          user.customer_status
                        )}`}
                      >
                        {user.customer_status || "—"}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">DOB</p>
                      <p className="text-slate-100 font-medium">
                        {user.dob
                          ? new Date(user.dob).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Customer profile not found for this application.
                  </p>
                )}
              </div>

              {/* Application */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Application Summary
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Requested Amount</p>
                    <p className="text-slate-100 font-semibold text-lg">
                      ${Number(input.requested_amount || 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Purpose</p>
                    <p className="text-slate-100 font-medium capitalize">
                      {input.purpose?.replaceAll("_", " ") || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Employment</p>
                    <p className="text-slate-100 font-medium capitalize">
                      {input.employment_status?.replaceAll("_", " ") || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Debt / Income</p>
                    <p className="text-slate-100 font-medium">
                      ${Number(input.declared_debt || 0).toLocaleString()} /{" "}
                      ${Number(input.declared_income || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit report */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Credit Report</h2>

                <div className="flex flex-wrap gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor(
                      credit.risk_band
                    )}`}
                  >
                    {credit.risk_band || "—"}
                  </span>

                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-800 border border-slate-700">
                    Credit Score: {credit.credit_score ?? "—"}
                  </span>

                  {credit.estimated_interest_rate_range && (
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-800 border border-slate-700">
                      APR Range: {credit.estimated_interest_rate_range.min_apr}%
                      – {credit.estimated_interest_rate_range.max_apr}%
                    </span>
                  )}
                </div>

                {credit.summary && (
                  <p className="text-sm text-slate-300 mb-4">
                    {credit.summary}
                  </p>
                )}

                {Array.isArray(credit.factors) && credit.factors.length > 0 && (
                  <div className="space-y-3">
                    {credit.factors.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950/40 border border-slate-800 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-100 text-sm">
                            {f.factor}
                          </p>

                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor(
                              f.impact
                            )}`}
                          >
                            {f.impact?.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-slate-400 mt-2">
                          {f.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Loan analysis */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Loan Analysis</h2>

                <div className="flex flex-wrap gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeColor(
                      analysis.recommendation
                    )}`}
                  >
                    {analysis.recommendation || "—"}
                  </span>

                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-800 border border-slate-700">
                    Confidence: {analysis.confidence ?? "—"}
                  </span>

                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-800 border border-slate-700">
                    Risk Score: {analysis.risk_score ?? "—"}
                  </span>
                </div>

                {analysis.justification && (
                  <p className="text-sm text-slate-300">
                    {analysis.justification}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: Task controls */}
            <div className="space-y-6">
              {/* Task Details */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Task Details</h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Task ID</p>
                    <p className="text-slate-100 font-medium break-all">
                      {task.taskId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Workflow ID</p>
                    <p className="text-slate-100 font-medium break-all">
                      {task.workflowId}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">State</span>
                    <span className="px-2 py-1 rounded-full text-xs border border-slate-700 text-slate-100">
                      {task.state}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Claimed</span>
                    {claimedBy ? (
                      <span className="text-slate-100 font-medium">
                        {claimedBy}
                      </span>
                    ) : (
                      <span className="text-slate-500">Unclaimed</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-3">Actions</h2>
                <p className="text-sm text-slate-400 mb-4">
                  Claim the task before approving or rejecting.
                </p>

                {actionError && (
                  <p className="text-sm text-red-400 mb-3">{actionError}</p>
                )}

                <div className="flex flex-col gap-3">
                  {/* Claim */}
                  <button
                    className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={!!claimedBy || claiming || releasing || submitting}
                    onClick={claimTask}
                  >
                    {claiming && <Spinner />}
                    {claiming ? "Claiming…" : "Claim Task"}
                  </button>

                  {/* Release */}
                  <button
                    className="bg-slate-800 text-slate-100 font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={!claimedBy || releasing || claiming || submitting}
                    onClick={releaseTask}
                  >
                    {releasing && <Spinner />}
                    {releasing ? "Releasing…" : "Release Task"}
                  </button>

                  {/* Decision */}
                  <div className="mt-2 space-y-3">
                    <button
                      disabled={!isClaimed}
                      onClick={() => setDecision("APPROVED")}
                      className={`w-full font-semibold px-4 py-2 rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        decision === "APPROVED"
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "bg-slate-950/40 text-slate-100 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      Approve
                    </button>

                    <button
                      disabled={!isClaimed}
                      onClick={() => setDecision("REJECTED")}
                      className={`w-full font-semibold px-4 py-2 rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        decision === "REJECTED"
                          ? "bg-red-500 text-white border-red-400"
                          : "bg-slate-950/40 text-slate-100 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      Reject
                    </button>

                    {/* ✅ Notes */}
                    <div className="pt-2">
                      <p className="text-xs text-slate-500 mb-2">
                        Notes (visible to customer)
                      </p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={!isClaimed}
                        placeholder="Add context for your decision..."
                        className="w-full min-h-[120px] rounded-xl bg-slate-950/40 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-aqua disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      {decision === "REJECTED" && (
                        <p className="text-xs text-slate-500 mt-2">
                          Rejection notes are required and will appear in the customer's inbox.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    disabled={!isClaimed || !decision || submitting}
                    onClick={() => setConfirmDecisionOpen(true)}
                    className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting && <Spinner />}
                    {submitting ? "Submitting…" : "Submit Decision"}
                  </button>

                  {!isClaimed && (
                    <p className="text-xs text-slate-500 mt-1">
                      You must claim this task before making a decision.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Confirm Decision Modal */}
      {confirmDecisionOpen && decision && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-3">Confirm Decision</h3>

            <p className="text-slate-300 text-sm mb-4">
              You’re about to{" "}
              <span
                className={`font-semibold ${
                  decision === "APPROVED" ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {decision === "APPROVED" ? "APPROVE" : "REJECT"}
              </span>{" "}
              this loan application. Continue?
            </p>

            {decision === "REJECTED" && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1">Customer Notes</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">
                  {notes.trim() || "—"}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setConfirmDecisionOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className={`font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  decision === "APPROVED"
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
                onClick={submitDecisionConfirmed}
                disabled={submitting}
              >
                {submitting && <Spinner />}
                {submitting ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
