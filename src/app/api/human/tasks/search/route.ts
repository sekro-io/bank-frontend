import { NextRequest, NextResponse } from "next/server";

// ─── Env vars ─────────────────────────────────────────────────────────────────
// Add to .env.local:
//   NEXT_PUBLIC_ORKES_CLUSTER_URL=https://your-cluster.orkesconductor.io
//   ORKES_KEY_ID=<your application key id>
//   ORKES_KEY_SECRET=<your application key secret>
//
// The application key must have Execute + Read + Update permissions on the
// Human task definitions, and the Worker role enabled, so that ADMIN search
// returns all tasks rather than an empty inbox.

const CLUSTER_URL = process.env.NEXT_PUBLIC_ORKES_CLUSTER_URL ?? "";
const KEY_ID      = process.env.ORKES_KEY_ID ?? "";
const KEY_SECRET  = process.env.ORKES_KEY_SECRET ?? "";

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;
const REFRESH_BUFFER_MS = 60_000;

async function getToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && now < tokenCache.expiresAt - REFRESH_BUFFER_MS) {
    return tokenCache.token;
  }

  const resp = await fetch(`${CLUSTER_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ keyId: KEY_ID, keySecret: KEY_SECRET }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token generation failed: ${resp.status} ${resp.statusText} — ${text}`);
  }

  const data = await resp.json();
  const token: string = data.token;
  const expMs = getJwtExpiry(token);

  tokenCache = { token, expiresAt: expMs };
  return token;
}

function getJwtExpiry(jwt: string): number {
  try {
    const payload = jwt.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const { exp } = JSON.parse(json);
    if (typeof exp === "number") return exp * 1000;
  } catch {
    // fall through
  }
  return Date.now() + 55 * 60 * 1000;
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function searchTasks(body: unknown, token: string) {
  return fetch(`${CLUSTER_URL}/api/human/tasks/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": token,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!CLUSTER_URL || !KEY_ID || !KEY_SECRET) {
    return NextResponse.json(
      {
        error:
          "Missing environment variables. Ensure NEXT_PUBLIC_ORKES_CLUSTER_URL, " +
          "ORKES_KEY_ID, and ORKES_KEY_SECRET are set in .env.local.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const token = await getToken();
    let upstream = await searchTasks(body, token);

    // If 401, cached token may have been revoked — clear and retry once
    if (upstream.status === 401) {
      tokenCache = null;
      const freshToken = await getToken();
      upstream = await searchTasks(body, freshToken);
    }

    // Try to parse as JSON; fall back to plain text so errors are always visible
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await upstream.json();

      if (!upstream.ok) {
        // Surface Orkes error messages (e.g. permission denied) to the client
        console.error("[orkes-proxy] upstream error:", upstream.status, data);
        return NextResponse.json(
          { error: data?.message ?? JSON.stringify(data) },
          { status: upstream.status }
        );
      }

      return NextResponse.json(data, { status: upstream.status });
    } else {
      const text = await upstream.text();
      console.error("[orkes-proxy] non-JSON upstream response:", upstream.status, text);
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}: ${text}` },
        { status: upstream.status }
      );
    }
  } catch (err) {
    console.error("[orkes-proxy] exception:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown proxy error" },
      { status: 500 }
    );
  }
}
