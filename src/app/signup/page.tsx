"use client";

import { useState } from "react";

console.log("API URL:", process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL);

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob]           = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            password,
            dob,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Signup failed");
      } else {
        setResult(data.output || "Signup successful!");
      }
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-md mx-auto mt-10 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-lg">
        <h1 className="text-2xl font-bold mb-6">Open an Account</h1>

        <form className="flex flex-col gap-4" onSubmit={handleSignup}>
          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />

          <button
            className="bg-brand-aqua text-slate-950 py-2 px-4 rounded-lg font-semibold hover:bg-brand-purple transition"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {error && (
          <p className="text-red-400 mt-4 text-sm">Error: {error}</p>
        )}

        {result && (
          <p className="text-emerald-400 mt-4 text-sm">
            {result}
          </p>
        )}
      </div>
    </main>
  );
}
