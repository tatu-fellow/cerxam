import type { ExamDefinition, LoadedExam } from "../types/exam";
import type { Question } from "../types/questions";

const manifests = import.meta.glob<ExamDefinition>("../data/exams/*/exam.json", {
  eager: true,
  import: "default",
});
const questionFiles = import.meta.glob<Question[]>("../data/exams/*/questions/*.json", {
  import: "default",
});

export const exams = Object.entries(manifests)
  .filter(([path, exam]) => !path.split("/").at(-2)?.startsWith("_") && exam.status !== "retired")
  .map(([, exam]) => exam)
  .sort((a, b) => a.code.localeCompare(b.code));

export function getExam(id: string): ExamDefinition | undefined {
  return exams.find((exam) => exam.id === id);
}

const loadedExams = new Map<string, Promise<LoadedExam>>();

export function loadExam(id: string): Promise<LoadedExam> {
  const exam = getExam(id);
  if (!exam) {
    return Promise.reject(new Error(`Unknown exam "${id}".`));
  }

  const cached = loadedExams.get(id);
  if (cached) return cached;

  const matchingFiles = Object.entries(questionFiles)
    .filter(([path]) => path.startsWith(`../data/exams/${id}/questions/`))
    .sort(([a], [b]) => {
      const fileOrder = exam.questionFileOrder ?? [];
      const aIndex = fileOrder.indexOf(a.split("/").at(-1) ?? "");
      const bIndex = fileOrder.indexOf(b.split("/").at(-1) ?? "");
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  if (matchingFiles.length === 0) {
    return Promise.reject(new Error(`No question bank found for exam "${id}".`));
  }

  const loadPromise = Promise.all(matchingFiles.map(([, loadQuestions]) => loadQuestions()))
    .then((banks) => ({
      exam,
      questions: banks.flat(),
    }))
    .catch((error: unknown) => {
      loadedExams.delete(id);
      throw error;
    });

  loadedExams.set(id, loadPromise);
  return loadPromise;
}
