import { Navigate, useLoaderData, useNavigate, useOutletContext } from "react-router";
import Quiz from "./Quiz";
import type { ExamContext } from "../types/exam-context";
import type { QuizMode } from "../types/questions";

export default function PracticeRoute() {
  const { mode } = useLoaderData() as { mode: QuizMode };
  const context = useOutletContext<ExamContext>();
  const navigate = useNavigate();
  const { loadedExam, sessionMode } = context;
  const active = sessionMode === mode;
  if (!active) return <Navigate to={`/${loadedExam.exam.id}`} replace />;

  if (context.sessionQuestions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <p role="alert">This practice mode has no eligible questions for {loadedExam.exam.code}.</p>
        <button className="mt-4 text-cyan-300" onClick={() => navigate(`/${loadedExam.exam.id}`)}>Back to dashboard</button>
      </main>
    );
  }

  if (context.sessionCompleted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <p>This session is already complete.</p>
        <button className="mt-4 text-cyan-300" onClick={() => navigate(`/${loadedExam.exam.id}/results`)}>
          View results
        </button>
      </main>
    );
  }

  return (
    <Quiz
      questions={context.sessionQuestions}
      mode={mode}
      currentIndex={context.currentIndex}
      setCurrentIndex={context.setCurrentIndex}
      answers={context.answers}
      setAnswers={context.setAnswers}
      confidence={context.confidence}
      setConfidence={context.setConfidence}
      submitted={context.submitted}
      setSubmitted={context.setSubmitted}
      flagged={context.flagged}
      setFlagged={context.setFlagged}
      timeRemaining={context.timeRemaining}
      setTimeRemaining={context.setTimeRemaining}
      onFinish={context.finishSession}
      onExit={() => navigate(`/${loadedExam.exam.id}`)}
    />
  );
}
