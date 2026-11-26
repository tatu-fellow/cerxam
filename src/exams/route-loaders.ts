import { getExam, loadExam } from "./registry";
import type { LoaderFunctionArgs } from "react-router";
import type { QuizMode } from "../types/questions";

const quizModes: QuizMode[] = ["learning", "exam", "scenario", "weak"];

function isQuizMode(mode: string | undefined): mode is QuizMode {
  return mode !== undefined && quizModes.includes(mode as QuizMode);
}

export async function examLoader({ params }: LoaderFunctionArgs) {
  const examId = params.examId;
  if (!examId || !getExam(examId)) {
    throw new Response("Exam not found.", { status: 404, statusText: "Not Found" });
  }
  return loadExam(examId);
}

export function practiceLoader({ params }: LoaderFunctionArgs) {
  if (!isQuizMode(params.mode)) {
    throw new Response("Practice mode not found.", { status: 404, statusText: "Not Found" });
  }
  return { mode: params.mode };
}
