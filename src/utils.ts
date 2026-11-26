import type { ExamDomain } from "./types/exam";
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
export function buildWeightedExam(questions: Question[], domains: ExamDomain[], count: number): Question[] {
  if (count <= 0 || domains.length === 0) return [];

  const weights = domains.map((domain) => (domain.weight.min + domain.weight.max) / 2);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = totalWeight > 0
    ? weights.map((weight) => weight / totalWeight)
    : weights.map(() => 1 / domains.length);
  const targetCount = Math.min(count, questions.length);
  const quotas = normalizedWeights.map((weight) => weight * count);
  const allocations = quotas.map(Math.floor);
  let remainder = Math.max(0, targetCount - allocations.reduce((sum, allocation) => sum + allocation, 0));
  const remainderOrder = domains
    .map((_, index) => index)
    .sort((a, b) => (quotas[b] - allocations[b]) - (quotas[a] - allocations[a]) || a - b);
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    allocations[remainderOrder[index % remainderOrder.length]] += 1;
  }

  const questionsByDomain = domains.map((domain) =>
    shuffle(questions.filter((question) => question.domain === domain.id)),
  );
  const selectedCounts = allocations.map((allocation, index) =>
    Math.min(allocation, questionsByDomain[index].length),
  );
  let shortfall = targetCount - selectedCounts.reduce((sum, selected) => sum + selected, 0);
  const redistributionOrder = domains
    .map((_, index) => index)
    .sort((a, b) => normalizedWeights[b] - normalizedWeights[a] || a - b);
  for (const index of redistributionOrder) {
    const available = questionsByDomain[index].length - selectedCounts[index];
    const extra = Math.min(shortfall, available);
    selectedCounts[index] += extra;
    shortfall -= extra;
  }

  return shuffle(questionsByDomain.flatMap((bank, index) => bank.slice(0, selectedCounts[index])));
}

export interface QuestionSelectionSettings {
  scenarioQuestionCount: number;
  weakFallbackQuestionCount: number;
  scenarioTypes: string[];
  scenarioPresentations: string[];
}

export function selectScenarioQuestions(questions: Question[], settings: QuestionSelectionSettings): Question[] {
  const eligible = questions.filter((question) =>
    settings.scenarioTypes.includes(question.questionType) ||
    settings.scenarioPresentations.includes(question.presentation),
  );
  return shuffle(eligible).slice(0, settings.scenarioQuestionCount);
}

export function selectWeakQuestions(
  questions: Question[],
  weakIds: Set<string>,
  settings: QuestionSelectionSettings,
): Question[] {
  const weak = questions.filter((question) => weakIds.has(question.id));
  if (weak.length > 0) return shuffle(weak);
  return shuffle(questions.filter((question) => question.difficulty !== "easy"))
    .slice(0, settings.weakFallbackQuestionCount);
}
