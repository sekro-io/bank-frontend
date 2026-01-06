"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import Spinner from "../components/Spinner";
import { formatCurrency, parseCurrency } from "@/utils/money";

type Account = {
  id: string;
  account_name: string;
  account_type: string;
  account_number: string;
  available_balance: string;
  status: string;
  created_at: string;
};

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
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // --- Create account modal state ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountType, setNewAccountType] =
    useState<"checking" | "savings">("checking");
  const [newAccountName, setNewAccountName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- Loan apply modal state ---
  const [showLoanModal, setShowLoanModal] = useState(false);

  const [requestedAmountInput, setRequestedAmountInput] = useState("");
  const [requestedAmountValue, setRequestedAmountValue] = useState<number | null>(
    null
  );

  const [declaredIncomeInput, setDeclaredIncomeInput] = useState("");
  const [declaredIncomeValue, setDeclaredIncomeValue] = useState<number | null>(
    null
  );

  const [declaredDebtInput, setDeclaredDebtInput] = useState("");
  const [declaredDebtValue, setDeclaredDebtValue] = useState<number | null>(0);

  const [employmentStatus, setEmploymentStatus] = useState<
    "FULL_TIME" | "PART_TIME" | "SELF_EMPLOYED" | "UNEMPLOYED" | "STUDENT" | "RETIRED"
  >("FULL_TIME");

  const [purpose, setPurpose] = useState<
    "DEBT_CONSOLIDATION" | "HOME_IMPROVEMENT" | "AUTO" | "MEDICAL" | "EDUCATION" | "VACATION" | "OTHER"
  >("DEBT_CONSOLIDATION");

  const [destinationAccountId, setDestinationAccountId] = useState("");

  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanSuccess, setLoanSuccess] = useState<string | null>(null);

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
      fetchAccounts();
    }
  }, [loading, isAuthenticated, token]);

  async function fetchUser() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/user`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    if (res.ok) setUser(data.user);
  }

  async function fetchAccounts() {
    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAccounts(data.accounts || []);
    } catch (err: any) {
      setAccountsError(err.message || "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  }

  async function handleCreateAccount() {
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            account_type: newAccountType,
            account_name: newAccountName || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setShowCreateModal(false);
      setNewAccountName("");
      setNewAccountType("checking");

      // 🔄 Refresh accounts after eventual consistency delay
      setTimeout(fetchAccounts, 1000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  }

  // -----------------------
  // Loan apply helpers
  // -----------------------
  const destinationAccountOptions = useMemo(() => accounts, [accounts]);

  function resetLoanModalState() {
    setRequestedAmountInput("");
    setRequestedAmountValue(null);
    setDeclaredIncomeInput("");
    setDeclaredIncomeValue(null);
    setDeclaredDebtInput("");
    setDeclaredDebtValue(0);
    setEmploymentStatus("FULL_TIME");
    setPurpose("DEBT_CONSOLIDATION");
    setDestinationAccountId("");
    setLoanError(null);
    setLoanSuccess(null);
    setLoanSubmitting(false);
  }

  useEffect(() => {
    if (showLoanModal) {
      resetLoanModalState();
      // Set default destination account if available
      if (accounts.length > 0) {
        setDestinationAccountId(accounts[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLoanModal]);

  async function handleApplyForLoan() {
    setLoanError(null);
    setLoanSuccess(null);

    if (!destinationAccountId) {
      setLoanError("Please select a destination account.");
      return;
    }
    if (!requestedAmountValue || requestedAmountValue <= 0) {
      setLoanError("Please enter a valid requested amount.");
      return;
    }
    if (!declaredIncomeValue || declaredIncomeValue <= 0) {
      setLoanError("Please enter a valid declared income.");
      return;
    }
    if (declaredDebtValue === null || declaredDebtValue < 0) {
      setLoanError("Declared debt cannot be negative.");
      return;
    }

    setLoanSubmitting(true);

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
            requested_amount: requestedAmountValue,
            declared_income: declaredIncomeValue,
            declared_debt: declaredDebtValue ?? 0,
            employment_status: employmentStatus,
            purpose: purpose,
            destination_account_id: destinationAccountId,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit loan application");
      }

      setLoanSuccess(
        "Application submitted! We’ll notify you in your inbox once it’s reviewed."
      );

      setTimeout(() => {
        setShowLoanModal(false);
        resetLoanModalState();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setLoanError(err?.message || "Failed to submit loan application");
    } finally {
      setLoanSubmitting(false);
    }
  }

  const canSubmitLoan =
    !loanSubmitting &&
    !accountsLoading &&
    accounts.length > 0 &&
    destinationAccountId &&
    requestedAmountValue !== null &&
    requestedAmountValue > 0 &&
    declaredIncomeValue !== null &&
    declaredIncomeValue > 0 &&
    declaredDebtValue !== null &&
    declaredDebtValue >= 0;

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
            <p className="text-slate-400 mt-1">
              Here’s a snapshot of your accounts
            </p>
          </div>

          {/* Accounts */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {user ? `${user.firstName}’s Accounts` : "Your Accounts"}
              </h2>

              <div className="flex items-center gap-3">
                <button
                  className="bg-slate-800 text-slate-50 font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition border border-slate-700"
                  onClick={() => setShowLoanModal(true)}
                >
                  Apply for a Loan
                </button>

                <button
                  className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Open New Account
                </button>
              </div>
            </div>

            {accountsLoading && (
              <p className="text-slate-400">Loading accounts…</p>
            )}

            {accountsError && (
              <p className="text-red-400 text-sm">{accountsError}</p>
            )}

            {!accountsLoading && accounts.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400">
                You don’t have any accounts yet.
              </div>
            )}

            <div className="flex flex-col gap-4">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => router.push(`/accounts/${account.id}`)}
                  className="text-left bg-slate-900 border border-slate-800
                             rounded-2xl p-6 flex justify-between items-center
                             hover:border-brand-aqua hover:bg-slate-800
                             transition"
                >
                  <div>
                    <p className="text-slate-400 text-sm">
                      {account.account_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {account.account_type} • {account.status}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Account #{account.account_number}
                    </p>
                  </div>

                  <p className="text-2xl font-semibold">
                    $
                    {Number(account.available_balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Open New Account</h3>

            <label className="block text-sm mb-1">Account Type</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
              value={newAccountType}
              onChange={(e) =>
                setNewAccountType(e.target.value as "checking" | "savings")
              }
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>

            <label className="block text-sm mb-1">
              Account Name (optional)
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
              placeholder="e.g. Emergency Fund"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
            />

            {createError && (
              <p className="text-red-400 text-sm mb-3">{createError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => setShowCreateModal(false)}
                disabled={createLoading}
              >
                Cancel
              </button>

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                onClick={handleCreateAccount}
                disabled={createLoading}
              >
                {createLoading ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loan Application Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Apply for a Loan</h3>

            {accountsLoading && (
              <p className="text-slate-400 text-sm mb-3">Loading accounts…</p>
            )}

            {!accountsLoading && destinationAccountOptions.length === 0 && (
              <p className="text-slate-400 text-sm mb-3">
                You need at least one account to apply for a loan.
              </p>
            )}

            {!accountsLoading && destinationAccountOptions.length > 0 && (
              <>
                <label className="block text-sm mb-1">Destination Account</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  disabled={loanSubmitting}
                >
                  {destinationAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">Purpose</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={purpose}
                  onChange={(e) =>
                    setPurpose(
                      e.target.value as
                        | "DEBT_CONSOLIDATION"
                        | "HOME_IMPROVEMENT"
                        | "AUTO"
                        | "MEDICAL"
                        | "EDUCATION"
                        | "VACATION"
                        | "OTHER"
                    )
                  }
                  disabled={loanSubmitting}
                >
                  <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
                  <option value="HOME_IMPROVEMENT">Home Improvement</option>
                  <option value="AUTO">Auto</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="EDUCATION">Education</option>
                  <option value="VACATION">Vacation</option>
                  <option value="OTHER">Other</option>
                </select>

                <label className="block text-sm mb-1">Employment Status</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={employmentStatus}
                  onChange={(e) =>
                    setEmploymentStatus(
                      e.target.value as
                        | "FULL_TIME"
                        | "PART_TIME"
                        | "SELF_EMPLOYED"
                        | "UNEMPLOYED"
                        | "STUDENT"
                        | "RETIRED"
                    )
                  }
                  disabled={loanSubmitting}
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="SELF_EMPLOYED">Self-employed</option>
                  <option value="UNEMPLOYED">Unemployed</option>
                  <option value="STUDENT">Student</option>
                  <option value="RETIRED">Retired</option>
                </select>

                <label className="block text-sm mb-1">Requested Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={requestedAmountInput}
                  onChange={(e) => {
                    setRequestedAmountInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setRequestedAmountValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (requestedAmountValue !== null) {
                      setRequestedAmountInput(formatCurrency(requestedAmountValue));
                    }
                  }}
                  disabled={loanSubmitting}
                />

                <label className="block text-sm mb-1">Declared Income</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={declaredIncomeInput}
                  onChange={(e) => {
                    setDeclaredIncomeInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setDeclaredIncomeValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (declaredIncomeValue !== null) {
                      setDeclaredIncomeInput(formatCurrency(declaredIncomeValue));
                    }
                  }}
                  disabled={loanSubmitting}
                />

                <label className="block text-sm mb-1">Declared Debt (optional)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={declaredDebtInput}
                  onChange={(e) => {
                    setDeclaredDebtInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setDeclaredDebtValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (declaredDebtValue !== null) {
                      setDeclaredDebtInput(formatCurrency(declaredDebtValue));
                    }
                  }}
                  disabled={loanSubmitting}
                />
              </>
            )}

            {loanError && (
              <p className="text-red-400 text-sm mb-3">{loanError}</p>
            )}

            {loanSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{loanSuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                onClick={() => {
                  setShowLoanModal(false);
                  resetLoanModalState();
                }}
                disabled={loanSubmitting}
              >
                Cancel
              </button>

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition flex items-center gap-2"
                onClick={handleApplyForLoan}
                disabled={!canSubmitLoan}
              >
                {loanSubmitting && <Spinner />}
                {loanSubmitting ? "Submitting…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
