import { BookOpen, Clock3, FlaskConical, RotateCcw, Target } from "lucide-react";
import { Link, useOutletContext } from "react-router";
import { resolveExamSettings } from "../config";
import type { ExamContext } from "../types/exam-context";
import type { QuizMode } from "../types/questions";

export default function Dashboard() {
  const { loadedExam, history, historyError, clearCurrentHistory, startSession } = useOutletContext<ExamContext>();
  const { exam, questions } = loadedExam;
  const settings = resolveExamSettings(exam);
  const weakCount = new Set(history.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId)).size;
  const hasScenarios = questions.some((question) =>
    settings.scenarioTypes.includes(question.questionType) ||
    settings.scenarioPresentations.includes(question.presentation),
  );
  const modes: {
    mode: QuizMode;
    title: string;
    icon: typeof BookOpen;
    description: string;
    disabled?: boolean;
  }[] = [
    {
      mode: "learning",
      title: "Learning Mode",
      icon: BookOpen,
      description: `Work through all ${questions.length} questions in bank order, with explanations and confidence ratings.`,
    },
    {
      mode: "exam",
      title: "Weighted Mock Exam",
      icon: Clock3,
      description: `${exam.format.questionCount} questions, ${exam.format.durationMinutes} minutes, weighted to ${exam.domains.map((domain) => `${domain.weight.min}–${domain.weight.max}%`).join(" / ")} domains.`,
    },
    {
      mode: "scenario",
      title: "Applied Scenarios",
      icon: FlaskConical,
      description: hasScenarios
        ? `Practise up to ${settings.scenarioQuestionCount} eligible scenario questions.`
        : "This question bank does not yet include scenario questions.",
      disabled: !hasScenarios,
    },
    {
      mode: "weak",
      title: "Weak Areas",
      icon: Target,
      description: weakCount
        ? `Revisit ${weakCount} question concepts you previously missed.`
        : `Start a harder mixed set of up to ${settings.weakFallbackQuestionCount} questions.`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <span className="font-semibold tracking-wide text-cyan-300">{exam.code} PRACTICE</span>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">Change exam</Link>
        </div>
        <title>{exam.code} Practice | Cerxam</title>
        <h1 className="mb-4 max-w-4xl text-4xl font-bold md:text-6xl">{exam.tagline ?? exam.title}</h1>
        <p className="mb-8 max-w-3xl text-lg text-slate-400">{exam.description}</p>
        {historyError && <p role="alert" className="mb-6 rounded-xl bg-rose-950 p-4 text-rose-200">{historyError}</p>}

        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {modes.map(({ mode, title, icon: Icon, description, disabled }) => (
            <button
              key={mode}
              type="button"
              onClick={() => startSession(mode)}
              disabled={disabled}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-cyan-500/60 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="mb-7 text-cyan-300" />
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="mt-2 text-slate-400">{description}</p>
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={clearCurrentHistory}
            className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
          >
            <RotateCcw size={15} /> Clear {exam.code} local practice history
          </button>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Official objective coverage</h2>
          <span className="text-sm text-slate-500">{questions.length} questions</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {exam.domains.map((domain) => (
            <section key={domain.id} className="rounded-2xl bg-slate-900 p-5">
              <div className="flex justify-between gap-4">
                <strong>{domain.title}</strong>
                <span className="text-cyan-300">{domain.weight.min}–{domain.weight.max}%</span>
              </div>
              <div className="mt-4 space-y-4">
                {domain.sections.map((section) => (
                  <div key={section.id}>
                    <p className="text-sm font-semibold text-slate-300" title={section.officialTitle}>
                      {section.title}
                    </p>
                    {section.officialTitle && (
                      <p className="mt-1 text-xs text-slate-500">{section.officialTitle}</p>
                    )}
                    <ul className="mt-1 space-y-1 text-sm text-slate-500">
                      {section.topics.map((topic) => <li key={topic}>• {topic}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
