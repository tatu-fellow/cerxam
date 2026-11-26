import { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, FlaskConical, Target, RotateCcw } from "lucide-react";
import Quiz from "./components/Quiz";
import Results from "./components/Results";
import { appConfig, resolveExamSettings } from "./config";
import { buildWeightedExam, isCorrect, selectScenarioQuestions, selectWeakQuestions } from "./utils";
import { loadExam } from "./exams/registry";
import type { LoadedExam } from "./types/exam";
import type { Answers, ConfidenceAnswers, Question, QuizMode } from "./types/questions";

type Screen = "home" | "quiz" | "results";
const HISTORY_KEY = "cerxam-history-v2";

export default function App() {
  const [loadedExam, setLoadedExam] = useState<LoadedExam | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen,setScreen] = useState<Screen>("home");
  const [mode,setMode] = useState<QuizMode>("learning");
  const [sessionQuestions,setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex,setCurrentIndex] = useState(0);
  const [answers,setAnswers] = useState<Answers>({});
  const [confidence,setConfidence] = useState<ConfidenceAnswers>({});
  const [submitted,setSubmitted] = useState(false);
  const [flagged,setFlagged] = useState<string[]>([]);
  const [timeRemaining,setTimeRemaining] = useState(0);
  const history = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as {questionId:string;correct:boolean}[]; } catch { return []; }
  }, [screen]);
  const allQuestions = loadedExam?.questions ?? [];
  const weakIds = new Set(history.filter((x)=>!x.correct).map((x)=>x.questionId));

  useEffect(() => {
    let active = true;
    loadExam("ai-901")
      .then((result) => {
        if (active) setLoadedExam(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => { active = false; };
  }, []);

  const startQuiz = (selectedMode: QuizMode) => {
    const settings = resolveExamSettings(loadedExam!.exam);
    let selected = allQuestions;
    if (selectedMode === "exam") selected = buildWeightedExam(allQuestions, loadedExam!.exam.domains, loadedExam!.exam.format.questionCount);
    if (selectedMode === "scenario") selected = selectScenarioQuestions(allQuestions, settings);
    if (selectedMode === "weak") selected = selectWeakQuestions(allQuestions, weakIds, settings);
    setSessionQuestions(selected); setMode(selectedMode); setCurrentIndex(0); setAnswers({}); setConfidence({}); setSubmitted(false); setFlagged([]); setTimeRemaining(loadedExam!.exam.format.durationMinutes*60); setScreen("quiz");
  };
  const finishQuiz = () => {
    const attempts = sessionQuestions.filter((q)=>answers[q.id]).map((q)=>({questionId:q.id,correct:isCorrect(q,answers[q.id]),timestamp:new Date().toISOString()}));
    const prior = (()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)??"[]") as object[]}catch{return []}})();
    localStorage.setItem(HISTORY_KEY,JSON.stringify([...prior,...attempts].slice(-appConfig.historyLimit)));
    setScreen("results");
  };
  if (loadError) return <main className="min-h-screen bg-slate-950 p-6 text-slate-100"><p role="alert">Unable to load AI-901: {loadError}</p></main>;
  if (!loadedExam) return <main className="min-h-screen bg-slate-950 p-6 text-slate-100">Loading AI-901…</main>;
  if (screen === "quiz") return <Quiz questions={sessionQuestions} mode={mode} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} answers={answers} setAnswers={setAnswers} confidence={confidence} setConfidence={setConfidence} submitted={submitted} setSubmitted={setSubmitted} flagged={flagged} setFlagged={setFlagged} timeRemaining={timeRemaining} setTimeRemaining={setTimeRemaining} onFinish={finishQuiz} onExit={()=>setScreen("home")} />;
  if (screen === "results") return <Results questions={sessionQuestions} answers={answers} confidence={confidence} format={loadedExam.exam.format} onBack={()=>setScreen("home")} onRetryWeak={()=>startQuiz("weak")} />;
  const cards = [
    {mode:"learning" as const,title:"Learning Mode",icon:BookOpen,desc:"Work through the full bank with instant explanations and confidence ratings."},
    {mode:"exam" as const,title:"Weighted Mock Exam",icon:Clock3,desc:`${loadedExam.exam.format.questionCount} questions, ${loadedExam.exam.format.durationMinutes} minutes, weighted to the official ${loadedExam.exam.domains.map((domain)=>`${domain.weight.min}–${domain.weight.max}%`).join(" / ")} domains.`},
    {mode:"scenario" as const,title:"Applied Scenarios",icon:FlaskConical,desc:"Practise code reading, ordering, case-study and Yes/No matrix questions. These are simulations, not official labs."},
    {mode:"weak" as const,title:"Weak Areas",icon:Target,desc:weakIds.size?`Revisit ${weakIds.size} question concepts you previously missed.`:"Start a harder mixed set; missed questions will be remembered locally."},
  ];
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12"><div className="mx-auto max-w-6xl">
    <div className="mb-4 flex items-center gap-3 text-cyan-300"><BookOpen/><span className="font-semibold tracking-wide">{loadedExam.exam.code} PRACTICE</span></div>
    <h1 className="mb-4 max-w-4xl text-4xl font-bold md:text-6xl">{loadedExam.exam.tagline ?? loadedExam.exam.title}</h1>
    <p className="mb-8 max-w-3xl text-lg text-slate-400">{loadedExam.exam.description}</p>
    <div className="mb-10 grid gap-4 md:grid-cols-2">{cards.map(({mode:m,title,icon:Icon,desc})=><button key={m} type="button" onClick={()=>startQuiz(m)} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-cyan-500/60 hover:bg-slate-900/80"><Icon className="mb-7 text-cyan-300"/><h2 className="text-2xl font-bold">{title}</h2><p className="mt-2 text-slate-400">{desc}</p></button>)}</div>
    {history.length>0 && <button onClick={()=>{localStorage.removeItem(HISTORY_KEY);location.reload()}} className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"><RotateCcw size={15}/>Clear local practice history</button>}
    <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Official objective coverage</h3><span className="text-sm text-slate-500">{allQuestions.length} questions</span></div>
    <div className="grid gap-4 md:grid-cols-2">{loadedExam.exam.domains.map((domain)=><div key={domain.id} className="rounded-2xl bg-slate-900 p-5"><div className="flex justify-between gap-4"><strong>{domain.title}</strong><span className="text-cyan-300">{domain.weight.min}–{domain.weight.max}%</span></div><div className="mt-4 space-y-4">{domain.sections.map((section)=><div key={section.id}><p className="text-sm font-semibold text-slate-300">{section.title}</p><ul className="mt-1 space-y-1 text-sm text-slate-500">{section.topics.map((topic)=><li key={topic}>• {topic}</li>)}</ul></div>)}</div></div>)}</div>
  </div></main>;
}
