import type { Question, QuestionAnswer } from "./types/questions";
export function isCorrect(question: Question, answer?: QuestionAnswer): boolean {
  if (!answer) return false;
  if (question.questionType === "matching" || question.questionType === "yes_no_matrix") {
    if (Array.isArray(answer)) return false;
    const keys = Object.keys(question.correctAnswer);
    return keys.every((key) => answer[key] === question.correctAnswer[key]);
  }
  if (!Array.isArray(answer)) return false;
  return JSON.stringify([...answer].sort()) === JSON.stringify([...question.correctAnswer].sort());
}
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function buildWeightedExam(questions: Question[], count: number, conceptsRatio: number): Question[] {
  const concepts = shuffle(questions.filter((q) => q.domain === "concepts"));
  const foundry = shuffle(questions.filter((q) => q.domain === "foundry"));
  const conceptCount = Math.min(concepts.length, Math.round(count * conceptsRatio));
  const foundryCount = Math.min(foundry.length, count - conceptCount);
  return shuffle([...concepts.slice(0, conceptCount), ...foundry.slice(0, foundryCount)]);
}
