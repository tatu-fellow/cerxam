import { createElement } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useNavigate,
  useOutletContext,
} from "react-router";
import type { RouteObject } from "react-router";
import Dashboard from "./components/Dashboard";
import { ExamErrorBoundary, ExamLayout } from "./components/ExamLayout";
import ExamSelect from "./components/ExamSelect";
import NotFound from "./components/NotFound";
import PracticeRoute from "./components/PracticeRoute";
import Results from "./components/Results";
import { examLoader, practiceLoader } from "./exams/route-loaders";
import type { ExamContext } from "./types/exam-context";

function LoadingFallback() {
  return createElement("main", { className: "min-h-screen bg-slate-950 p-6 text-slate-100" }, "Loading exam…");
}

function CompletedResults() {
  const context = useOutletContext<ExamContext>();
  const navigate = useNavigate();
  const { exam } = context.loadedExam;
  if (!context.sessionCompleted || context.sessionMode === null) {
    return createElement(Navigate, { to: `/${exam.id}`, replace: true });
  }
  return createElement(
    "div",
    null,
    context.historyError && createElement("p", { role: "alert", className: "bg-rose-950 p-4 text-rose-200" }, context.historyError),
    createElement(Results, {
      questions: context.sessionQuestions,
      answers: context.answers,
      confidence: context.confidence,
      format: exam.format,
      onBack: () => navigate(`/${exam.id}`),
      onRetryWeak: () => context.startSession("weak"),
    }),
  );
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: createElement(Outlet),
    HydrateFallback: LoadingFallback,
    children: [
      { index: true, element: createElement(ExamSelect) },
      {
        path: ":examId",
        loader: examLoader,
        element: createElement(ExamLayout),
        errorElement: createElement(ExamErrorBoundary),
        children: [
          { index: true, element: createElement(Dashboard) },
          {
            path: "practice/:mode",
            loader: practiceLoader,
            element: createElement(PracticeRoute),
          },
          { path: "results", element: createElement(CompletedResults) },
          { path: "*", element: createElement(NotFound) },
        ],
      },
      { path: "*", element: createElement(NotFound) },
    ],
  },
];

export const router = createBrowserRouter(routes);
