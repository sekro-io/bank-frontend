"use client";

import { useState, useEffect } from "react";

console.log("API URL:", process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL);

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // Email validation
  useEffect(() => {
    if (!email) return setEmailValid(null);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(regex.test(email));
  }, [email]);

  // form valid if email + password exist and email is valid
  const formValid =
    email.trim() &&
    password.trim() &&
    emailValid === true;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
      } else {
        setResult(data.message || "Login successful!");
        // later: store token / redirect to dashboard
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-md mx-auto mt-10 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-lg">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>

          {/* Email */}
          <div>
            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none w-full"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailValid === false && (
              <p className="text-red-400 text-xs mt-1">Invalid email format</p>
            )}
          </div>

          {/* Password */}
          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none w-full"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className={`py-2 px-4 rounded-lg font-semibold transition ${
              formValid
                ? "bg-brand-aqua text-slate-950 hover:bg-brand-purple cursor-pointer"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            type="submit"
            disabled={!formValid || loading}
          >
            {loading ? "Signing In..." : "Sign In"}
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