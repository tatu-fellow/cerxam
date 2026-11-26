import type { Dispatch, SetStateAction } from "react";
import type { LoadedExam } from "./exam";
import type { Answers, ConfidenceAnswers, Question, QuizMode } from "./questions";
import type { AttemptRecord } from "../storage/history";

export interface ExamContext {
  loadedExam: LoadedExam;
  history: AttemptRecord[];
  historyError: string | null;
  clearCurrentHistory: () => void;
  startSession: (mode: QuizMode) => void;
  sessionMode: QuizMode | null;
  sessionQuestions: Question[];
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
  confidence: ConfidenceAnswers;
  setConfidence: Dispatch<SetStateAction<ConfidenceAnswers>>;
  currentIndex: number;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  submitted: boolean;
  setSubmitted: Dispatch<SetStateAction<boolean>>;
  flagged: string[];
  setFlagged: Dispatch<SetStateAction<string[]>>;
  timeRemaining: number;
  setTimeRemaining: Dispatch<SetStateAction<number>>;
  sessionCompleted: boolean;
  finishSession: () => void;
  setHistoryError: Dispatch<SetStateAction<string | null>>;
}
