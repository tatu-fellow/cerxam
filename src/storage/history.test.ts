import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendAttempts, clearHistory, getWeakIds, migrateLegacyHistory, readHistory } from "./history";
import type { AttemptRecord } from "./history";

const legacyKey = "cerxam-history-v2";
const migrationKey = "cerxam:v3:migrated";
const aiHistoryKey = "cerxam:v3:history:ai-901";
const scHistoryKey = "cerxam:v3:history:sc-900";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function attempt(questionId: string, correct = false): AttemptRecord {
  return { questionId, correct, timestamp: "2026-11-26T00:00:00.000Z" };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("migrateLegacyHistory", () => {
  it("appends only AI-901 attempts, preserves other exams, and runs once", () => {
    const existing = attempt("AI901-002", true);
    const migrated = { ...attempt("AI901-001"), confidence: "certain" } satisfies AttemptRecord;
    const otherExam = attempt("SC900-001");
    localStorage.setItem(aiHistoryKey, JSON.stringify([existing]));
    localStorage.setItem(scHistoryKey, JSON.stringify([otherExam]));
    localStorage.setItem(legacyKey, JSON.stringify([migrated, otherExam]));

    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([existing, migrated]);
    expect(getWeakIds("ai-901")).toEqual(new Set(["AI901-001"]));
    expect(readHistory("sc-900")).toEqual([otherExam]);
    expect(localStorage.getItem(migrationKey)).toBe("true");
    expect(localStorage.getItem(legacyKey)).toBeNull();

    localStorage.setItem(legacyKey, JSON.stringify([migrated]));
    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([existing, migrated]);
  });

  it("keeps the most recent 1,000 appended attempts", () => {
    const existing = Array.from({ length: 998 }, (_, index) => attempt(`AI901-existing-${index}`));
    const legacy = Array.from({ length: 5 }, (_, index) => attempt(`AI901-legacy-${index}`));
    localStorage.setItem(aiHistoryKey, JSON.stringify(existing));
    localStorage.setItem(legacyKey, JSON.stringify(legacy));

    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([...existing.slice(3), ...legacy]);
  });

  it("treats malformed legacy JSON as empty without overwriting existing history", () => {
    const existing = attempt("AI901-002", true);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(aiHistoryKey, JSON.stringify([existing]));
    localStorage.setItem(legacyKey, "{invalid");

    expect(migrateLegacyHistory).not.toThrow();
    expect(readHistory("ai-901")).toEqual([existing]);
    expect(localStorage.getItem(migrationKey)).toBe("true");
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(warning).toHaveBeenCalledOnce();
  });

  it("ignores invalid entries in a legacy array without losing valid attempts", () => {
    const valid = attempt("AI901-001");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(legacyKey, JSON.stringify([null, {}, { ...valid, questionId: 1 }, valid]));

    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([valid]);
    expect(warning).toHaveBeenCalledOnce();
  });

  it("restores existing history if the migration marker cannot be saved, allowing a safe retry", () => {
    const existing = attempt("AI901-002", true);
    const legacy = attempt("AI901-001");
    localStorage.setItem(aiHistoryKey, JSON.stringify([existing]));
    localStorage.setItem(legacyKey, JSON.stringify([legacy]));
    const setItem = localStorage.setItem.bind(localStorage);
    const save = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === migrationKey) throw new Error("Storage is full");
      setItem(key, value);
    });

    expect(migrateLegacyHistory).toThrow("Storage is full");
    expect(readHistory("ai-901")).toEqual([existing]);
    expect(localStorage.getItem(legacyKey)).not.toBeNull();
    expect(localStorage.getItem(migrationKey)).toBeNull();

    save.mockRestore();
    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([existing, legacy]);
  });

  it("removes a newly created destination if the migration marker cannot be saved", () => {
    const legacy = attempt("AI901-001");
    localStorage.setItem(legacyKey, JSON.stringify([legacy]));
    const setItem = localStorage.setItem.bind(localStorage);
    const save = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === migrationKey) throw new Error("Storage is full");
      setItem(key, value);
    });

    expect(migrateLegacyHistory).toThrow("Storage is full");
    expect(localStorage.getItem(aiHistoryKey)).toBeNull();
    expect(localStorage.getItem(legacyKey)).not.toBeNull();

    save.mockRestore();
    migrateLegacyHistory();
    expect(readHistory("ai-901")).toEqual([legacy]);
  });

  it("does not mark migration complete when no legacy key exists", () => {
    migrateLegacyHistory();
    expect(localStorage.getItem(migrationKey)).toBeNull();
  });
});

describe("per-exam history", () => {
  it("keeps weak areas and clearing isolated by exam", () => {
    appendAttempts("ai-901", [attempt("AI901-001")]);
    appendAttempts("sc-900", [attempt("SC900-001")]);

    expect(getWeakIds("ai-901")).toEqual(new Set(["AI901-001"]));
    expect(getWeakIds("sc-900")).toEqual(new Set(["SC900-001"]));
    clearHistory("ai-901");
    expect(readHistory("ai-901")).toEqual([]);
    expect(readHistory("sc-900")).toEqual([attempt("SC900-001")]);
  });
});
