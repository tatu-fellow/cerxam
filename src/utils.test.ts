import { describe, expect, it } from "vitest";
import { buildWeightedExam } from "./utils";
import type { ExamDomain } from "./types/exam";
import type { Question } from "./types/questions";

const domains: ExamDomain[] = [
  { id: "concepts", title: "Concepts", weight: { min: 40, max: 45 }, sections: [] },
  { id: "foundry", title: "Foundry", weight: { min: 55, max: 60 }, sections: [] },
];

const sc900Domains: ExamDomain[] = [
  { id: "concepts", title: "Concepts", weight: { min: 10, max: 15 }, sections: [] },
  { id: "entra", title: "Entra", weight: { min: 25, max: 30 }, sections: [] },
  { id: "security", title: "Security", weight: { min: 35, max: 40 }, sections: [] },
  { id: "compliance", title: "Compliance", weight: { min: 20, max: 25 }, sections: [] },
];

function makeQuestions(domain: string, count: number): Question[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${domain}-${index}`,
    domain,
    topic: "topic",
    subtopic: "subtopic",
    questionType: "single_choice",
    presentation: "standard",
    difficulty: "medium",
    question: "Question?",
    explanation: "Explanation.",
    learningObjective: "Objective",
    tags: [],
    sourceUrls: [],
    options: [{ id: "A", text: "A" }, { id: "B", text: "B" }],
    correctAnswer: ["A"],
  }));
}

describe("buildWeightedExam", () => {
  it("allocates 19 AI-901 questions to concepts and 26 to Foundry", () => {
    const selected = buildWeightedExam(
      [...makeQuestions("concepts", 30), ...makeQuestions("foundry", 30)],
      domains,
      45,
    );

    expect(selected).toHaveLength(45);
    expect(selected.filter((question) => question.domain === "concepts")).toHaveLength(19);
    expect(selected.filter((question) => question.domain === "foundry")).toHaveLength(26);
  });

  it("allocates SC-900 questions 6 / 12 / 17 / 10", () => {
    const selected = buildWeightedExam(
      sc900Domains.flatMap((domain) => makeQuestions(domain.id, 30)),
      sc900Domains,
      45,
    );

    expect(sc900Domains.map((domain) => selected.filter((question) => question.domain === domain.id).length))
      .toEqual([6, 12, 17, 10]);
  });

  it("redistributes a domain shortfall by weight without duplicating questions", () => {
    const questions = [
      ...makeQuestions("concepts", 2),
      ...makeQuestions("foundry", 30),
      ...makeQuestions("unlisted", 10),
    ];
    const selected = buildWeightedExam(questions, domains, 20);

    expect(selected).toHaveLength(20);
    expect(selected.filter((question) => question.domain === "concepts")).toHaveLength(2);
    expect(selected.filter((question) => question.domain === "foundry")).toHaveLength(18);
    expect(new Set(selected.map((question) => question.id)).size).toBe(selected.length);
    expect(selected.some((question) => question.domain === "unlisted")).toBe(false);
  });
});
