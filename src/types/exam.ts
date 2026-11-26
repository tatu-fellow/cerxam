import type { Question } from "./questions";

export interface WeightRange {
  min: number;
  max: number;
}

export interface SyllabusSection {
  id: string;
  title: string;
  officialTitle?: string;
  topics: string[];
}

export interface ExamDomain {
  id: string;
  title: string;
  weight: WeightRange;
  sections: SyllabusSection[];
}

export interface ExamFormat {
  durationMinutes: number;
  questionCount: number;
  readinessTarget: number;
  minimumObjectiveTarget: number;
}

export interface ExamModesConfig {
  scenario?: { questionCount: number };
  weakFallback?: { questionCount: number };
}

export interface ExamDefinition {
  id: string;
  code: string;
  title: string;
  tagline?: string;
  description: string;
  questionIdPrefix: string;
  expectedQuestionCount?: number;
  questionFileOrder?: string[];
  status: "active" | "beta" | "retired";
  studyGuideUrl?: string;
  skillsMeasuredDate?: string;
  allowedSourceHosts?: string[];
  format: ExamFormat;
  modes?: ExamModesConfig;
  domains: ExamDomain[];
}

export interface LoadedExam {
  exam: ExamDefinition;
  questions: Question[];
}
