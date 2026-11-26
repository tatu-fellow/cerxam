import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examsDir = path.join(root, "src", "data", "exams");
const requestedExam = process.argv[2];
const genericExplanation = /related to the wider AI domain|does not address the principal requirement|plausible in a related scenario|does not satisfy the decisive requirement|does not satisfy the requirement described in this scenario|different operation from the one requested|not the operation requested here/i;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function createContext(folder) {
  return { folder, exam: null, files: [], questions: [], errors: [], warnings: [] };
}

function validateManifest(context) {
  const { exam, folder, errors } = context;
  if (!isRecord(exam)) {
    errors.push("manifest must be a JSON object.");
    return;
  }

  for (const field of ["id", "code", "title", "description", "questionIdPrefix", "status"]) {
    if (!nonemptyString(exam[field])) errors.push(`manifest.${field} must be a nonempty string.`);
  }
  if (nonemptyString(exam.id) && exam.id !== folder) {
    errors.push(`manifest.id "${exam.id}" must match its folder "${folder}".`);
  }
  if (nonemptyString(exam.status) && !["active", "beta", "retired"].includes(exam.status)) {
    errors.push(`manifest.status "${exam.status}" must be active, beta, or retired.`);
  }
  if (nonemptyString(exam.questionIdPrefix) && !/^[A-Za-z0-9]+$/.test(exam.questionIdPrefix)) {
    errors.push("manifest.questionIdPrefix must contain only letters and numbers.");
  }
  if (exam.tagline !== undefined && typeof exam.tagline !== "string") {
    errors.push("manifest.tagline must be a string when provided.");
  }
  if (exam.expectedQuestionCount !== undefined &&
      (!Number.isInteger(exam.expectedQuestionCount) || exam.expectedQuestionCount <= 0)) {
    errors.push("manifest.expectedQuestionCount must be a positive integer when provided.");
  }
  if (exam.questionFileOrder !== undefined &&
      (!Array.isArray(exam.questionFileOrder) || exam.questionFileOrder.some((file) => !nonemptyString(file)))) {
    errors.push("manifest.questionFileOrder must be an array of nonempty file names when provided.");
  }
  if (exam.studyGuideUrl !== undefined && typeof exam.studyGuideUrl !== "string") {
    errors.push("manifest.studyGuideUrl must be a string when provided.");
  }
  if (exam.skillsMeasuredDate !== undefined && typeof exam.skillsMeasuredDate !== "string") {
    errors.push("manifest.skillsMeasuredDate must be a string when provided.");
  }
  if (exam.allowedSourceHosts !== undefined &&
      (!Array.isArray(exam.allowedSourceHosts) || exam.allowedSourceHosts.some((host) => !nonemptyString(host)))) {
    errors.push("manifest.allowedSourceHosts must be an array of nonempty host names when provided.");
  }

  if (!isRecord(exam.format)) {
    errors.push("manifest.format must be an object.");
  } else {
    for (const field of ["durationMinutes", "questionCount", "readinessTarget", "minimumObjectiveTarget"]) {
      if (typeof exam.format[field] !== "number" || !Number.isFinite(exam.format[field]) || exam.format[field] <= 0) {
        errors.push(`manifest.format.${field} must be a positive number.`);
      }
    }
    for (const field of ["durationMinutes", "questionCount"]) {
      if (typeof exam.format[field] === "number" && !Number.isInteger(exam.format[field])) {
        errors.push(`manifest.format.${field} must be an integer.`);
      }
    }
    for (const field of ["readinessTarget", "minimumObjectiveTarget"]) {
      if (typeof exam.format[field] === "number" && exam.format[field] > 100) {
        errors.push(`manifest.format.${field} must not exceed 100.`);
      }
    }
  }

  if (exam.modes !== undefined) {
    if (!isRecord(exam.modes)) {
      errors.push("manifest.modes must be an object when provided.");
    } else {
      for (const mode of ["scenario", "weakFallback"]) {
        if (exam.modes[mode] !== undefined &&
            (!isRecord(exam.modes[mode]) ||
             !Number.isInteger(exam.modes[mode].questionCount) ||
             exam.modes[mode].questionCount <= 0)) {
          errors.push(`manifest.modes.${mode}.questionCount must be a positive integer when provided.`);
        }
      }
    }
  }

  if (!Array.isArray(exam.domains) || exam.domains.length === 0) {
    errors.push("manifest.domains must be a nonempty array.");
    return;
  }

  const domainIds = [];
  const sectionIds = [];
  const sectionTitles = [];
  let minimumWeight = 0;
  let maximumWeight = 0;
  let validWeights = true;
  for (const [domainIndex, domain] of exam.domains.entries()) {
    if (!isRecord(domain)) {
      errors.push(`manifest.domains[${domainIndex}] must be an object.`);
      validWeights = false;
      continue;
    }
    if (!nonemptyString(domain.id)) errors.push(`manifest.domains[${domainIndex}].id must be a nonempty string.`);
    else domainIds.push(domain.id);
    if (!nonemptyString(domain.title)) errors.push(`manifest.domains[${domainIndex}].title must be a nonempty string.`);

    if (!isRecord(domain.weight) ||
        typeof domain.weight.min !== "number" || !Number.isFinite(domain.weight.min) ||
        typeof domain.weight.max !== "number" || !Number.isFinite(domain.weight.max)) {
      errors.push(`manifest domain "${domain.id ?? domainIndex}" must have numeric weight.min and weight.max.`);
      validWeights = false;
    } else if (domain.weight.min < 0 || domain.weight.min > domain.weight.max || domain.weight.max > 100) {
      errors.push(`manifest domain "${domain.id ?? domainIndex}" weight must satisfy 0 ≤ min ≤ max ≤ 100.`);
      validWeights = false;
    } else {
      minimumWeight += domain.weight.min;
      maximumWeight += domain.weight.max;
    }

    if (!Array.isArray(domain.sections) || domain.sections.length === 0) {
      errors.push(`manifest domain "${domain.id ?? domainIndex}" must have a nonempty sections array.`);
      continue;
    }
    for (const [sectionIndex, section] of domain.sections.entries()) {
      if (!isRecord(section)) {
        errors.push(`manifest domain "${domain.id ?? domainIndex}" section ${sectionIndex} must be an object.`);
        continue;
      }
      if (!nonemptyString(section.id)) errors.push(`manifest domain "${domain.id ?? domainIndex}" section ${sectionIndex} id must be a nonempty string.`);
      else sectionIds.push(section.id);
      if (!nonemptyString(section.title)) errors.push(`manifest domain "${domain.id ?? domainIndex}" section ${sectionIndex} title must be a nonempty string.`);
      else sectionTitles.push(section.title);
      if (!Array.isArray(section.topics) || section.topics.some((topic) => !nonemptyString(topic))) {
        errors.push(`manifest section "${section.id ?? sectionIndex}" topics must be an array of nonempty strings.`);
      }
      if (section.officialTitle !== undefined && typeof section.officialTitle !== "string") {
        errors.push(`manifest section "${section.id ?? sectionIndex}" officialTitle must be a string when provided.`);
      }
    }
  }

  if (!unique(domainIds)) errors.push("manifest domain IDs must be unique within the exam.");
  if (!unique(sectionIds)) errors.push("manifest section IDs must be unique within the exam.");
  if (!unique(sectionTitles)) errors.push("manifest section titles must be unique within the exam.");
  if (validWeights && (minimumWeight > 100 || maximumWeight < 100)) {
    errors.push(`manifest domain weights must satisfy sum(min) ≤ 100 ≤ sum(max); found ${minimumWeight}–${maximumWeight}.`);
  }
}

function validateQuestion(context, file, question, domains, allowedHosts, idPattern) {
  const { exam, errors } = context;
  const examId = nonemptyString(exam?.id) ? exam.id : context.folder;
  if (!isRecord(question)) {
    errors.push(`${file}: each question must be an object.`);
    return;
  }

  const label = `${file}:${question.id ?? "(missing id)"}`;
  if (!nonemptyString(question.id) || !idPattern.test(question.id)) {
    errors.push(`${label}: ID must match the exam prefix and a numeric suffix of at least three digits.`);
  }
  if (typeof question.question !== "string" || !question.question.trim()) {
    errors.push(`${label}: question text must be nonempty.`);
  }
  const domain = domains.find((candidate) => candidate.id === question.domain);
  if (!domain) {
    errors.push(`${label}: domain "${question.domain ?? "(missing)"}" is not in the exam manifest.`);
  } else if (!Array.isArray(domain.sections) ||
             !domain.sections.some((section) => isRecord(section) && section.title === question.topic)) {
    errors.push(`${label}: topic "${question.topic ?? "(missing)"}" must match a section title in domain "${domain.id}".`);
  }

  if (!Array.isArray(question.sourceUrls) || question.sourceUrls.length === 0) {
    errors.push(`${label}: sourceUrls must be a nonempty array.`);
  } else {
    for (const source of question.sourceUrls) {
      try {
        const url = new URL(source);
        if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname.toLowerCase())) {
          errors.push(`${label}: source must be an HTTPS URL on an allowed host (${source}).`);
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
    } else {
      const optionIds = options.map((option) => isRecord(option) ? option.id : undefined);
      const optionTexts = options.map((option) => isRecord(option) ? option.text : undefined);
      if (optionIds.some((id) => !nonemptyString(id))) errors.push(`${label}: every option must have a nonempty string ID.`);
      if (optionTexts.some((text) => !nonemptyString(text))) errors.push(`${label}: every option must have nonempty text.`);
      const validIds = optionIds.filter(nonemptyString);
      if (!unique(validIds)) errors.push(`${label}: option IDs must be unique.`);
      const normalizedTexts = optionTexts.filter(nonemptyString).map((text) => text.trim().toLocaleLowerCase());
      if (!unique(normalizedTexts)) errors.push(`${label}: duplicate option text.`);

      if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length === 0) {
        errors.push(`${label}: correctAnswer must be a nonempty option ID array.`);
      } else {
        if (!unique(question.correctAnswer)) errors.push(`${label}: correctAnswer contains duplicate option IDs.`);
        if (question.correctAnswer.some((id) => !validIds.includes(id))) {
          errors.push(`${label}: correctAnswer references an unknown option.`);
        }
        if (question.questionType === "single_choice" && question.correctAnswer.length !== 1) {
          errors.push(`${label}: single_choice must have exactly one correct answer.`);
        }
        if (question.questionType === "multiple_choice" && question.correctAnswer.length < 2) {
          errors.push(`${label}: multiple_choice must have at least two correct answers.`);
        }
        if (question.correctAnswer.length > 1 &&
            (typeof question.question !== "string" || !/\b(two|2|multiple)\b/i.test(question.question))) {
          errors.push(`${label}: question instructions must state that multiple answers are required.`);
        }
      }

      const explanations = question.optionExplanations;
      if (!isRecord(explanations) ||
          validIds.some((id) => typeof explanations[id] !== "string" || !explanations[id].trim())) {
        errors.push(`${label}: every option must have a nonempty optionExplanations entry.`);
      }
      if (isRecord(explanations) && Object.keys(explanations).some((id) => !validIds.includes(id))) {
        errors.push(`${label}: optionExplanations references an unknown option.`);
      }
      for (const option of options) {
        if (isRecord(option) && genericExplanation.test(typeof option.explanation === "string" ? option.explanation : "")) {
          errors.push(`${label}: generic embedded explanation remains for option ${option.id}.`);
        }
      }
    }
  } else if (question.questionType === "matching" || question.questionType === "yes_no_matrix") {
    const itemIds = Array.isArray(question.items)
      ? question.items.map((item) => isRecord(item) ? item.id : undefined)
      : [];
    const targetIds = Array.isArray(question.targets)
      ? question.targets.map((target) => isRecord(target) ? target.id : undefined)
      : [];
    if (!itemIds.length || !targetIds.length ||
        itemIds.some((id) => !nonemptyString(id)) || targetIds.some((id) => !nonemptyString(id)) ||
        !unique(itemIds) || !unique(targetIds)) {
      errors.push(`${label}: matching item and target IDs must be nonempty and unique.`);
    }
    if (!isRecord(question.correctAnswer)) {
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
    const itemIds = Array.isArray(question.items)
      ? question.items.map((item) => isRecord(item) ? item.id : undefined)
      : [];
    if (!itemIds.length || itemIds.some((id) => !nonemptyString(id)) ||
        !Array.isArray(question.correctAnswer) ||
        question.correctAnswer.length !== itemIds.length ||
        !unique(question.correctAnswer) ||
        question.correctAnswer.some((id) => !itemIds.includes(id))) {
      errors.push(`${label}: ordering answer must be a permutation of all item IDs.`);
    }
  } else {
    errors.push(`${label}: unsupported questionType "${question.questionType}".`);
  }

  const textToCheck = [
    question.explanation,
    ...(isRecord(question.optionExplanations) ? Object.values(question.optionExplanations) : []),
    ...(Array.isArray(question.options)
      ? question.options.map((option) => isRecord(option) ? option.explanation : undefined)
      : []),
  ];
  if (textToCheck.some((text) => typeof text === "string" && genericExplanation.test(text))) {
    errors.push(`${label}: generic distractor explanation remains.`);
  }
  if (Array.isArray(question.options) &&
      question.options.some((option) => isRecord(option) &&
        typeof option.text === "string" &&
        /model capability that does not support the required modality|placeholder/i.test(option.text))) {
    errors.push(`${label}: placeholder distractor remains.`);
  }
  return { examId, question };
}

const directories = (await readdir(examsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();
const contexts = [];
for (const folder of directories) {
  const manifestPath = path.join(examsDir, folder, "exam.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    const context = createContext(folder);
    context.errors.push(`exam.json: invalid JSON or unreadable file (${error.message}).`);
    contexts.push(context);
    continue;
  }
  const context = createContext(folder);
  context.exam = manifest;
  contexts.push(context);
  validateManifest(context);
}

const selectedContexts = requestedExam
  ? contexts.filter((context) => context.folder === requestedExam || context.exam?.id === requestedExam)
  : contexts;
if (requestedExam && selectedContexts.length === 0) {
  console.error(`Unknown exam "${requestedExam}".`);
  process.exitCode = 1;
} else if (selectedContexts.length === 0) {
  console.error("No exam manifests found under src/data/exams.");
  process.exitCode = 1;
}

for (const context of selectedContexts) {
  const examId = nonemptyString(context.exam?.id) ? context.exam.id : context.folder;
  const prefix = context.exam?.questionIdPrefix;
  const prefixPattern = nonemptyString(prefix)
    ? new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d{3,}$`)
    : /^$a/;
  const questionDir = path.join(examsDir, context.folder, "questions");
  try {
    context.files = (await readdir(questionDir)).filter((file) => file.endsWith(".json")).sort();
  } catch (error) {
    context.errors.push(`questions: unable to read question directory (${error.message}).`);
    continue;
  }
  if (context.files.length === 0) context.errors.push("questions: expected at least one JSON question file.");

  for (const file of context.files) {
    let records;
    try {
      records = JSON.parse(await readFile(path.join(questionDir, file), "utf8"));
    } catch (error) {
      context.errors.push(`${file}: invalid JSON (${error.message}).`);
      continue;
    }
    if (!Array.isArray(records)) {
      context.errors.push(`${file}: expected a top-level question array.`);
      continue;
    }
    for (const question of records) {
      const validated = validateQuestion(
        context,
        file,
        question,
        Array.isArray(context.exam?.domains) ? context.exam.domains.filter(isRecord) : [],
        Array.isArray(context.exam?.allowedSourceHosts)
          ? context.exam.allowedSourceHosts.filter(nonemptyString).map((host) => host.toLowerCase())
          : ["learn.microsoft.com"],
        prefixPattern,
      );
      if (validated) context.questions.push(validated.question);
    }
  }

  if (Number.isInteger(context.exam?.expectedQuestionCount)) {
    const expectedCount = context.exam.expectedQuestionCount;
    if (context.questions.length !== expectedCount) {
      context.errors.push(`expected ${expectedCount} questions; found ${context.questions.length}.`);
    }
    const idCounts = new Map();
    for (const question of context.questions) {
      idCounts.set(question.id, (idCounts.get(question.id) ?? 0) + 1);
    }
    for (let index = 1; index <= expectedCount; index += 1) {
      const id = `${prefix}-${String(index).padStart(3, "0")}`;
      if (idCounts.get(id) !== 1) {
        context.errors.push(`${id}: expected exactly one record; found ${idCounts.get(id) ?? 0}.`);
      }
    }
  }
  context.examId = examId;
}

const relevantExamIds = new Map();
for (const context of contexts) {
  if (!isRecord(context.exam) || !nonemptyString(context.exam.id)) continue;
  const ids = relevantExamIds.get(context.exam.id) ?? [];
  ids.push(context);
  relevantExamIds.set(context.exam.id, ids);
}
for (const [id, duplicates] of relevantExamIds) {
  if (duplicates.length > 1) {
    for (const context of duplicates.filter((candidate) => selectedContexts.includes(candidate))) {
      context.errors.push(`manifest.id "${id}" is also used by ${duplicates.filter((candidate) => candidate !== context).map((candidate) => candidate.exam?.id ?? candidate.folder).join(", ")}.`);
    }
  }
}

const relevantPrefixes = new Map();
for (const context of contexts) {
  if (!nonemptyString(context.exam?.questionIdPrefix)) continue;
  const prefixContexts = relevantPrefixes.get(context.exam.questionIdPrefix) ?? [];
  prefixContexts.push(context);
  relevantPrefixes.set(context.exam.questionIdPrefix, prefixContexts);
}
for (const [prefix, duplicates] of relevantPrefixes) {
  if (duplicates.length > 1) {
    for (const context of duplicates.filter((candidate) => selectedContexts.includes(candidate))) {
      context.errors.push(`manifest.questionIdPrefix "${prefix}" is also used by ${duplicates.filter((candidate) => candidate !== context).map((candidate) => candidate.exam?.id ?? candidate.folder).join(", ")}.`);
    }
  }
}

const allIds = new Map();
const firstStemByExam = new Map();
for (const context of selectedContexts) {
  const examId = context.examId ?? context.folder;
  for (const question of context.questions) {
    if (nonemptyString(question.id)) {
      const matches = allIds.get(question.id) ?? [];
      matches.push({ examId, context });
      allIds.set(question.id, matches);
    }
    if (typeof question.question === "string" && question.question.trim()) {
      const stem = question.question.trim().replace(/\s+/g, " ").toLowerCase();
      const previous = firstStemByExam.get(stem);
      if (previous) {
        context.warnings.push(
          `question stem duplicates ${previous.examId}:${previous.question.id} (${examId}:${question.id}).`,
        );
      } else {
        firstStemByExam.set(stem, { examId, question });
      }
    }
  }
}

for (const [id, matches] of allIds) {
  if (matches.length > 1) {
    for (const { context } of matches) {
      context.errors.push(`${id}: duplicate question ID in selected banks (${matches.map((match) => match.examId).join(", ")}).`);
    }
  }
}

let totalWarnings = 0;
let totalErrors = 0;
for (const context of selectedContexts) {
  const examId = context.examId ?? (nonemptyString(context.exam?.id) ? context.exam.id : context.folder);
  for (const error of context.errors) console.error(`[${examId}] ERROR: ${error}`);
  for (const warning of context.warnings) console.warn(`[${examId}] WARNING: ${warning}`);
  totalErrors += context.errors.length;
  totalWarnings += context.warnings.length;
  console.log(`${examId}: ${context.files.length} files, ${context.questions.length} questions, ${context.errors.length} errors, ${context.warnings.length} warnings.`);
}
console.log(`Total warnings: ${totalWarnings}`);
if (totalErrors > 0) process.exitCode = 1;
