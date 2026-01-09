"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

type InboxMessage = {
  id: string;
  message_type: string;
  title: string;
  body: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function InboxDropdown() {
  const { token } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);

  // ✅ Separate “initial load” vs “background refresh”
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  async function fetchInbox({ silent = false }: { silent?: boolean } = {}) {
    if (!token) return;

    // ✅ Only show big loading state if not silent and no messages yet
    if (!silent && messages.length === 0) {
      setInitialLoading(true);
    }

    // ✅ For silent refreshes, use refreshing state (doesn't hide list)
    setRefreshing(true);

    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/inbox`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load inbox");
      }

      // ✅ Only update state if something actually changed
      const newMessages = data.messages || [];
      setMessages((prev) => {
        const prevTop = prev?.[0]?.id;
        const nextTop = newMessages?.[0]?.id;
        if (prev.length === newMessages.length && prevTop === nextTop) {
          return prev;
        }
        return newMessages;
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load inbox");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }

  async function markAsRead(messageId: string) {
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/inbox/${messageId}/read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch {
      // ignore
    }
  }

  // Poll every 5 seconds (only while tab visible)
  // Silent refresh: does NOT flip UI into loading state
  useEffect(() => {
    if (!token) return;

    fetchInbox({ silent: false });

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchInbox({ silent: true });
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedId(null);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const unreadCount = useMemo(() => {
    return messages.filter((m) => !m.is_read).length;
  }, [messages]);

  const sortedMessages = useMemo(() => {
    const copy = [...messages];

    copy.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return copy;
  }, [messages]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Inbox Button */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchInbox({ silent: true });
        }}
        className="relative rounded-full border border-slate-700 px-4 py-1.5 text-sm hover:bg-slate-800 transition"
      >
        Inbox

        {/* unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white font-bold rounded-full px-2 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-3 w-[380px] max-h-[480px] overflow-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100">Inbox</h3>

              {/* ✅ subtle background refresh indicator */}
              {refreshing && (
                <span className="text-xs text-slate-500">Refreshing…</span>
              )}
            </div>

            <button
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => fetchInbox({ silent: false })}
              disabled={refreshing}
            >
              Refresh
            </button>
          </div>

          {/* ✅ Only show big loading state if we have no messages yet */}
          {initialLoading && messages.length === 0 && (
            <div className="p-4 text-sm text-slate-400">Loading messages…</div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-400">{error}</div>
          )}

          {!initialLoading && !error && sortedMessages.length === 0 && (
            <div className="p-6 text-sm text-slate-400">No messages yet.</div>
          )}

          {!error && sortedMessages.length > 0 && (
            <div className="divide-y divide-slate-800">
              {sortedMessages.map((msg) => {
                const expanded = expandedId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800 transition cursor-pointer ${
                      msg.is_read ? "opacity-80" : "bg-slate-950/40"
                    }`}
                    onClick={() => {
                      setExpandedId(expanded ? null : msg.id);

                      if (!msg.is_read) {
                        markAsRead(msg.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            msg.is_read ? "text-slate-200" : "text-white"
                          }`}
                        >
                          {msg.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>

                      {!msg.is_read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-3">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                          {msg.body}
                        </p>

                        {/* ✅ Loan offers CTA */}
                        {msg.message_type === "LOAN_OFFERS" &&
                          msg.related_entity_id && (
                            <button
                              className="mt-4 inline-flex items-center gap-2 bg-brand-aqua text-slate-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-purple transition text-sm"
                              onClick={(e) => {
                                e.stopPropagation(); // don’t collapse the message
                                router.push(
                                  `/loan-offers/${msg.related_entity_id}`
                                );
                              }}
                            >
                              View Loan Offers →
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
