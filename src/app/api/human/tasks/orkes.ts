// app/api/human/tasks/orkes.ts
// Shared utility used by both route files. Not a Next.js route itself.

import { NextResponse } from "next/server";

const CLUSTER_URL = process.env.NEXT_PUBLIC_ORKES_CLUSTER_URL ?? "";
const KEY_ID      = process.env.ORKES_KEY_ID ?? "";
const KEY_SECRET  = process.env.ORKES_KEY_SECRET ?? "";

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null;
const REFRESH_BUFFER_MS = 60_000;

function getJwtExpiry(jwt: string): number {
  try {
    const json = Buffer.from(jwt.split(".")[1], "base64url").toString("utf8");
    const { exp } = JSON.parse(json);
    if (typeof exp === "number") return exp * 1000;
  } catch { /* fall through */ }
  return Date.now() + 55 * 60 * 1000;
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - REFRESH_BUFFER_MS) {
    return tokenCache.token;
  }
  const resp = await fetch(`${CLUSTER_URL}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ keyId: KEY_ID, keySecret: KEY_SECRET }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token generation failed: ${resp.status} — ${text}`);
  }
  const { token } = await resp.json();
  tokenCache = { token, expiresAt: getJwtExpiry(token) };
  return token;
}

// ─── Shared proxy helper ──────────────────────────────────────────────────────

export async function orkesRequest(
  path: string,
  method: string,
  body?: unknown,
  retried = false
): Promise<NextResponse> {
  if (!CLUSTER_URL || !KEY_ID || !KEY_SECRET) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_ORKES_CLUSTER_URL, ORKES_KEY_ID, or ORKES_KEY_SECRET" },
      { status: 500 }
    );
  }
  try {
    const token = await getToken();
    const resp = await fetch(`${CLUSTER_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": token,
        Accept: "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    // Retry once on 401 (token revoked externally)
    if (resp.status === 401 && !retried) {
      tokenCache = null;
      return orkesRequest(path, method, body, true);
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      if (!resp.ok) {
        return NextResponse.json({ error: data?.message ?? JSON.stringify(data) }, { status: resp.status });
      }
      return NextResponse.json(data, { status: resp.status });
    }
    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: text || `HTTP ${resp.status}` }, { status: resp.status });
    }
    return NextResponse.json({ ok: true, raw: text }, { status: resp.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown proxy error" },
      { status: 500 }
    );
  }
}
