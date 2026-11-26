import { useMemo } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router";
import { exams } from "../exams/registry";
import { getWeakIds, readHistory } from "../storage/history";

export default function ExamSelect() {
  const examStats = useMemo(() => exams.map((exam) => {
    try {
      const attempts = readHistory(exam.id);
      return {
        exam,
        attempts: attempts.length,
        weakCount: getWeakIds(exam.id).size,
        error: null,
      };
    } catch (error) {
      return {
        exam,
        attempts: 0,
        weakCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }), []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-3 text-cyan-300">
          <BookOpen />
          <span className="font-semibold tracking-wide">CERXAM PRACTICE</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold md:text-6xl">Choose an exam</h1>
        <p className="mb-10 max-w-3xl text-lg text-slate-400">
          Select a certification to explore its objectives and practice questions.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {examStats.map(({ exam, attempts, weakCount, error }) => (
            <Link
              key={exam.id}
              to={`/${exam.id}`}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/60 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-semibold tracking-wide text-cyan-300">{exam.code}</span>
                  <h2 className="mt-2 text-2xl font-bold">{exam.title}</h2>
                </div>
                {exam.status === "beta" && (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
                    Beta
                  </span>
                )}
              </div>
              <p className="mt-3 text-slate-400">{exam.description}</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <span>{exam.domains.length} domains</span>
                <span>
                  {exam.expectedQuestionCount === undefined
                    ? "Question count available after loading"
                    : `${exam.expectedQuestionCount} questions`}
                </span>
              </div>
              {error
                ? <p role="alert" className="mt-4 text-sm text-rose-300">Practice history unavailable: {error}</p>
                : <p className="mt-4 text-sm text-slate-400">{attempts} attempts · {weakCount} weak questions</p>}
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-cyan-300">
                Open exam <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
