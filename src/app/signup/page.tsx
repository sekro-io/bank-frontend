"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";

console.log("API URL:", process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL);

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob]           = useState<Date | null>(null);

  const [passwordStrength, setPasswordStrength] = useState<"weak"|"medium"|"strong"|null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);


  //Email Validation
  useEffect(() => {
    if (!email) return setEmailValid(null);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(regex.test(email));
  }, [email]);

  //Password strength calculation
  useEffect(() => {
    if (!password) return setPasswordStrength(null);

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength("weak");
    else if (strength === 3 || strength === 4) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  }, [password]);

  //Password match check
  useEffect(() => {
    if (!confirmPassword) return setPasswordsMatch(null);
    setPasswordsMatch(password == confirmPassword);
  }, [password, confirmPassword]);

  // Age restriction: must be >= 18 years old
  const today = new Date();
  const maxDOB = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minDOB = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());

  // form valid only if everything passes
  const formValid =
    firstName.trim() &&
    lastName.trim() &&
    emailValid === true &&
    passwordStrength !== "weak" &&
    passwordsMatch === true &&
    dob;

  // submit handler
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // convert YYYY-MM-DD for workflow
    const dobString = dob ? format(dob, "yyyy-MM-dd") : "";

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SEKRO_BANK_API_URL}/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            dob: dobString,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Signup failed");
      } else {
        setResult(data.message || "Signup successful!");
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

          {/* First Name */}
          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          {/* Last Name */}
          <input
            className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          {/* Email */}
          <div>
            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
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
          <div>
            <input
              className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {passwordStrength && (
              <p
                className={
                  "text-xs mt-1 " +
                  (passwordStrength === "weak"
                    ? "text-red-400"
                    : passwordStrength === "medium"
                    ? "text-yellow-400"
                    : "text-green-400")
                }
              >
                Password strength: {passwordStrength}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <input
              className="bg-slate-800 w-full px-4 py-2 rounded-lg border border-slate-700 focus:outline-none"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordsMatch === false && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {/* DOB */}
          <div>
            <DatePicker
              selected={dob}
              onChange={(date) => setDob(date)}
              maxDate={maxDOB}
              minDate={minDOB}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              placeholderText="Select your date of birth"
              dateFormat="yyyy-MM-dd"
              className="bg-slate-800 w-full px-4 py-2 rounded-lg border border-slate-700 focus:outline-none text-center"
            />
            {!dob && (
              <p className="text-slate-400 text-xs mt-1">Must be at least 18 years old</p>
            )}
          </div>

          <button
            className={`py-2 px-4 rounded-lg font-semibold transition ${
              formValid
                ? "bg-brand-aqua text-slate-950 hover:bg-brand-purple cursor-pointer"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            type="submit"
            disabled={!formValid || loading}
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
