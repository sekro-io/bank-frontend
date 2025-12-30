"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "../components/TopNav";

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

              <button
                className="bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                onClick={() => setShowCreateModal(true)}
              >
                + Open New Account
              </button>
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
            <h3 className="text-xl font-semibold mb-4">
              Open New Account
            </h3>

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
    </>
  );
}
