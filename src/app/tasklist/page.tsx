"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "../components/TopNav";

// ─── Config ───────────────────────────────────────────────────────────────────
// .env.local:
//   NEXT_PUBLIC_ORKES_CLUSTER_URL=https://your-cluster.orkesconductor.io
//   ORKES_KEY_ID=<key id>
//   ORKES_KEY_SECRET=<key secret>

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
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  fullTemplate?: FormTemplate;
  humanTaskDef?: {
    fullTemplate?: FormTemplate;
    userFormTemplate?: { name: string; version: number };
    [k: string]: unknown;
  };
}

interface SearchResponse {
  totalHits: number;
  results: HumanTask[];
}

// ─── Form schema types (JSON Forms / Orkes templateUI) ────────────────────────

interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "integer";
  enum?: string[];
  title?: string;
}

interface JsonSchema {
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface UIElement {
  type: "Control" | "VerticalLayout" | "HorizontalLayout" | "Group" | "Label";
  scope?: string; // e.g. "#/properties/approve"
  label?: string;
  text?: string;
  options?: { readonly?: boolean; multi?: boolean; [k: string]: unknown };
  elements?: UIElement[];
}

interface FormTemplate {
  name: string;
  version: number;
  jsonSchema: JsonSchema;
  templateUI: UIElement;
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

// ─── Form Field ───────────────────────────────────────────────────────────────

function FormField({
  fieldKey,
  schema,
  label,
  readonly,
  value,
  onChange,
  required,
  error,
}: {
  fieldKey: string;
  schema: JsonSchemaProperty;
  label: string;
  readonly: boolean;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  required: boolean;
  error?: string;
}) {
  const baseInput = "w-full bg-[#1a1d27] border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed";
  const borderClass = error ? "border-red-500" : "border-[#2a2d3a] focus:border-indigo-500";

  const renderInput = () => {
    if (schema.type === "boolean") {
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => !readonly && onChange(fieldKey, !value)}
            className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-indigo-600" : "bg-[#2a2d3a]"} ${readonly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-sm text-slate-300">{value ? "Yes" : "No"}</span>
        </label>
      );
    }

    if (schema.enum && schema.enum.length > 0) {
      return (
        <select
          disabled={readonly}
          value={String(value ?? "")}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`${baseInput} ${borderClass}`}
        >
          <option value="">Select…</option>
          {schema.enum.map((opt) => (
            <option key={opt} value={opt}>{opt.trim()}</option>
          ))}
        </select>
      );
    }

    if (schema.type === "number" || schema.type === "integer") {
      return (
        <input
          type="number"
          disabled={readonly}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(fieldKey, e.target.value === "" ? "" : Number(e.target.value))}
          className={`${baseInput} ${borderClass}`}
        />
      );
    }

    // Default: string / textarea for long values
    return (
      <textarea
        disabled={readonly}
        rows={2}
        value={String(value ?? "")}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`${baseInput} ${borderClass} resize-none`}
      />
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400">*</span>}
        {readonly && (
          <span className="ml-1 text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-normal normal-case tracking-normal">
            read-only
          </span>
        )}
      </label>
      {renderInput()}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── UI Element renderer (recursive, handles layouts) ────────────────────────

function RenderUIElement({
  element,
  schema,
  values,
  onChange,
  required,
  errors,
}: {
  element: UIElement;
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (key: string, val: unknown) => void;
  required: Set<string>;
  errors: Record<string, string>;
}) {
  if (element.type === "Control" && element.scope) {
    const fieldKey = element.scope.replace("#/properties/", "");
    const fieldSchema = schema.properties[fieldKey];
    if (!fieldSchema) return null;

    return (
      <FormField
        fieldKey={fieldKey}
        schema={fieldSchema}
        label={element.label ?? fieldKey}
        readonly={element.options?.readonly === true}
        value={values[fieldKey]}
        onChange={onChange}
        required={required.has(fieldKey)}
        error={errors[fieldKey]}
      />
    );
  }

  if (element.type === "Label" || element.type === "Group") {
    return (
      <div>
        {element.text && <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{element.text}</p>}
        {element.label && <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{element.label}</p>}
        <div className="flex flex-col gap-5">
          {element.elements?.map((child, i) => (
            <RenderUIElement key={i} element={child} schema={schema} values={values} onChange={onChange} required={required} errors={errors} />
          ))}
        </div>
      </div>
    );
  }

  if (element.type === "HorizontalLayout") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {element.elements?.map((child, i) => (
          <RenderUIElement key={i} element={child} schema={schema} values={values} onChange={onChange} required={required} errors={errors} />
        ))}
      </div>
    );
  }

  // VerticalLayout (default)
  return (
    <div className="flex flex-col gap-5">
      {element.elements?.map((child, i) => (
        <RenderUIElement key={i} element={child} schema={schema} values={values} onChange={onChange} required={required} errors={errors} />
      ))}
    </div>
  );
}

// ─── Task Form Panel ──────────────────────────────────────────────────────────

function TaskFormPanel({
  task,
  onClose,
  onCompleted,
}: {
  task: HumanTask;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [detail, setDetail] = useState<HumanTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // Fetch full task details + template
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/human/tasks?taskId=${task.taskId}`)
      .then((r) => r.json())
      .then((data: HumanTask & { error?: string }) => {
        if (data.error) throw new Error(data.error);

        // fullTemplate is nested under humanTaskDef, not at the top level
        const fullTemplate = data.humanTaskDef?.fullTemplate ?? null;

        // Build prefill: start from input (initial values set by workflow),
        // then overlay output (values saved by a previous draft save).
        // This ensures reopening a task after "Save draft" restores what was typed.
        const skip = (k: string) => k.startsWith("__") || k === "_createdBy";
        const prefill: Record<string, unknown> = {};

        if (data.input) {
          for (const [k, v] of Object.entries(data.input)) {
            if (!skip(k)) prefill[k] = v;
          }
        }
        // Overlay saved draft output on top so it takes precedence over input
        const rawOutput = data.output;
        if (rawOutput) {
          for (const [k, v] of Object.entries(rawOutput)) {
            if (!skip(k)) prefill[k] = v;
          }
        }

        setDetail({ ...data, fullTemplate });
        setValues(prefill);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [task.taskId]);

  const handleChange = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const validate = (template: FormTemplate): boolean => {
    const errs: Record<string, string> = {};
    const req = new Set(template.jsonSchema.required ?? []);
    for (const field of req) {
      const v = values[field];
      if (v === undefined || v === null || v === "") {
        errs[field] = "This field is required";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (complete: boolean) => {
    if (!detail?.fullTemplate) return;
    if (complete && !validate(detail.fullTemplate)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch(`/api/human/tasks?taskId=${task.taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output: values, complete }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Submission failed");
      setDone(true);
      setTimeout(() => { onCompleted(); onClose(); }, 1500);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const template = detail?.fullTemplate;
  const requiredFields = new Set(template?.jsonSchema.required ?? []);
  const isCompleted = detail?.state === "COMPLETED";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-lg bg-[#0f1117] border-l border-[#2a2d3a] flex flex-col overflow-hidden shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#2a2d3a] shrink-0">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
              {task.workflowName}
            </p>
            <h3 className="text-lg font-semibold text-white leading-tight">{task.displayName}</h3>
            <div className="flex items-center gap-2 mt-2">
              <StateBadge state={detail?.state ?? task.state} />
              {task.assignee && (
                <span className="text-xs text-slate-500">→ {task.assignee.user}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success state */}
          {done && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Task completed</p>
              <p className="text-sm text-slate-400 mt-1">The workflow will continue shortly.</p>
            </div>
          )}

          {/* Loading */}
          {!done && loading && (
            <div className="flex flex-col gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-[#2a2d3a] rounded mb-2" />
                  <div className="h-9 bg-[#1a1d27] rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error loading */}
          {!done && !loading && error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <strong className="font-semibold">Failed to load form:</strong> {error}
            </div>
          )}

          {/* Form */}
          {!done && !loading && !error && template && (
            <div className="flex flex-col gap-6">
              {isCompleted && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  This task is already completed. Fields are shown read-only.
                </div>
              )}
              <RenderUIElement
                element={template.templateUI}
                schema={template.jsonSchema}
                values={values}
                onChange={handleChange}
                required={isCompleted ? new Set() : requiredFields}
                errors={fieldErrors}
              />
            </div>
          )}

          {/* No template fallback */}
          {!done && !loading && !error && !template && (
            <div className="text-sm text-slate-400 text-center py-12">
              No form template attached to this task.
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && !loading && !error && template && !isCompleted && (
          <div className="p-6 border-t border-[#2a2d3a] flex flex-col gap-3 shrink-0">
            {submitError && (
              <p className="text-xs text-red-400 text-center">{submitError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 bg-[#1a1d27] hover:bg-[#22263a] border border-[#2a2d3a] text-slate-300 font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : "Complete task"}
              </button>
            </div>
          </div>
        )}
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
          <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded">.env.local</code>:
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
  const [tasks, setTasks]               = useState<HumanTask[]>([]);
  const [totalHits, setTotalHits]       = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [openTask, setOpenTask]         = useState<HumanTask | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [searchText, setSearchText]     = useState("");
  const [stateFilters, setStateFilters] = useState<TaskState[]>(["ASSIGNED", "IN_PROGRESS", "PENDING"]);
  const [page, setPage]                 = useState(0);
  const pageSize = 20;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/human/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          searchType: "ADMIN",
        }),
      });
      const data: SearchResponse & { error?: string } = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Search failed");
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
      {openTask && (
        <TaskFormPanel
          task={openTask}
          onClose={() => setOpenTask(null)}
          onCompleted={fetchTasks}
        />
      )}

      <div className="min-h-screen bg-[#080a0f] text-white font-sans">
        {/* Topbar */}
        <header className="border-b border-[#1e2130] bg-[#0b0d15]/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">              
              <h1><b>My tasks</b></h1>                
            </div>
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

          {/* Stats */}
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
                    {["Display Name", "State", "Workflow", "Assignee", ""].map((h) => (
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
                        onClick={() => setOpenTask(task)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="accent-indigo-500 w-4 h-4" checked={isSelected} onChange={() => toggleSelect(task.taskId)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{task.displayName}</div>
                          {/* <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">{task.taskId}</div> */}
                        </td>
                        <td className="px-4 py-3">
                          <StateBadge state={task.state} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-300">{task.workflowName}</div>
                          {/* <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[140px]">{task.workflowId}</div> */}
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
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenTask(task); }}
                            className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-white text-xs flex items-center gap-1 ml-auto"
                          >
                            Open form
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
