import type { ExamDefinition } from "./types/exam";

export const appConfig = {
  historyLimit: 1000,
  scenarioQuestionCount: 20,
  weakFallbackQuestionCount: 25,
  scenarioTypes: ["ordering", "code_analysis", "yes_no_matrix"],
  scenarioPresentations: ["case_study"],
};

export function resolveExamSettings(exam: Pick<ExamDefinition, "modes">) {
  return {
    ...appConfig,
    scenarioQuestionCount: exam.modes?.scenario?.questionCount ?? appConfig.scenarioQuestionCount,
    weakFallbackQuestionCount: exam.modes?.weakFallback?.questionCount ?? appConfig.weakFallbackQuestionCount,
  };
}
