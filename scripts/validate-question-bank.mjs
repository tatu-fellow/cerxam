import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const questionsDir = path.join(root, "src", "data", "exams", "ai-901", "questions");
const files = (await readdir(questionsDir)).filter((file) => file.endsWith(".json")).sort();
const errors = [];
const questions = [];
const questionStems = new Map();
const expectedIds = new Set(
  Array.from({ length: 160 }, (_, index) => `AI901-${String(index + 1).padStart(3, "0")}`),
);
const genericExplanation = /related to the wider AI domain|does not address the principal requirement|plausible in a related scenario|does not satisfy the decisive requirement|does not satisfy the requirement described in this scenario|different operation from the one requested|not the operation requested here/i;

if (files.length !== 9) {
  errors.push(`Expected 9 question JSON files; found ${files.length}.`);
}

for (const file of files) {
  let records;
  try {
    records = JSON.parse(await readFile(path.join(questionsDir, file), "utf8"));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message}).`);
    continue;
  }
  if (!Array.isArray(records)) {
    errors.push(`${file}: expected a top-level question array.`);
    continue;
  }

  for (const question of records) {
    questions.push(question);
    const label = `${file}:${question.id ?? "(missing id)"}`;
    if (!question.id || !expectedIds.has(question.id)) {
      errors.push(`${label}: missing or unexpected question ID.`);
    }
    if (typeof question.question !== "string" || !question.question.trim()) {
      errors.push(`${label}: question text must be nonempty.`);
    } else {
      const stem = question.question.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      const existingId = questionStems.get(stem);
      if (existingId) {
        errors.push(`${label}: question stem duplicates ${existingId}.`);
      } else {
        questionStems.set(stem, question.id);
      }
    }

    if (!Array.isArray(question.sourceUrls) || question.sourceUrls.length === 0) {
      errors.push(`${label}: sourceUrls must be a nonempty array.`);
    } else {
      for (const source of question.sourceUrls) {
        try {
          const url = new URL(source);
          if (url.protocol !== "https:" || url.hostname !== "learn.microsoft.com") {
            errors.push(`${label}: source must be an HTTPS Microsoft Learn URL (${source}).`);
          }
        } catch {
          errors.push(`${label}: invalid source URL (${source}).`);
        }
      }
    }

    const choices = ["single_choice", "multiple_choice", "code_analysis"].includes(question.questionType);
    if (choices) {
      const options = question.options;
      if (!Array.isArray(options) || options.length < 2) {
        errors.push(`${label}: choice question must have at least two options.`);
        continue;
      }
      const optionIds = options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) {
        errors.push(`${label}: option IDs must be unique.`);
      }
      const normalizedTexts = options.map((option) => option.text.trim().toLocaleLowerCase());
      if (new Set(normalizedTexts).size !== normalizedTexts.length) {
        errors.push(`${label}: duplicate option text.`);
      }
      if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length === 0) {
        errors.push(`${label}: correctAnswer must be a nonempty option ID array.`);
      } else {
        if (new Set(question.correctAnswer).size !== question.correctAnswer.length) {
          errors.push(`${label}: correctAnswer contains duplicate option IDs.`);
        }
        if (question.correctAnswer.some((id) => !optionIds.includes(id))) {
          errors.push(`${label}: correctAnswer references an unknown option.`);
        }
        if (question.questionType === "single_choice" && question.correctAnswer.length !== 1) {
          errors.push(`${label}: single_choice must have exactly one correct answer.`);
        }
        if (question.questionType === "multiple_choice" && question.correctAnswer.length < 2) {
          errors.push(`${label}: multiple_choice must have at least two correct answers.`);
        }
        if (question.correctAnswer.length > 1 && !/\b(two|2|multiple)\b/i.test(question.question)) {
          errors.push(`${label}: question instructions must state that multiple answers are required.`);
        }
      }
      const explanations = question.optionExplanations;
      if (!explanations || optionIds.some((id) => typeof explanations[id] !== "string" || !explanations[id].trim())) {
        errors.push(`${label}: every option must have a nonempty optionExplanations entry.`);
      }
      if (explanations && Object.keys(explanations).some((id) => !optionIds.includes(id))) {
        errors.push(`${label}: optionExplanations references an unknown option.`);
      }
      for (const option of options) {
        if (genericExplanation.test(option.explanation ?? "")) {
          errors.push(`${label}: generic embedded explanation remains for option ${option.id}.`);
        }
      }
    } else if (question.questionType === "matching" || question.questionType === "yes_no_matrix") {
      const itemIds = (question.items ?? []).map((item) => item.id);
      const targetIds = (question.targets ?? []).map((target) => target.id);
      if (!itemIds.length || !targetIds.length || new Set(itemIds).size !== itemIds.length || new Set(targetIds).size !== targetIds.length) {
        errors.push(`${label}: matching item and target IDs must be nonempty and unique.`);
      }
      if (!question.correctAnswer || Array.isArray(question.correctAnswer) || typeof question.correctAnswer !== "object") {
        errors.push(`${label}: correctAnswer must be an item-to-target mapping.`);
      } else {
        const answerKeys = Object.keys(question.correctAnswer);
        if (answerKeys.length !== itemIds.length || itemIds.some((id) => !answerKeys.includes(id))) {
          errors.push(`${label}: answer mapping must contain exactly one entry for each item.`);
        }
        if (Object.values(question.correctAnswer).some((id) => !targetIds.includes(id))) {
          errors.push(`${label}: answer mapping references an unknown target.`);
        }
      }
      if (question.questionType === "yes_no_matrix" && !["yes", "no"].every((id) => targetIds.includes(id))) {
        errors.push(`${label}: yes_no_matrix targets must include yes and no.`);
      }
    } else if (question.questionType === "ordering") {
      const itemIds = (question.items ?? []).map((item) => item.id);
      if (!itemIds.length || !Array.isArray(question.correctAnswer) ||
        question.correctAnswer.length !== itemIds.length ||
        new Set(question.correctAnswer).size !== itemIds.length ||
        question.correctAnswer.some((id) => !itemIds.includes(id))) {
        errors.push(`${label}: ordering answer must be a permutation of all item IDs.`);
      }
    } else {
      errors.push(`${label}: unsupported questionType "${question.questionType}".`);
    }

    const textToCheck = [
      question.explanation,
      ...Object.values(question.optionExplanations ?? {}),
      ...(question.options ?? []).map((option) => option.explanation ?? ""),
    ];
    if (textToCheck.some((text) => genericExplanation.test(text))) {
      errors.push(`${label}: generic distractor explanation remains.`);
    }
    if ((question.options ?? []).some((option) => /model capability that does not support the required modality|placeholder/i.test(option.text))) {
      errors.push(`${label}: placeholder distractor remains.`);
    }
  }
}

const idCounts = new Map();
for (const question of questions) {
  idCounts.set(question.id, (idCounts.get(question.id) ?? 0) + 1);
}
for (const id of expectedIds) {
  if (idCounts.get(id) !== 1) {
    errors.push(`${id}: expected exactly one record; found ${idCounts.get(id) ?? 0}.`);
  }
}
for (const [id, count] of idCounts) {
  if (count > 1) {
    errors.push(`${id}: duplicate question ID (${count} records).`);
  }
}

if (questions.length !== 160) {
  errors.push(`Expected 160 questions; found ${questions.length}.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${files.length} JSON files and ${questions.length} unique questions.`);
}
