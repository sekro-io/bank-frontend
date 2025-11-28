import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top nav */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-brand-pink flex items-center justify-center text-slate-900 font-bold">
              SB
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Sekro Bank
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-brand-aqua px-4 py-1.5 text-sm font-medium hover:bg-brand-aqua hover:text-slate-950 transition"
            >
              Open an account
            </Link>
          </nav>
        </header>

        {/* Hero section */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-brand-pink text-sm font-semibold mb-3">
              Demo banking platform
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">
              Modern digital banking,{" "}
              <span className="text-brand-pink">powered by Orkes Conductor workflows.</span>
            </h1>
            <p className="text-slate-300 mb-6 max-w-xl">
              Sekro Bank is a fictional bank used to demo Orkes Conductor
              workflows end-to-end: account signup, authentication, and
              loan approvals with real data flows.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href="/signup"
                className="rounded-full bg-brand-aqua px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-brand-aqua transition"
              >
                Get started – open an account
              </Link>
              <Link
                href="/loan/apply"
                className="rounded-full border border-brand-aqua px-5 py-2.5 text-sm font-semibold hover:border-brand-aqua hover:text-brand-aqua transition"
              >
                Apply for a loan
              </Link>
            </div>

            <p className="text-xs text-slate-400 max-w-sm">
              This is a demo environment only – no real money is handled.
              Workflows run on Orkes Conductor, backed by AWS Lambda and
              PostgreSQL.
            </p>
          </div>

          {/* Simple "dashboard style" card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <p className="text-xs text-slate-400 mb-2">Sample dashboard</p>
            <h2 className="text-lg font-semibold mb-4">
              John Doe&apos;s Checking ·••8421
            </h2>

            <div className="bg-slate-900 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-400 mb-1">Available balance</p>
              <p className="text-3xl font-semibold">$12,480.23</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-slate-900 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">
                  Active loan balance
                </p>
                <p className="font-semibold">$8,500.00</p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">
                  Next payment due
                </p>
                <p className="font-semibold">Jan 12</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 rounded-xl bg-slate-800 px-4 py-2 text-sm text-center hover:bg-slate-700 transition"
              >
                View dashboard
              </Link>
              <Link
                href="/loan/apply"
                className="flex-1 rounded-xl bg-brand-aqua px-4 py-2 text-sm text-center font-semibold text-slate-950 hover:bg-brand-purple transition"
              >
                New loan
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}