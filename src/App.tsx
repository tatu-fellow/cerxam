import { useEffect, useState } from "react";
import { BookOpen, Clock3, FlaskConical, Target, RotateCcw } from "lucide-react";
import Quiz from "./components/Quiz";
import Results from "./components/Results";
import { resolveExamSettings } from "./config";
import { buildWeightedExam, isCorrect, selectScenarioQuestions, selectWeakQuestions } from "./utils";
import { loadExam } from "./exams/registry";
import { appendAttempts, clearHistory, readHistory } from "./storage/history";
import type { AttemptRecord } from "./storage/history";
import type { LoadedExam } from "./types/exam";
import type { Answers, ConfidenceAnswers, Question, QuizMode } from "./types/questions";

type Screen = "home" | "quiz" | "results";

export default function App() {
  const [loadedExam, setLoadedExam] = useState<LoadedExam | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [screen,setScreen] = useState<Screen>("home");
  const [mode,setMode] = useState<QuizMode>("learning");
  const [sessionQuestions,setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex,setCurrentIndex] = useState(0);
  const [answers,setAnswers] = useState<Answers>({});
  const [confidence,setConfidence] = useState<ConfidenceAnswers>({});
  const [submitted,setSubmitted] = useState(false);
  const [flagged,setFlagged] = useState<string[]>([]);
  const [timeRemaining,setTimeRemaining] = useState(0);
  useEffect(() => {
    let active = true;
    loadExam("ai-901")
      .then((result) => {
        if (active) {
          setHistory(readHistory(result.exam.id));
          setLoadedExam(result);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => { active = false; };
  }, []);

  if (loadError) return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><p role="alert">Unable to load AI-901: {loadError}</p></main>;
  if (!loadedExam) return <main className="min-h-screen bg-slate-950 p-6 text-slate-100">Loading AI-901…</main>;
  const { exam, questions: allQuestions } = loadedExam;
  const weakIds = new Set(history.filter((attempt)=>!attempt.correct).map((attempt)=>attempt.questionId));

  const reportHistoryError = (action: string, error: unknown) => {
    console.error(`Unable to ${action} local practice history:`, error);
    setHistoryError(`Unable to ${action} local practice history: ${error instanceof Error ? error.message : String(error)}`);
  };
  const startQuiz = (selectedMode: QuizMode) => {
    const settings = resolveExamSettings(exam);
    let selected = allQuestions;
    if (selectedMode === "exam") selected = buildWeightedExam(allQuestions, exam.domains, exam.format.questionCount);
    if (selectedMode === "scenario") selected = selectScenarioQuestions(allQuestions, settings);
    if (selectedMode === "weak") selected = selectWeakQuestions(allQuestions, weakIds, settings);
    setHistoryError(null); setSessionQuestions(selected); setMode(selectedMode); setCurrentIndex(0); setAnswers({}); setConfidence({}); setSubmitted(false); setFlagged([]); setTimeRemaining(exam.format.durationMinutes*60); setScreen("quiz");
  };
  const finishQuiz = () => {
    const attempts = sessionQuestions.filter((q)=>answers[q.id]).map((q)=>({questionId:q.id,correct:isCorrect(q,answers[q.id]),confidence:confidence[q.id],timestamp:new Date().toISOString()}));
    try {
      setHistory(appendAttempts(exam.id, attempts));
      setHistoryError(null);
    } catch (error) {
      reportHistoryError("save", error);
    }
    setScreen("results");
  };
  const returnHome = () => {
    try {
      setHistory(readHistory(exam.id));
    } catch (error) {
      reportHistoryError("read", error);
    }
    setScreen("home");
  };
  const clearCurrentHistory = () => {
    try {
      clearHistory(exam.id);
      setHistory([]);
      setHistoryError(null);
    } catch (error) {
      reportHistoryError("clear", error);
    }
  };
  if (screen === "quiz") return <Quiz questions={sessionQuestions} mode={mode} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} setAnswers={setAnswers} confidence={confidence} setConfidence={setConfidence} submitted={submitted} setSubmitted={setSubmitted} flagged={flagged} setFlagged={setFlagged} timeRemaining={timeRemaining} setTimeRemaining={setTimeRemaining} onFinish={finishQuiz} onExit={returnHome} />;
  if (screen === "results") return <>{historyError && <p role="alert" className="bg-rose-950 p-4 text-rose-200">{historyError}</p>}<Results questions={sessionQuestions} answers={answers} confidence={confidence} format={exam.format} onBack={returnHome} onRetryWeak={()=>startQuiz("weak")} /></>;
  const cards = [
    {mode:"learning" as const,title:"Learning Mode",icon:BookOpen,desc:"Work through the full bank with instant explanations and confidence ratings."},
    {mode:"exam" as const,title:"Weighted Mock Exam",icon:Clock3,desc:`${exam.format.questionCount} questions, ${exam.format.durationMinutes} minutes, weighted to the official ${exam.domains.map((domain)=>`${domain.weight.min}–${domain.weight.max}%`).join(" / ")} domains.`},
    {mode:"scenario" as const,title:"Applied Scenarios",icon:FlaskConical,desc:"Practise code reading, ordering, case-study and Yes/No matrix questions. These are simulations, not official labs."},
    {mode:"weak" as const,title:"Weak Areas",icon:Target,desc:weakIds.size?`Revisit ${weakIds.size} question concepts you previously missed.`:"Start a harder mixed set; missed questions will be remembered locally."},
  ];
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12"><div className="mx-auto max-w-6xl">
    <div className="mb-4 flex items-center gap-3 text-cyan-300"><BookOpen/><span className="font-semibold tracking-wide">{exam.code} PRACTICE</span></div>
    <h1 className="mb-4 max-w-4xl text-4xl font-bold md:text-6xl">{exam.tagline ?? exam.title}</h1>
    <p className="mb-8 max-w-3xl text-lg text-slate-400">{exam.description}</p>
    {historyError && <p role="alert" className="mb-6 rounded-xl bg-rose-950 p-4 text-rose-200">{historyError}</p>}
    <div className="mb-10 grid gap-4 md:grid-cols-2">{cards.map(({mode:m,title,icon:Icon,desc})=><button key={m} type="button" onClick={()=>startQuiz(m)} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-cyan-500/60 hover:bg-slate-900/80"><Icon className="mb-7 text-cyan-300"/><h2 className="text-2xl font-bold">{title}</h2><p className="mt-2 text-slate-400">{desc}</p></button>)}</div>
    {history.length>0 && <button onClick={clearCurrentHistory} className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"><RotateCcw size={15}/>Clear {exam.code} local practice history</button>}
    <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Official objective coverage</h3><span className="text-sm text-slate-500">{allQuestions.length} questions</span></div>
    <div className="grid gap-4 md:grid-cols-2">{exam.domains.map((domain)=><div key={domain.id} className="rounded-2xl bg-slate-900 p-5"><div className="flex justify-between gap-4"><strong>{domain.title}</strong><span className="text-cyan-300">{domain.weight.min}–{domain.weight.max}%</span></div><div className="mt-4 space-y-4">{domain.sections.map((section)=><div key={section.id}><p className="text-sm font-semibold text-slate-300">{section.title}</p><ul className="mt-1 space-y-1 text-sm text-slate-500">{section.topics.map((topic)=><li key={topic}>• {topic}</li>)}</ul></div>)}</div></div>)}</div>
  </div></main>;
}
