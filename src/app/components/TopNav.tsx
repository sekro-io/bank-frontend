"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Spinner from "./Spinner";
import InboxDropdown from "./InboxDropdown"; // ✅ ADD THIS
import { formatCurrency, parseCurrency } from "@/utils/money";

type Account = {
  id: string;
  account_name: string;
  account_type: string;
  account_number: string;
  available_balance: string;
  status: string;
};

export default function TopNav() {
  const { logout, token } = useAuth();
  const router = useRouter();

  // -----------------------
  // Transfer modal state
  // -----------------------
  const [transferOpen, setTransferOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [memo, setMemo] = useState("");

  // 💵 Money input
  const [amountInput, setAmountInput] = useState("");
  const [amountValue, setAmountValue] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // -----------------------
  // ✅ NEW: External transfer (Send Funds) modal state
  // -----------------------
  const [sendOpen, setSendOpen] = useState(false);

  const [sendFromAccount, setSendFromAccount] = useState("");
  const [recipientRoutingNumber, setRecipientRoutingNumber] = useState("");
  const [recipientAccountLast4, setRecipientAccountLast4] = useState("");
  const [sendMemo, setSendMemo] = useState("");

  const [sendAmountInput, setSendAmountInput] = useState("");
  const [sendAmountValue, setSendAmountValue] = useState<number | null>(null);

  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [sendSubmitError, setSendSubmitError] = useState<string | null>(null);
  const [sendSubmitSuccess, setSendSubmitSuccess] = useState<string | null>(
    null
  );

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

  function resetTransferState() {
    setFromAccount("");
    setToAccount("");
    setMemo("");
    setAmountInput("");
    setAmountValue(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(false);
  }

  // ✅ NEW
  function resetSendState() {
    setSendFromAccount("");
    setRecipientRoutingNumber("");
    setRecipientAccountLast4("");
    setSendMemo("");
    setSendAmountInput("");
    setSendAmountValue(null);
    setSendSubmitError(null);
    setSendSubmitSuccess(null);
    setSendSubmitting(false);
  }

  async function fetchAccountsForTransfer() {
    if (!token) return;

    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/accounts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch accounts");

      const list = data.accounts || [];
      setAccounts(list);

      // Default selections
      if (list.length > 0) {
        setFromAccount(list[0].id);
        if (list.length > 1) {
          setToAccount(list[1].id);
        }
      }

      // ✅ NEW: default for Send Funds
      if (list.length > 0) {
        setSendFromAccount(list[0].id);
      }
    } catch (err: any) {
      setAccountsError(err?.message || "Failed to fetch accounts");
    } finally {
      setAccountsLoading(false);
    }
  }

  // Open transfer modal → load accounts
  useEffect(() => {
    if (transferOpen) {
      resetTransferState();
      fetchAccountsForTransfer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferOpen]);

  // ✅ NEW: Open send modal → load accounts
  useEffect(() => {
    if (sendOpen) {
      resetSendState();
      fetchAccountsForTransfer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendOpen]);

  const toAccountOptions = useMemo(() => {
    return accounts.filter((a) => a.id !== fromAccount);
  }, [accounts, fromAccount]);

  useEffect(() => {
    if (!toAccount) return;
    if (toAccount === fromAccount) setToAccount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAccount]);

  async function submitTransfer() {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!fromAccount) {
      setSubmitError("Please select a From account.");
      return;
    }
    if (!toAccount) {
      setSubmitError("Please select a To account.");
      return;
    }
    if (fromAccount === toAccount) {
      setSubmitError("From and To accounts must be different.");
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setSubmitError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/transfers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            from_account_id: fromAccount,
            to_account_id: toAccount,
            amount: amountValue,
            description: memo || "", // optional memo
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Transfer failed");
      }

      setSubmitSuccess(data?.message || "Transfer successful!");

      setTimeout(() => {
        setTransferOpen(false);
        resetTransferState();
        window.location.reload();
      }, 900);
    } catch (err: any) {
      setSubmitError(err?.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ✅ NEW
  async function submitExternalTransfer() {
    setSendSubmitError(null);
    setSendSubmitSuccess(null);

    if (!sendFromAccount) {
      setSendSubmitError("Please select a Pay from account.");
      return;
    }
    if (!sendAmountValue || sendAmountValue <= 0) {
      setSendSubmitError("Please enter a valid amount.");
      return;
    }
    if (!recipientRoutingNumber.trim()) {
      setSendSubmitError("Recipient routing number is required.");
      return;
    }
    if (!recipientAccountLast4.trim() || recipientAccountLast4.trim().length !== 4) {
      setSendSubmitError("Recipient account last 4 must be exactly 4 digits.");
      return;
    }

    setSendSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/transfers/external`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            from_account_id: sendFromAccount,
            amount: sendAmountValue,
            recipient_routing_number: recipientRoutingNumber.trim(),
            recipient_account_last4: recipientAccountLast4.trim(),
            memo: sendMemo || "",
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "External transfer failed");
      }

      setSendSubmitSuccess(
        data?.message || "External transfer submitted! Waiting for approval…"
      );

      setTimeout(() => {
        setSendOpen(false);
        resetSendState();
        window.location.reload();
      }, 900);
    } catch (err: any) {
      setSendSubmitError(err?.message || "External transfer failed");
    } finally {
      setSendSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    !accountsLoading &&
    accounts.length >= 2 &&
    fromAccount &&
    toAccount &&
    fromAccount !== toAccount &&
    amountValue !== null &&
    amountValue > 0;

  // ✅ NEW
  const canSubmitSend =
    !sendSubmitting &&
    !accountsLoading &&
    accounts.length >= 1 &&
    sendFromAccount &&
    sendAmountValue !== null &&
    sendAmountValue > 0 &&
    recipientRoutingNumber.trim().length > 0 &&
    recipientAccountLast4.trim().length === 4;

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-brand-pink flex items-center justify-center text-slate-900 font-bold">
              SB
            </div>
            <span className="text-lg font-semibold text-slate-100">
              Sekro Bank
            </span>
          </Link>

          {/* Actions */}
          {token ? (
            <div className="flex items-center gap-3">
              {/* Inbox dropdown */}
              <InboxDropdown />

              {/* Send Funds */}
              <button
                onClick={() => setSendOpen(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition transform ${pressyPrimary}`}
              >
                Send
              </button>

              <button
                onClick={() => setTransferOpen(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition transform ${pressyPrimary}`}
              >
                Transfer
              </button>

              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className={`rounded-full px-4 py-1.5 text-sm transition transform ${pressySecondary}`}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/*Send Funds Modal */}
      {sendOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Send Funds</h3>

            {accountsLoading && (
              <p className="text-slate-400 text-sm mb-3">Loading accounts…</p>
            )}

            {accountsError && (
              <p className="text-red-400 text-sm mb-3">{accountsError}</p>
            )}

            {!accountsLoading && accounts.length < 1 && (
              <p className="text-slate-400 text-sm mb-3">
                You need at least one account to send funds.
              </p>
            )}

            {!accountsLoading && accounts.length >= 1 && (
              <>
                <label className="block text-sm mb-1">Pay from</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={sendFromAccount}
                  onChange={(e) => setSendFromAccount(e.target.value)}
                  disabled={sendSubmitting}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">Recipient routing number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 123456789"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={recipientRoutingNumber}
                  onChange={(e) => setRecipientRoutingNumber(e.target.value)}
                  disabled={sendSubmitting}
                />

                <label className="block text-sm mb-1">Recipient account last 4</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 4321"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={recipientAccountLast4}
                  onChange={(e) => setRecipientAccountLast4(e.target.value)}
                  disabled={sendSubmitting}
                />

                <label className="block text-sm mb-1">Memo (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rent, dinner, reimbursement…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={sendMemo}
                  onChange={(e) => setSendMemo(e.target.value)}
                  disabled={sendSubmitting}
                />

                <label className="block text-sm mb-1">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={sendAmountInput}
                  onChange={(e) => {
                    setSendAmountInput(e.target.value);
                    const numeric = parseCurrency(e.target.value);
                    setSendAmountValue(isNaN(numeric) ? null : numeric);
                  }}
                  onBlur={() => {
                    if (sendAmountValue !== null) {
                      setSendAmountInput(formatCurrency(sendAmountValue));
                    }
                  }}
                  disabled={sendSubmitting}
                />
              </>
            )}

            {/* Errors */}
            {sendSubmitError && (
              <p className="text-red-400 text-sm mb-3">{sendSubmitError}</p>
            )}

            {/* Success */}
            {sendSubmitSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{sendSubmitSuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className={`px-4 py-2 rounded-lg transition transform ${pressySecondary}`}
                onClick={() => {
                  setSendOpen(false);
                  resetSendState();
                }}
                disabled={sendSubmitting}
              >
                Cancel
              </button>

              <button
                className={`px-4 py-2 rounded-lg font-semibold transition transform flex items-center gap-2 ${pressyPrimary}`}
                onClick={submitExternalTransfer}
                disabled={!canSubmitSend}
              >
                {sendSubmitting && <Spinner />}
                {sendSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Transfer Funds</h3>

            {accountsLoading && (
              <p className="text-slate-400 text-sm mb-3">Loading accounts…</p>
            )}

            {accountsError && (
              <p className="text-red-400 text-sm mb-3">{accountsError}</p>
            )}

            {!accountsLoading && accounts.length < 2 && (
              <p className="text-slate-400 text-sm mb-3">
                You need at least two accounts to make a transfer.
              </p>
            )}

            {!accountsLoading && accounts.length >= 2 && (
              <>
                <label className="block text-sm mb-1">From Account</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={fromAccount}
                  onChange={(e) => {
                    const nextFrom = e.target.value;
                    setFromAccount(nextFrom);
                    if (toAccount === nextFrom) setToAccount("");
                  }}
                  disabled={submitting}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">To Account</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Select destination account…
                  </option>
                  {toAccountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} • ****{a.account_number?.slice(-4)} •{" "}
                      {formatCurrency(Number(a.available_balance))}
                    </option>
                  ))}
                </select>

                <label className="block text-sm mb-1">Memo (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rent, groceries, savings…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={submitting}
                />

                <label className="block text-sm mb-1">Amount</label>
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
                  disabled={submitting}
                />
              </>
            )}

            {/* Errors */}
            {submitError && (
              <p className="text-red-400 text-sm mb-3">{submitError}</p>
            )}

            {/* Success */}
            {submitSuccess && (
              <p className="text-emerald-400 text-sm mb-3">{submitSuccess}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                className={`px-4 py-2 rounded-lg transition transform ${pressySecondary}`}
                onClick={() => {
                  setTransferOpen(false);
                  resetTransferState();
                }}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                className={`px-4 py-2 rounded-lg font-semibold transition transform flex items-center gap-2 ${pressyPrimary}`}
                onClick={submitTransfer}
                disabled={!canSubmit}
              >
                {submitting && <Spinner />}
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
