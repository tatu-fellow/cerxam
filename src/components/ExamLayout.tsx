import { useCallback, useState } from "react";
import { isRouteErrorResponse, Outlet, useLoaderData, useNavigate, useParams, useRouteError } from "react-router";
import { resolveExamSettings } from "../config";
import { buildWeightedExam, isCorrect, selectScenarioQuestions, selectWeakQuestions } from "../utils";
import { appendAttempts, clearHistory, readHistory } from "../storage/history";
import type { AttemptRecord } from "../storage/history";
import type { LoadedExam } from "../types/exam";
import type { ExamContext } from "../types/exam-context";
import type { Answers, ConfidenceAnswers, Question, QuizMode } from "../types/questions";
import NotFound from "./NotFound";

function isQuizMode(mode: string | undefined): mode is QuizMode {
  return mode === "learning" || mode === "exam" || mode === "scenario" || mode === "weak";
}

function selectSessionQuestions(
  mode: QuizMode,
  questions: Question[],
  exam: LoadedExam["exam"],
  history: AttemptRecord[],
): Question[] {
  const settings = resolveExamSettings(exam);
  if (mode === "exam") return buildWeightedExam(questions, exam.domains, exam.format.questionCount);
  if (mode === "scenario") return selectScenarioQuestions(questions, settings);
  if (mode === "weak") {
    const weakIds = new Set(history.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId));
    return selectWeakQuestions(questions, weakIds, settings);
  }
  return questions;
}

export function ExamLayout() {
  const loadedExam = useLoaderData() as LoadedExam;
  return <ExamSession key={loadedExam.exam.id} loadedExam={loadedExam} />;
}

function ExamSession({ loadedExam }: { loadedExam: LoadedExam }) {
  const { exam, questions } = loadedExam;
  const navigate = useNavigate();
  const params = useParams();
  const [historySnapshot] = useState(() => {
    try {
      return { attempts: readHistory(exam.id), error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Unable to read ${exam.code} practice history:`, error);
      return { attempts: [] as AttemptRecord[], error: `Unable to read ${exam.code} practice history: ${message}` };
    }
  });
  const [history, setHistory] = useState(historySnapshot.attempts);
  const [historyError, setHistoryError] = useState<string | null>(historySnapshot.error);
  const initialMode = isQuizMode(params.mode) ? params.mode : null;
  const [sessionMode, setSessionMode] = useState<QuizMode | null>(initialMode);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() =>
    initialMode ? selectSessionQuestions(initialMode, questions, exam, historySnapshot.attempts) : [],
  );
  const [answers, setAnswers] = useState<Answers>({});
  const [confidence, setConfidence] = useState<ConfidenceAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(() => initialMode === "exam" ? exam.format.durationMinutes * 60 : 0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const routeMode = isQuizMode(params.mode) ? params.mode : null;

  if (routeMode !== null && sessionMode !== routeMode) {
    const restoredQuestions = selectSessionQuestions(routeMode, questions, exam, history);
    setSessionMode(routeMode);
    setSessionQuestions(restoredQuestions);
    setAnswers({});
    setConfidence({});
    setCurrentIndex(0);
    setSubmitted(false);
    setFlagged([]);
    setTimeRemaining(routeMode === "exam" ? exam.format.durationMinutes * 60 : 0);
    setSessionCompleted(false);
  }

  const startSession = useCallback((mode: QuizMode) => {
    const selectedQuestions = selectSessionQuestions(mode, questions, exam, history);
    setSessionMode(mode);
    setSessionQuestions(selectedQuestions);
    setAnswers({});
    setConfidence({});
    setCurrentIndex(0);
    setSubmitted(false);
    setFlagged([]);
    setTimeRemaining(mode === "exam" ? exam.format.durationMinutes * 60 : 0);
    setSessionCompleted(false);
    setHistoryError(null);
    navigate(`/${exam.id}/practice/${mode}`);
  }, [exam, history, navigate, questions]);

  const finishSession = useCallback(() => {
    if (sessionCompleted) {
      navigate(`/${exam.id}/results`);
      return;
    }
    const attempts = sessionQuestions
      .filter((question) => answers[question.id])
      .map((question) => ({
        questionId: question.id,
        correct: isCorrect(question, answers[question.id]),
        confidence: confidence[question.id],
        timestamp: new Date().toISOString(),
      }));
    try {
      const updated = appendAttempts(exam.id, attempts);
      setHistory(updated);
      setHistoryError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Unable to save ${exam.code} practice history:`, error);
      setHistoryError(`Unable to save ${exam.code} practice history: ${message}`);
    }
    setSessionCompleted(true);
    navigate(`/${exam.id}/results`);
  }, [answers, confidence, exam.code, exam.id, navigate, sessionCompleted, sessionQuestions]);

  const clearCurrentHistory = useCallback(() => {
    try {
      clearHistory(exam.id);
      setHistory([]);
      setHistoryError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Unable to clear ${exam.code} practice history:`, error);
      setHistoryError(`Unable to clear ${exam.code} practice history: ${message}`);
    }
  }, [exam.code, exam.id]);

  const context: ExamContext = {
    loadedExam,
    history,
    historyError,
    clearCurrentHistory,
    startSession,
    sessionMode,
    sessionQuestions,
    answers,
    setAnswers,
    confidence,
    setConfidence,
    currentIndex,
    setCurrentIndex,
    submitted,
    setSubmitted,
    flagged,
    setFlagged,
    timeRemaining,
    setTimeRemaining,
    sessionCompleted,
    finishSession,
    setHistoryError,
  };

  return (
    <>
      <title>{exam.code} Practice | Cerxam</title>
      <Outlet context={context} />
    </>
  );
}

export function ExamErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  const message = error instanceof Error ? error.message : "The question bank could not be loaded.";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="font-semibold text-cyan-300">Unable to open exam</p>
        <h1 className="mt-3 text-3xl font-bold">The exam could not be loaded.</h1>
        <p role="alert" className="mt-3 text-rose-300">{message}</p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">
          Choose an exam
        </a>
      </section>
    </main>
  );
}
