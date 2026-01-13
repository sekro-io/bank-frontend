"use client";

import { useAuth } from "../../context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../components/TopNav";
import Spinner from "../../components/Spinner";
import { formatCurrency, parseCurrency } from "@/utils/money";
import { formatLocalDateTime } from "@/utils/time";

type Account = {
  id: string;
  account_name: string;
  account_type: string;
  account_number: string;
  available_balance: string;
  status: string;
};

type Transaction = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: string;
  description: string | null;
  direction: "credit" | "debit" | string;
  status: "PENDING" | "POSTED" | "FAILED" | string;
  created_at: string;
  posted_at: string | null;
};

type DepositType = "cash" | "direct_deposit" | "check";

export default function AccountPage() {
  const { token } = useAuth();
  const { accountId } = useParams();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [activeModal, setActiveModal] = useState<"deposit" | "withdraw" | null>(
    null
  );

  // 💵 Money input (shared)
  const [amountInput, setAmountInput] = useState("");
  const [amountValue, setAmountValue] = useState<number | null>(null);

  // Deposit
  const [depositType, setDepositType] = useState<DepositType>("cash");
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  // Withdraw
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const anySubmitting = depositSubmitting || withdrawSubmitting;

  // Re-fetch when token becomes available OR when navigating between accounts
  useEffect(() => {
    if (!token || !accountId) return;
    fetchAccounts();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, accountId]);

  async function fetchAccounts() {
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch accounts");
      }

      const list = data.accounts || [];

      setAccounts(list);

      const found = list.find((a: Account) => a.id === accountId);
      setAccount(found || null);
    } catch (e) {
      console.error("fetchAccounts failed:", e);
      setAccounts([]);
      setAccount(null);
    }
  }

  async function fetchTransactions() {
    if (!token || !accountId) return;

    setTxLoading(true);
    setTxError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts/${accountId}/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch transactions");
      }

      setTransactions(data.transactions || []);
    } catch (e: any) {
      setTxError(e?.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }

  function resetAmount() {
    setAmountInput("");
    setAmountValue(null);
  }

  function resetModalState() {
    setDepositType("cash");
    setDepositError(null);
    setWithdrawError(null);
    setDepositSuccess(null);
    setWithdrawSuccess(null);
    resetAmount();
  }

  // --------------------
  // Deposit
  // --------------------
  async function submitDeposit() {
    setDepositError(null);
    setDepositSuccess(null);

    if (!accountId || !amountValue || amountValue <= 0) {
      setDepositError("Please enter a valid amount.");
      return;
    }

    setDepositSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts/${accountId}/deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            account_id: accountId,
            amount: amountValue,
            deposit_type: depositType,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Deposit failed");
      }

      setDepositSuccess(data?.message || "Deposit successful!");

      setTimeout(() => {
        setActiveModal(null);
        resetModalState();
        fetchAccounts();
        fetchTransactions();
      }, 800);
    } catch (e: any) {
      setDepositError(e?.message || "Deposit failed");
    } finally {
      setDepositSubmitting(false);
    }
  }

  // --------------------
  // Withdraw
  // --------------------
  async function submitWithdraw() {
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!accountId || !amountValue || amountValue <= 0) {
      setWithdrawError("Please enter a valid amount.");
      return;
    }

    setWithdrawSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts/${accountId}/withdraw`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amountValue,
            description: "ATM withdraw",
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Withdraw failed");
      }

      setWithdrawSuccess(data?.message || "Withdraw successful!");

      setTimeout(() => {
        setActiveModal(null);
        resetModalState();
        fetchAccounts();
        fetchTransactions();
      }, 800);
    } catch (e: any) {
      setWithdrawError(e?.message || "Withdraw failed");
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  const pressyPrimary =
    "bg-brand-aqua text-slate-950 border border-brand-aqua " +
    "hover:bg-brand-purple hover:border-brand-purple " +
    "active:translate-y-[1px] active:shadow-none " +
    "shadow-[0_6px_0_rgba(0,0,0,0.35)]";

  const pressySecondary =
    "bg-slate-800 text-slate-100 border border-slate-700 " +
    "hover:bg-slate-700 hover:border-slate-600 " +
    "active:translate-y-[1px] active:shadow-none " +
    "shadow-[0_6px_0_rgba(0,0,0,0.35)]";

  const txRows = useMemo(() => transactions ?? [], [transactions]);

  //   function prettyDate(iso: string) {
  //     try {
  //       return new Date(iso).toLocaleString(undefined, {
  //         year: "numeric",
  //         month: "short",
  //         day: "2-digit",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       });
  //     } catch {
  //       return iso;
  //     }
  //   }

  // function txLabel(t: Transaction) {
  //   const type = (t.transaction_type || "").toLowerCase();
  //   const dir = (t.direction || "").toLowerCase();

  //   if (type === "deposit" || dir === "credit") return "Deposit";
  //   if (type === "withdraw" || dir === "debit") return "Withdraw";
  //   return t.transaction_type || "Transaction";
  // }

  function txLabel(t: Transaction) {
    const rawType = (t.transaction_type || "").trim();
    const type = rawType.toLowerCase();
    const dir = (t.direction || "").toLowerCase();

    // Prefer explicit type labels first
    if (type === "external transfer" || type === "external_transfer") {
      return "External Transfer";
    }

    if (type === "deposit") return "Deposit";
    if (type === "withdraw") return "Withdraw";
    if (type) {
      // Title-case whatever else comes from backend
      return rawType
        .split(/[\s_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    // Fallback only if type is missing
    if (dir === "credit") return "Deposit";
    if (dir === "debit") return "Withdraw";

    return "Transaction";
  }

  function statusPill(status: string) {
    const s = (status || "").toUpperCase();
    const base =
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";

    if (s === "POSTED")
      return `${base} border-emerald-700/60 text-emerald-300 bg-emerald-900/20`;
    if (s === "PENDING")
      return `${base} border-slate-600 text-slate-200 bg-slate-800/60`;
    if (s === "FAILED")
      return `${base} border-red-700/60 text-red-300 bg-red-900/20`;

    return `${base} border-slate-700 text-slate-300 bg-slate-900/40`;
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Loading account…
      </div>
    );
  }

  return (
    <>
      <TopNav />

      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            className="text-sm text-slate-400 mb-4 hover:underline"
            onClick={() => router.push("/dashboard")}
          >
            ← Back to Dashboard
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h1 className="text-2xl font-bold">{account.account_name}</h1>
            <p className="text-slate-400 mt-1">
              Account #{account.account_number}
            </p>

            <p className="text-3xl font-semibold mt-4">
              {formatCurrency(Number(account.available_balance))}
            </p>
          </div>

          <div className="flex gap-4 mb-10">
            <button
              className={`font-semibold px-6 py-3 rounded-lg transition transform ${pressyPrimary}`}
              onClick={() => {
                setActiveModal("deposit");
                resetModalState();
              }}
            >
              Deposit
            </button>

            <button
              className={`font-semibold px-6 py-3 rounded-lg transition transform ${pressyPrimary}`}
              onClick={() => {
                setActiveModal("withdraw");
                resetModalState();
              }}
            >
              Withdraw
            </button>
          </div>

          {/* Transactions */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Transaction History</h2>

              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition transform ${pressySecondary}`}
                onClick={() => {
                  fetchAccounts();
                  fetchTransactions();
                }}
                disabled={txLoading}
              >
                {txLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {txLoading && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
                Loading transactions…
              </div>
            )}

            {txError && !txLoading && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <p className="text-red-400 text-sm">{txError}</p>
              </div>
            )}

            {!txLoading && !txError && txRows.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
                No transactions yet.
              </div>
            )}

            {!txLoading && txRows.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-0 px-6 py-3 text-xs text-slate-400 border-b border-slate-800">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2 text-right">Date</div>
                </div>

                <ul>
                  {txRows.map((t) => {
                    const dir = (t.direction || "").toLowerCase();
                    const isCredit = dir === "credit";
                    const sign = isCredit ? "+" : "-";

                    const desc =
                      (t.description && t.description.trim()) || txLabel(t);

                    return (
                      <li
                        key={t.id}
                        className="px-6 py-4 border-b border-slate-800 last:border-b-0"
                      >
                        <div className="md:grid md:grid-cols-12 md:items-center md:gap-0">
                          <div className="md:col-span-4">
                            <div className="font-medium text-slate-100">
                              {desc}
                            </div>
                            <div className="md:hidden mt-1 text-xs text-slate-400">
                              {txLabel(t)} •{" "}
                              <span className={statusPill(t.status)}>
                                {t.status}
                              </span>
                            </div>
                          </div>

                          <div className="hidden md:block md:col-span-2 text-slate-200">
                            {txLabel(t)}
                          </div>

                          <div className="hidden md:block md:col-span-2">
                            <span className={statusPill(t.status)}>
                              {t.status}
                            </span>
                          </div>

                          <div className="md:col-span-2 md:text-right mt-2 md:mt-0 font-semibold">
                            <span
                              className={
                                isCredit ? "text-emerald-300" : "text-red-300"
                              }
                            >
                              {sign}
                              {formatCurrency(Number(t.amount))}
                            </span>
                          </div>

                          <div className="md:col-span-2 md:text-right mt-2 md:mt-0 text-xs text-slate-400">
                            {formatLocalDateTime(t.posted_at || t.created_at)}
                            {/* {prettyDate(t.posted_at || t.created_at)} */}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 capitalize">
              {activeModal} Funds
            </h3>

            {activeModal === "deposit" && (
              <>
                <label className="block text-sm mb-1">Deposit Type</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as DepositType)}
                  disabled={depositSubmitting}
                >
                  <option value="cash">Cash</option>
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                </select>
              </>
            )}

            <input
              type="text"
              inputMode="decimal"
              placeholder="$0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                const numeric = parseCurrency(e.target.value);
                setAmountValue(isNaN(numeric) ? null : numeric);
              }}
              onBlur={() => {
                if (amountValue !== null) {
                  setAmountInput(formatCurrency(amountValue));
                }
              }}
              disabled={anySubmitting}
            />

            {activeModal === "deposit" && depositError && (
              <p className="text-red-400 text-sm mb-3">{depositError}</p>
            )}

            {activeModal === "withdraw" && withdrawError && (
              <p className="text-red-400 text-sm mb-3">{withdrawError}</p>
            )}

            {activeModal === "deposit" && depositSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{depositSuccess}</p>
            )}

            {activeModal === "withdraw" && withdrawSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{withdrawSuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className={`px-4 py-2 rounded-lg transition transform ${pressySecondary}`}
                onClick={() => {
                  setActiveModal(null);
                  resetModalState();
                }}
                disabled={anySubmitting}
              >
                Cancel
              </button>

              {activeModal === "deposit" && (
                <button
                  className={`px-4 py-2 rounded-lg font-semibold transition transform flex items-center gap-2 ${pressyPrimary}`}
                  onClick={submitDeposit}
                  disabled={depositSubmitting}
                >
                  {depositSubmitting && <Spinner />}
                  {depositSubmitting ? "Submitting…" : "Submit"}
                </button>
              )}

              {activeModal === "withdraw" && (
                <button
                  className={`px-4 py-2 rounded-lg font-semibold transition transform flex items-center gap-2 ${pressyPrimary}`}
                  onClick={submitWithdraw}
                  disabled={withdrawSubmitting}
                >
                  {withdrawSubmitting && <Spinner />}
                  {withdrawSubmitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
