import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="font-semibold text-cyan-300">404 · Page not found</p>
        <h1 className="mt-3 text-3xl font-bold">This Cerxam page does not exist.</h1>
        <p className="mt-3 text-slate-400">Choose an exam to get back to a practice dashboard.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">
          Choose an exam
        </Link>
      </section>
    </main>
  );
}
