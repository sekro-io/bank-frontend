"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ADMIN_USER = "admin";
const ADMIN_PASS = "sekro2026";

export default function AdminDock() {
  const { token } = useAuth();

  const [open, setOpen] = useState(false);

  // Admin auth state (separate from user auth)
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Reset login form when opening
  useEffect(() => {
    if (open) {
      setError(null);
      setUsername("");
      setPassword("");
    }
  }, [open]);

  function closePanel() {
    setOpen(false);
  }

  function handleLogin() {
    setError(null);

    if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
      setAdminAuthed(true);
      return;
    }

    setError("Invalid admin credentials.");
  }

  function handleLogout() {
    setAdminAuthed(false);
    setUsername("");
    setPassword("");
    setError(null);
  }

  const drawerClasses =
    "fixed left-0 top-0 h-full z-50 w-[360px] max-w-[90vw] bg-slate-950 border-r border-slate-800 transform transition-transform duration-200 ease-out " +
    (open ? "translate-x-0" : "-translate-x-full");

  return (
    <>
      {/* Floating Tab (always visible) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-r-xl shadow-lg hover:bg-slate-800 transition"
      >
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          ADMIN
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <button
          aria-label="Close admin panel"
          className="fixed inset-0 bg-black/60 z-40"
          onClick={closePanel}
        />
      )}

      {/* Drawer */}
      <aside className={drawerClasses}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-slate-100 font-semibold">Admin Panel</p>
              <p className="text-xs text-slate-400">Demo controls</p>
            </div>

            <button
              onClick={closePanel}
              className="text-slate-300 hover:text-slate-100 text-sm px-2 py-1 rounded-md hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-5 py-4">
            {!token && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-slate-100 font-semibold mb-2">
                  You must be logged in
                </h3>
                <p className="text-sm text-slate-400">
                  Admin tools require a user session so the demo can call the API.
                </p>
              </div>
            )}

            {token && !adminAuthed && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-slate-100 font-semibold mb-3">
                  Admin Login
                </h3>

                <label className="block text-sm text-slate-300 mb-1">
                  Username
                </label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <label className="block text-sm text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                <button
                  onClick={handleLogin}
                  className="w-full bg-brand-aqua text-slate-950 font-semibold px-4 py-2 rounded-lg hover:bg-brand-purple transition"
                >
                  Sign in
                </button>
              </div>
            )}

            {token && adminAuthed && (
              <div className="space-y-4">
                <Section title="Monitoring">
                  <StatusRow label="Database (RDS)" status="unknown" />
                  <StatusRow label="Workers (ECS)" status="unknown" />
                  <StatusRow label="API (Lambda)" status="unknown" />
                  <button
                    disabled
                    className="mt-3 w-full bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-4 py-2 cursor-not-allowed"
                  >
                    Refresh status (coming soon)
                  </button>
                </Section>

                <Section title="Control">
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      disabled
                      className="bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-4 py-2 cursor-not-allowed"
                    >
                      Turn everything on
                    </button>
                    <button
                      disabled
                      className="bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-4 py-2 cursor-not-allowed"
                    >
                      Turn everything off
                    </button>
                    <button
                      disabled
                      className="bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-4 py-2 cursor-not-allowed"
                    >
                      Reset to golden state
                    </button>
                  </div>
                </Section>

                
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
            {token && adminAuthed ? (
              <>
                <span className="text-xs text-slate-400">
                  Signed in as admin
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500">Admin not signed in</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <h3 className="text-slate-100 font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "online" | "offline" | "unknown";
}) {
  const dot =
    status === "online"
      ? "bg-emerald-400"
      : status === "offline"
      ? "bg-red-400"
      : "bg-slate-500";

  const text =
    status === "online" ? "Online" : status === "offline" ? "Offline" : "Unknown";

  return (
    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
      <span className="text-slate-200">{label}</span>
      <span className="flex items-center gap-2 text-slate-300">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="text-xs">{text}</span>
      </span>
    </div>
  );
}
