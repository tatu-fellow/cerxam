import { appConfig } from "../config";
import type { Confidence } from "../types/questions";

export interface AttemptRecord {
  questionId: string;
  correct: boolean;
  confidence?: Confidence;
  timestamp: string;
}

const LEGACY_KEY = "cerxam-history-v2";
const MIGRATED_KEY = "cerxam:v3:migrated";
const LEGACY_EXAM_ID = "ai-901";

function historyKey(examId: string): string {
  return `cerxam:v3:history:${examId}`;
}

function isAttemptRecord(value: unknown): value is AttemptRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.questionId === "string" &&
    typeof record.correct === "boolean" &&
    typeof record.timestamp === "string" &&
    (record.confidence === undefined ||
      record.confidence === "guess" ||
      record.confidence === "somewhat" ||
      record.confidence === "certain");
}

function parseHistory(raw: string | null, key: string): AttemptRecord[] {
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    console.warn(`Ignoring malformed practice history in "${key}".`);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn(`Ignoring practice history in "${key}": expected an array.`);
    return [];
  }
  const attempts = parsed.filter(isAttemptRecord);
  if (attempts.length !== parsed.length) {
    console.warn(`Ignoring invalid practice history entries in "${key}".`);
  }
  return attempts;
}

export function readHistory(examId: string): AttemptRecord[] {
  const key = historyKey(examId);
  return parseHistory(localStorage.getItem(key), key);
}

export function appendAttempts(examId: string, attempts: readonly AttemptRecord[]): AttemptRecord[] {
  const history = [...readHistory(examId), ...attempts].slice(-appConfig.historyLimit);
  localStorage.setItem(historyKey(examId), JSON.stringify(history));
  return history;
}

export function clearHistory(examId: string): void {
  localStorage.removeItem(historyKey(examId));
}

export function getWeakIds(examId: string): Set<string> {
  return new Set(readHistory(examId).filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId));
}

export function migrateLegacyHistory(): void {
  if (localStorage.getItem(MIGRATED_KEY) !== null) return;

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return;

  const attempts = parseHistory(legacy, LEGACY_KEY).filter((attempt) => attempt.questionId.startsWith("AI901-"));
  const destination = historyKey(LEGACY_EXAM_ID);
  const previous = attempts.length > 0 ? localStorage.getItem(destination) : null;
  if (attempts.length > 0) appendAttempts(LEGACY_EXAM_ID, attempts);

  try {
    localStorage.setItem(MIGRATED_KEY, "true");
  } catch (error) {
    if (attempts.length > 0) {
      // Restore the original history so a retry cannot append the same attempts twice.
      try {
        if (previous === null) localStorage.removeItem(destination);
        else localStorage.setItem(destination, previous);
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          "History migration failed and the previous history could not be restored.",
          { cause: restoreError },
        );
      }
    }
    throw error;
  }
  localStorage.removeItem(LEGACY_KEY);
}
