"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoanReviewTask = {
  taskId: string;
  state: string;
  displayName?: string;
  loan_application_id?: string;
  user_id?: string;
  requested_amount?: number;
  purpose?: string;
  employment_status?: string;
  createdOn?: number;
  updatedOn?: number;
  claimant?: {
    userType?: string;
    user?: string;
  } | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [tasks, setTasks] = useState<LoanReviewTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("sekro_admin_token");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    setToken(t);
  }, [router]);

  async function fetchLoanReviewTasks(adminToken: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/employee/loan-review/tasks`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load loan review tasks");
      }

      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load loan review tasks");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Fetch tasks once token exists
  useEffect(() => {
    if (!token) return;
    fetchLoanReviewTasks(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => (b.createdOn || 0) - (a.createdOn || 0));
    return copy;
  }, [tasks]);

  if (!token) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">Sekro Bank Employee Portal</h1>
            <p className="text-slate-400 mt-2">
              Internal tools for loan officers and bank staff.
            </p>
          </div>

          <button
            className="rounded-full border border-slate-700 px-4 py-1.5 text-sm hover:bg-slate-900 transition"
            onClick={() => {
              localStorage.removeItem("sekro_admin_token");
              router.push("/admin/login");
            }}
          >
            Log out
          </button>
        </div>

        {/* Pending Applications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Pending Applications</h2>
              <p className="text-sm text-slate-400 mt-1">
                Human tasks requiring loan officer review.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {sortedTasks.length} task{sortedTasks.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => token && fetchLoanReviewTasks(token)}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading && (
            <p className="text-sm text-slate-400">Loading pending tasks…</p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && sortedTasks.length === 0 && (
            <div className="text-sm text-slate-400 py-6">
              No pending loan review tasks right now.
            </div>
          )}

          {!loading && !error && sortedTasks.length > 0 && (
            <div className="divide-y divide-slate-800">
              {sortedTasks.map((task) => {
                const claimedBy = task.claimant?.user || null;

                return (
                  <button
                    key={task.taskId}
                    className="w-full text-left px-2 py-4 hover:bg-slate-800 transition rounded-lg"
                    onClick={() =>
                      router.push(`/admin/loan-review/${task.taskId}`)
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-100">
                          Loan Application{" "}
                          <span className="text-slate-400 font-normal text-sm">
                            {task.loan_application_id?.slice(0, 8)}…
                          </span>
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          Requested:{" "}
                          <span className="text-slate-300 font-medium">
                            ${Number(task.requested_amount || 0).toLocaleString()}
                          </span>{" "}
                          • Purpose:{" "}
                          <span className="text-slate-300 font-medium capitalize">
                            {task.purpose?.replaceAll("_", " ") || "—"}
                          </span>{" "}
                          • Employment:{" "}
                          <span className="text-slate-300 font-medium capitalize">
                            {task.employment_status?.replaceAll("_", " ") || "—"}
                          </span>
                        </p>

                        <p className="text-xs text-slate-600 mt-2">
                          Created:{" "}
                          {task.createdOn
                            ? new Date(task.createdOn).toLocaleString()
                            : "—"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-xs">
                        <span className="px-2 py-1 rounded-full border border-slate-700 text-slate-200">
                          {task.state}
                        </span>

                        {claimedBy ? (
                          <span className="text-slate-400">
                            Claimed by{" "}
                            <span className="text-slate-200 font-medium">
                              {claimedBy}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Unclaimed</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
