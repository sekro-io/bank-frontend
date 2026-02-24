"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../components/TopNav";

// ─── Config from environment variables ────────────────────────────────────────
// Add the following to your .env.local and restart the dev server:
//
//   NEXT_PUBLIC_ORKES_CLUSTER_URL=https://your-cluster.orkesconductor.io
//   ORKES_KEY_ID=<your application key id>       ← server-only
//   ORKES_KEY_SECRET=<your application key secret> ← server-only
//
// Tokens are generated and cached automatically in the API proxy route.
// Neither the key, secret, nor token ever reaches the browser.

const CLUSTER_URL = process.env.NEXT_PUBLIC_ORKES_CLUSTER_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskState = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT" | "DELETED";

interface Assignee {
  userType: "CONDUCTOR_USER" | "EXTERNAL_USER" | "CONDUCTOR_GROUP" | "EXTERNAL_GROUP";
  user: string;
}

interface HumanTask {
  taskId: string;
  state: TaskState;
  displayName: string;
  definitionName: string;
  workflowId: string;
  workflowName: string;
  taskRefName: string;
  assignee?: Assignee;
  claimant?: Assignee;
  createdBy: string;
  updatedBy: string;
  createdOn?: number;
  updatedOn?: number;
}

interface SearchResponse {
  totalHits: number;
  results: HumanTask[];
}

// ─── State Badge ──────────────────────────────────────────────────────────────

const STATE_STYLES: Record<TaskState, { bg: string; text: string; dot: string }> = {
  PENDING:     { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400"   },
  ASSIGNED:    { bg: "bg-blue-500/10",    text: "text-blue-400",    dot: "bg-blue-400"    },
  IN_PROGRESS: { bg: "bg-violet-500/10",  text: "text-violet-400",  dot: "bg-violet-400"  },
  COMPLETED:   { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  TIMED_OUT:   { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400"     },
  DELETED:     { bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400"   },
};

function StateBadge({ state }: { state: TaskState }) {
  const s = STATE_STYLES[state] ?? STATE_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {state.replace("_", " ")}
    </span>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskPanel({ task, onClose }: { task: HumanTask; onClose: () => void }) {
  const orkesUrl    = `${CLUSTER_URL}/human/task/${task.taskId}`;
  const workflowUrl = `${CLUSTER_URL}/execution/${task.workflowId}`;

  const rows: [string, React.ReactNode][] = [
    ["Task ID",      <code key="tid" className="text-indigo-300 text-xs">{task.taskId}</code>],
    ["State",        <StateBadge key="state" state={task.state} />],
    ["Display Name", task.displayName],
    ["Definition",   task.definitionName],
    ["Task Ref",     task.taskRefName],
    ["Workflow",     task.workflowName],
    ["Workflow ID",  <code key="wid" className="text-indigo-300 text-xs">{task.workflowId}</code>],
    ["Assignee",     task.assignee ? `${task.assignee.user} (${task.assignee.userType})` : "—"],
    ["Claimant",     task.claimant ? `${task.claimant.user} (${task.claimant.userType})` : "—"],
    ["Created By",   task.createdBy],
  ];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0f1117] border-l border-[#2a2d3a] flex flex-col overflow-hidden shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#2a2d3a]">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Human Task</p>
            <h3 className="text-lg font-semibold text-white leading-tight">{task.displayName}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <dl className="space-y-4">
            {rows.map(([label, value]) => (
              <div key={String(label)} className="flex flex-col gap-0.5">
                <dt className="text-xs text-slate-500 uppercase tracking-wider">{label}</dt>
                <dd className="text-sm text-slate-200 break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2d3a] flex flex-col gap-3">
          <a
            href={orkesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 text-sm transition"
          >
            Open Task in Orkes
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#1a1d27] hover:bg-[#22263a] border border-[#2a2d3a] text-slate-300 font-medium rounded-lg py-2.5 text-sm transition"
          >
            View Workflow Execution
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Misconfigured Banner ─────────────────────────────────────────────────────

function MisconfiguredBanner() {
  return (
    <div className="min-h-screen bg-[#080a0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0f1117] border border-amber-500/30 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Environment variables missing</h2>
        <p className="text-sm text-slate-400 mb-6">
          Add the following to your{" "}
          <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded">.env.local</code>{" "}
          and restart the dev server:
        </p>
        <pre className="text-left bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
{`NEXT_PUBLIC_ORKES_CLUSTER_URL=https://your-cluster.orkesconductor.io
ORKES_KEY_ID=<your application key id>
ORKES_KEY_SECRET=<your application key secret>`}
        </pre>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_STATES: TaskState[] = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TIMED_OUT"];

export default function HumanTasksPage() {
  if (!CLUSTER_URL) return <MisconfiguredBanner />;
  return <HumanTasksView />;
}

function HumanTasksView() {
  const [tasks, setTasks]         = useState<HumanTask[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<HumanTask | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [searchText, setSearchText]     = useState("");
  const [stateFilters, setStateFilters] = useState<TaskState[]>(["ASSIGNED", "IN_PROGRESS", "PENDING"]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/human/tasks/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          size: pageSize,
          start: page * pageSize,
          states: stateFilters.length > 0 ? stateFilters : undefined,
          fullTextQuery: searchText || "",
          taskOutputQuery: "",
          taskInputQuery: "",
          definitionNames: [],
          taskRefNames: [],
          displayNames: [],
          claimants: [],
          assignees: [],
          workflowIds: [],
          searchType: "INBOX",
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
      }

      const data: SearchResponse = await resp.json();
      setTasks(data.results ?? []);
      setTotalHits(data.totalHits ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, stateFilters, searchText]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleState = (s: TaskState) => {
    setStateFilters((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    setPage(0);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(totalHits / pageSize);

  return (
    <>
      <TopNav />
      {selectedTask && <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}

      <div className="min-h-screen bg-[#080a0f] text-white font-sans">
        {/* Topbar */}
        <header className="border-b border-[#1e2130] bg-[#0b0d15]/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs bg-[#1a1d27] border border-[#2a2d3a] hover:border-indigo-500 text-slate-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full bg-[#1a1d27] border border-[#2a2d3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                placeholder="Search tasks…"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
                onKeyDown={(e) => e.key === "Enter" && fetchTasks()}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_STATES.map((s) => {
                const active = stateFilters.includes(s);
                const st = STATE_STYLES[s];
                return (
                  <button
                    key={s}
                    onClick={() => toggleState(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      active
                        ? `${st.bg} ${st.text} border-current`
                        : "bg-[#1a1d27] text-slate-500 border-[#2a2d3a] hover:border-slate-500"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? st.dot : "bg-slate-600"}`} />
                    {s.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
                  Loading…
                </span>
              ) : (
                <>
                  <span className="text-white font-medium">{totalHits.toLocaleString()}</span>{" "}
                  task{totalHits !== 1 ? "s" : ""} found
                  {selectedIds.size > 0 && (
                    <> · <span className="text-indigo-400">{selectedIds.size} selected</span></>
                  )}
                </>
              )}
            </p>
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-white transition">
                Clear selection
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          )}

          {/* Table */}
          {!loading && tasks.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">No human tasks found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1e2130] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0f1117] border-b border-[#1e2130]">
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        className="accent-indigo-500 w-4 h-4"
                        checked={tasks.length > 0 && tasks.every((t) => selectedIds.has(t.taskId))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(tasks.map((t) => t.taskId)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    {["Display Name", "State", "Workflow", "Assignee", "Definition", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1d27]">
                  {tasks.map((task) => {
                    const isSelected = selectedIds.has(task.taskId);
                    return (
                      <tr
                        key={task.taskId}
                        className={`group transition-colors cursor-pointer ${isSelected ? "bg-indigo-600/10" : "hover:bg-[#0f1117]"}`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="accent-indigo-500 w-4 h-4" checked={isSelected} onChange={() => toggleSelect(task.taskId)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{task.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">{task.taskId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StateBadge state={task.state} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300">{task.workflowName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[140px]">{task.workflowId}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {task.assignee ? (
                            <div>
                              <div className="text-slate-300">{task.assignee.user}</div>
                              <div className="text-xs text-slate-500">{task.assignee.userType}</div>
                            </div>
                          ) : (
                            <span className="text-slate-600">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-mono">{task.definitionName}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                            className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-white text-xs flex items-center gap-1 ml-auto"
                          >
                            Open
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">
                Page {page + 1} of {totalPages} · showing {tasks.length} of {totalHits}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-slate-300 disabled:opacity-40 hover:border-indigo-500 transition"
                >
                  ← Previous
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-slate-300 disabled:opacity-40 hover:border-indigo-500 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
