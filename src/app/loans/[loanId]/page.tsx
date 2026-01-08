"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import Spinner from "@/app/components/Spinner";
import { useAuth } from "@/app/context/AuthContext";
import { formatCurrency, parseCurrency } from "@/utils/money";

type LoanAccount = {
  id: string;
  loan_application_id: string;
  loan_offer_id?: string | null;
  destination_account_id?: string | null;

  principal_amount: number;
  outstanding_balance: number;
  interest_rate?: number | null;
  term_months?: number | null;

  status: string;
  created_at?: string;
  closed_at?: string | null;

  monthly_payment?: number | null;
  total_payment?: number | null;
  total_interest?: number | null;
};

type Account = {
  id: string;
  account_name: string;
  account_number: string;
  available_balance: string;
  account_type: string;
};

type AutopaySchedule = {
  schedule_name: string;
  paused: boolean;
  cron_expression: string;
  zone_id: string;
  day_of_month: number | null;
  payment_amount: number | null;
  payment_account_id: string | null;
  next_runs?: number[];
};

type LoanTransaction = {
  id: string;
  loan_id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  payment_account_id?: string | null;
  account_transaction_id?: string | null;
  status: string;
  initiated_by?: string | null;
  description?: string | null;
  created_at?: string;
  posted_at?: string | null;
};

function formatLoanStatus(status?: string) {
  if (!status) return "—";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function badgeColor(status?: string) {
  const s = (status || "").toUpperCase();

  if (s.includes("ACTIVE") || s.includes("OPEN"))
    return "bg-emerald-500 text-slate-950";
  if (s.includes("CLOSED") || s.includes("PAID"))
    return "bg-slate-400 text-slate-950";
  if (s.includes("DELINQ") || s.includes("LATE"))
    return "bg-yellow-400 text-slate-950";
  if (s.includes("DEFAULT") || s.includes("FAILED"))
    return "bg-red-500 text-white";

  return "bg-slate-700 text-slate-100";
}

function formatNextRun(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTxnStatus(status?: string) {
  if (!status) return "—";
  const s = status.toUpperCase();
  if (s === "POSTED") return "Posted";
  if (s === "PENDING") return "Pending";
  if (s === "FAILED") return "Failed";
  return status;
}

function txnStatusBadge(status?: string) {
  const s = (status || "").toUpperCase();
  if (s.includes("POSTED")) return "bg-emerald-500 text-slate-950";
  if (s.includes("PENDING")) return "bg-yellow-400 text-slate-950";
  if (s.includes("FAILED")) return "bg-red-500 text-white";
  return "bg-slate-700 text-slate-100";
}

export default function LoanAccountDetailsPage() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const loanId = params?.loanId as string;

  const [loan, setLoan] = useState<LoanAccount | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);

  // ✅ Shared account loading state (used for both modals)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // ✅ Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentAmountValue, setPaymentAmountValue] = useState<number | null>(
    null
  );
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // ✅ Loan transaction history state
  const [loanTxns, setLoanTxns] = useState<LoanTransaction[]>([]);
  const [loanTxnsLoading, setLoanTxnsLoading] = useState(false);
  const [loanTxnsError, setLoanTxnsError] = useState<string | null>(null);

  // ✅ Autopay schedule state
  const [autopay, setAutopay] = useState<AutopaySchedule | null>(null);
  const [autopayFound, setAutopayFound] = useState(false);
  const [autopayLoading, setAutopayLoading] = useState(false);
  const [autopayFetchError, setAutopayFetchError] = useState<string | null>(
    null
  );
  const [autopayActionMessage, setAutopayActionMessage] = useState<
    string | null
  >(null);

  // ✅ AutoPay modal state
  const [showAutopayModal, setShowAutopayModal] = useState(false);
  const [autopayAccountId, setAutopayAccountId] = useState("");
  const [autopayAmountInput, setAutopayAmountInput] = useState("");
  const [autopayAmountValue, setAutopayAmountValue] = useState<number | null>(
    null
  );
  const [autopayDay, setAutopayDay] = useState<number>(1);
  const [submittingAutopay, setSubmittingAutopay] = useState(false);
  const [autopayError, setAutopayError] = useState<string | null>(null);
  const [autopaySuccess, setAutopaySuccess] = useState<string | null>(null);

  // ✅ auth guard
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  // ✅ fetch loan + autopay + loan txns
  useEffect(() => {
    if (!token || !loanId) return;
    fetchLoan();
    fetchAutopay();
    fetchLoanTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loanId]);

  async function fetchLoan() {
    if (!token) return;

    setLoanLoading(true);
    setLoanError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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

  async function fetchLoanTransactions() {
    if (!token) return;

    setLoanTxnsLoading(true);
    setLoanTxnsError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "Failed to load loan transactions");

      setLoanTxns(data.transactions || []);
    } catch (err: any) {
      setLoanTxnsError(err?.message || "Failed to load payment history");
    } finally {
      setLoanTxnsLoading(false);
    }
  }

  async function fetchAutopay() {
    if (!token) return;

    setAutopayLoading(true);
    setAutopayFetchError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/autopay`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load autopay");

      if (data?.found) {
        setAutopayFound(true);
        setAutopay(data.autopay);
      } else {
        setAutopayFound(false);
        setAutopay(null);
      }
    } catch (err: any) {
      setAutopayFetchError(err?.message || "Failed to load autopay schedule");
    } finally {
      setAutopayLoading(false);
    }
  }

  // ✅ fetch accounts when either modal opens
  useEffect(() => {
    if ((!showPaymentModal && !showAutopayModal) || !token) return;
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentModal, showAutopayModal]);

  async function fetchAccounts() {
    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load accounts");

      setAccounts(data.accounts || []);

      if (data.accounts?.length > 0) {
        setPaymentAccountId((prev) => prev || data.accounts[0].id);
        setAutopayAccountId((prev) => prev || data.accounts[0].id);
      }
    } catch (err: any) {
      setAccountsError(err?.message || "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  }

  const status = loan?.status?.toUpperCase() || "";

  const isClosed = useMemo(() => {
    return status.includes("CLOSED") || status.includes("PAID");
  }, [status]);

  const monthlyPayment = loan?.monthly_payment ?? null;

  // ✅ payment modal defaults
  useEffect(() => {
    if (!showPaymentModal) return;

    setPaymentError(null);
    setPaymentSuccess(null);
    setSubmittingPayment(false);

    if (monthlyPayment !== null && monthlyPayment !== undefined) {
      setPaymentAmountValue(Number(monthlyPayment));
      setPaymentAmountInput(formatCurrency(Number(monthlyPayment)));
    } else {
      setPaymentAmountValue(null);
      setPaymentAmountInput("");
    }
  }, [showPaymentModal, monthlyPayment]);

  // ✅ autopay modal defaults
  useEffect(() => {
    if (!showAutopayModal) return;

    setAutopayError(null);
    setAutopaySuccess(null);
    setSubmittingAutopay(false);

    if (autopayFound && autopay) {
      const scheduleDay = autopay.day_of_month ?? 1;
      setAutopayDay(Math.min(Math.max(scheduleDay, 1), 28));

      if (autopay.payment_amount != null) {
        setAutopayAmountValue(Number(autopay.payment_amount));
        setAutopayAmountInput(formatCurrency(Number(autopay.payment_amount)));
      } else if (monthlyPayment != null) {
        setAutopayAmountValue(Number(monthlyPayment));
        setAutopayAmountInput(formatCurrency(Number(monthlyPayment)));
      } else {
        setAutopayAmountValue(null);
        setAutopayAmountInput("");
      }

      if (autopay.payment_account_id) {
        setAutopayAccountId(autopay.payment_account_id);
      }

      return;
    }

    const today = new Date().getDate();
    const safeDay = Math.min(Math.max(today, 1), 28);
    setAutopayDay(safeDay);

    if (monthlyPayment !== null && monthlyPayment !== undefined) {
      setAutopayAmountValue(Number(monthlyPayment));
      setAutopayAmountInput(formatCurrency(Number(monthlyPayment)));
    } else {
      setAutopayAmountValue(null);
      setAutopayAmountInput("");
    }
  }, [showAutopayModal, autopayFound, autopay, monthlyPayment]);

  const canSubmitPayment =
    !submittingPayment &&
    !!paymentAccountId &&
    paymentAmountValue !== null &&
    paymentAmountValue > 0;

  const canSubmitAutopay =
    !submittingAutopay &&
    !!autopayAccountId &&
    autopayAmountValue !== null &&
    autopayAmountValue > 0 &&
    autopayDay >= 1 &&
    autopayDay <= 28;

  async function submitPayment() {
    if (!token) return;

    setSubmittingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payment_account_id: paymentAccountId,
            payment_amount: paymentAmountValue,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to submit payment");

      setPaymentSuccess(data?.message || "Payment processed successfully!");
      setTimeout(() => {
        setShowPaymentModal(false);
        fetchLoan();
        fetchLoanTransactions();
      }, 900);
    } catch (err: any) {
      setPaymentError(err?.message || "Payment failed");
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function submitAutopay() {
    if (!token) return;

    setSubmittingAutopay(true);
    setAutopayError(null);
    setAutopaySuccess(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/autopay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            day_of_month: autopayDay,
            payment_account_id: autopayAccountId,
            payment_amount: autopayAmountValue,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save autopay");

      setAutopaySuccess(data?.message || "AutoPay schedule saved!");
      setTimeout(() => {
        setShowAutopayModal(false);
        fetchAutopay();
      }, 900);
    } catch (err: any) {
      setAutopayError(err?.message || "Failed to save autopay schedule");
    } finally {
      setSubmittingAutopay(false);
    }
  }

  async function pauseAutopay() {
    if (!token) return;
    setAutopayActionMessage(null);
    setAutopayFetchError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/autopay/pause`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to pause autopay");

      setAutopayActionMessage(data?.message || "Autopay paused.");
      fetchAutopay();
    } catch (err: any) {
      setAutopayFetchError(err?.message || "Failed to pause autopay");
    }
  }

  async function resumeAutopay() {
    if (!token) return;
    setAutopayActionMessage(null);
    setAutopayFetchError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/autopay/resume`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to resume autopay");

      setAutopayActionMessage(data?.message || "Autopay enabled.");
      fetchAutopay();
    } catch (err: any) {
      setAutopayFetchError(err?.message || "Failed to resume autopay");
    }
  }

  async function deleteAutopay() {
    if (!token) return;

    const confirmed = confirm(
      "Are you sure you want to delete your AutoPay schedule? This cannot be undone."
    );
    if (!confirmed) return;

    setAutopayActionMessage(null);
    setAutopayFetchError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/loans/${loanId}/autopay`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete autopay");

      setAutopayActionMessage(data?.message || "AutoPay schedule deleted.");
      fetchAutopay();
    } catch (err: any) {
      setAutopayFetchError(err?.message || "Failed to delete autopay");
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
              onClick={() => router.push("/dashboard")}
            >
              ← Back to Dashboard
            </button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Loan Account</h1>
                <p className="text-slate-400 mt-1">
                  View your loan balance and repayment details.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isClosed && (
                  <>
                    <button
                      className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      Make a Payment
                    </button>

                    <button
                      className="bg-slate-800 border border-slate-700 text-slate-50 font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition"
                      onClick={() => setShowAutopayModal(true)}
                    >
                      {autopayFound ? "Edit AutoPay" : "Set Up AutoPay"}
                    </button>
                  </>
                )}

                {loan?.loan_application_id && (
                  <button
                    className="inline-flex items-center gap-2 bg-slate-800 text-slate-50 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition border border-slate-700 text-sm"
                    onClick={() =>
                      router.push(`/loan-application/${loan.loan_application_id}`)
                    }
                  >
                    View Loan Application →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loanLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 flex items-center gap-2">
              <Spinner />
              Loading loan…
            </div>
          )}

          {/* Error */}
          {loanError && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-red-400">
              {loanError}
            </div>
          )}

          {/* Content */}
          {!loanLoading && !loanError && loan && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-lg font-semibold">Account Summary</h2>

                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badgeColor(
                      loan.status
                    )}`}
                  >
                    {formatLoanStatus(loan.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Outstanding Balance</p>
                    <p className="text-slate-100 font-semibold text-xl">
                      {formatCurrency(Number(loan.outstanding_balance || 0))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Principal Amount</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {formatCurrency(Number(loan.principal_amount || 0))}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Monthly Payment</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {loan.monthly_payment !== null &&
                      loan.monthly_payment !== undefined
                        ? formatCurrency(Number(loan.monthly_payment))
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">APR</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {loan.interest_rate !== null &&
                      loan.interest_rate !== undefined
                        ? `${Number(loan.interest_rate).toFixed(2)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ ONLY render AutoPay card when schedule exists */}
              {autopayFound && autopay && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">AutoPay</h2>
                      <p className="text-slate-400 text-sm mt-1">
                        Automatically submit a loan payment each month.
                      </p>
                    </div>

                    {!isClosed && (
                      <button
                        className="bg-slate-800 border border-slate-700 text-slate-50 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition text-sm"
                        onClick={() => setShowAutopayModal(true)}
                      >
                        Edit AutoPay
                      </button>
                    )}
                  </div>

                  {autopayLoading && (
                    <div className="text-slate-400 flex items-center gap-2 mt-4">
                      <Spinner />
                      Loading autopay…
                    </div>
                  )}

                  {autopayFetchError && (
                    <p className="text-red-400 text-sm mt-4">
                      {autopayFetchError}
                    </p>
                  )}

                  {!autopayLoading && !autopayFetchError && (
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-400">Status</p>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            autopay.paused
                              ? "bg-slate-600 text-slate-100"
                              : "bg-emerald-500 text-slate-950"
                          }`}
                        >
                          {autopay.paused ? "Paused" : "Active"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-slate-400">Day of month</p>
                        <p className="text-slate-100 font-medium">
                          {autopay.day_of_month ?? "—"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-slate-400">Amount</p>
                        <p className="text-slate-100 font-medium">
                          {autopay.payment_amount != null
                            ? formatCurrency(Number(autopay.payment_amount))
                            : "—"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-slate-400">Next run</p>
                        <p className="text-slate-100 font-medium">
                          {autopay?.next_runs?.length
                            ? formatNextRun(autopay.next_runs[0])
                            : "—"}
                        </p>
                      </div>

                      {!isClosed && (
                        <div className="flex gap-3 pt-2">
                          {autopay.paused ? (
                            <button
                              className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                              onClick={resumeAutopay}
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              className="bg-slate-700 text-slate-50 font-semibold px-4 py-2 rounded-lg hover:bg-slate-600 transition"
                              onClick={pauseAutopay}
                            >
                              Disable
                            </button>
                          )}

                          <button
                            className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-500 transition"
                            onClick={deleteAutopay}
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {autopayActionMessage && (
                        <p className="text-emerald-400 text-sm mt-2">
                          {autopayActionMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ✅ Payment History */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Payment History</h2>

                  <button
                    className="text-sm text-slate-400 hover:text-slate-200"
                    onClick={fetchLoanTransactions}
                    disabled={loanTxnsLoading}
                  >
                    Refresh
                  </button>
                </div>

                {loanTxnsLoading && (
                  <div className="text-slate-400 flex items-center gap-2 mt-4">
                    <Spinner />
                    Loading payments…
                  </div>
                )}

                {loanTxnsError && (
                  <div className="text-red-400 text-sm mt-4">{loanTxnsError}</div>
                )}

                {!loanTxnsLoading && !loanTxnsError && loanTxns.length === 0 && (
                  <p className="text-slate-400 text-sm mt-4">
                    No loan payments yet.
                  </p>
                )}

                {!loanTxnsLoading && !loanTxnsError && loanTxns.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Description</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loanTxns.map((t) => {
                          const date =
                            t.posted_at || t.created_at
                              ? new Date(t.posted_at || t.created_at || "").toLocaleString()
                              : "—";

                          return (
                            <tr
                              key={t.id}
                              className="border-b border-slate-800 text-slate-100"
                            >
                              <td className="py-3 pr-3 text-slate-300 whitespace-nowrap">
                                {date}
                              </td>

                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-200">
                                    {t.transaction_type || "PAYMENT"}
                                  </span>
                                  <span className="text-slate-100">
                                    {t.description || "Loan payment"}
                                  </span>
                                  {t.initiated_by && (
                                    <span className="text-xs text-slate-500">
                                      • {t.initiated_by}
                                    </span>
                                  )}
                                </div>
                                {t.account_transaction_id && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    Account Txn: {t.account_transaction_id}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 pr-3 font-semibold whitespace-nowrap">
                                {formatCurrency(Number(t.amount || 0))}
                              </td>

                              <td className="py-3 pr-3">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${txnStatusBadge(
                                    t.status
                                  )}`}
                                >
                                  {formatTxnStatus(t.status)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Repayment Totals */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Repayment Totals</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Total Paid</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {loan.total_payment !== null &&
                      loan.total_payment !== undefined
                        ? formatCurrency(Number(loan.total_payment))
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Total Interest</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {loan.total_interest !== null &&
                      loan.total_interest !== undefined
                        ? formatCurrency(Number(loan.total_interest))
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Loan Offer ID</p>
                    <p className="text-slate-100 font-medium">
                      {loan.loan_offer_id || "—"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-6">
                  This is the loan account created after your offer was accepted
                  and funded.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ✅ Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Make a Payment</h3>

            {accountsLoading && (
              <div className="text-slate-400 flex items-center gap-2 mb-3">
                <Spinner />
                Loading accounts…
              </div>
            )}

            {accountsError && (
              <p className="text-red-400 text-sm mb-3">{accountsError}</p>
            )}

            {!accountsLoading && accounts.length === 0 && (
              <p className="text-slate-400 text-sm mb-3">
                You need an account to make a payment.
              </p>
            )}

            {!accountsLoading && accounts.length > 0 && (
              <>
                <label className="block text-sm mb-1">Pay From Account</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  disabled={submittingPayment}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">Payment Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-2"
                  value={paymentAmountInput}
                  onChange={(e) => {
                    setPaymentAmountInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setPaymentAmountValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (paymentAmountValue !== null) {
                      setPaymentAmountInput(formatCurrency(paymentAmountValue));
                    }
                  }}
                  disabled={submittingPayment}
                />

                {monthlyPayment !== null && monthlyPayment !== undefined && (
                  <button
                    className="text-xs text-brand-aqua hover:text-brand-purple mb-4"
                    onClick={() => {
                      setPaymentAmountValue(Number(monthlyPayment));
                      setPaymentAmountInput(
                        formatCurrency(Number(monthlyPayment))
                      );
                    }}
                    disabled={submittingPayment}
                  >
                    Use monthly payment ({formatCurrency(Number(monthlyPayment))})
                  </button>
                )}
              </>
            )}

            {paymentError && (
              <p className="text-red-400 text-sm mb-3">{paymentError}</p>
            )}

            {paymentSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{paymentSuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setShowPaymentModal(false)}
                disabled={submittingPayment}
              >
                Cancel
              </button>

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitPayment}
                disabled={!canSubmitPayment}
              >
                {submittingPayment && <Spinner />}
                {submittingPayment ? "Submitting…" : "Submit Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ AutoPay Modal (unchanged below; keep yours) */}
      {showAutopayModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-2">
              {autopayFound ? "Edit AutoPay" : "Set Up AutoPay"}
            </h3>

            <p className="text-xs text-slate-400 mb-4">
              This creates a Conductor schedule that runs once per month.
            </p>

            {accountsLoading && (
              <div className="text-slate-400 flex items-center gap-2 mb-3">
                <Spinner />
                Loading accounts…
              </div>
            )}

            {accountsError && (
              <p className="text-red-400 text-sm mb-3">{accountsError}</p>
            )}

            {!accountsLoading && accounts.length === 0 && (
              <p className="text-slate-400 text-sm mb-3">
                You need an account to set up AutoPay.
              </p>
            )}

            {!accountsLoading && accounts.length > 0 && (
              <>
                <label className="block text-sm mb-1">Pay From Account</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={autopayAccountId}
                  onChange={(e) => setAutopayAccountId(e.target.value)}
                  disabled={submittingAutopay}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">Day of Month</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={autopayDay}
                  onChange={(e) => setAutopayDay(Number(e.target.value))}
                  disabled={submittingAutopay}
                >
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const d = idx + 1;
                    return (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    );
                  })}
                </select>

                <label className="block text-sm mb-1">Payment Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-2"
                  value={autopayAmountInput}
                  onChange={(e) => {
                    setAutopayAmountInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setAutopayAmountValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (autopayAmountValue !== null) {
                      setAutopayAmountInput(formatCurrency(autopayAmountValue));
                    }
                  }}
                  disabled={submittingAutopay}
                />

                {monthlyPayment !== null && monthlyPayment !== undefined && (
                  <button
                    className="text-xs text-brand-aqua hover:text-brand-purple mb-4"
                    onClick={() => {
                      setAutopayAmountValue(Number(monthlyPayment));
                      setAutopayAmountInput(
                        formatCurrency(Number(monthlyPayment))
                      );
                    }}
                    disabled={submittingAutopay}
                  >
                    Use monthly payment ({formatCurrency(Number(monthlyPayment))})
                  </button>
                )}
              </>
            )}

            {autopayError && (
              <p className="text-red-400 text-sm mb-3">{autopayError}</p>
            )}

            {autopaySuccess && (
              <p className="text-emerald-400 text-sm mb-3">{autopaySuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setShowAutopayModal(false)}
                disabled={submittingAutopay}
              >
                Cancel
              </button>

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitAutopay}
                disabled={!canSubmitAutopay}
              >
                {submittingAutopay && <Spinner />}
                {submittingAutopay ? "Saving…" : "Save AutoPay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
