import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("scenario presentation manifest validation", () => {
  it("accepts presentation arrays and rejects invalid values", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cerxam-validator-"));
    try {
      const sourceExam = path.resolve("src/data/exams/sc-900");
      const examDir = path.join(root, "src", "data", "exams", "sc-900");
      const scriptsDir = path.join(root, "scripts");
      mkdirSync(examDir, { recursive: true });
      mkdirSync(scriptsDir, { recursive: true });
      cpSync(path.join(sourceExam, "questions"), path.join(examDir, "questions"), { recursive: true });
      cpSync(path.resolve("scripts/validate-question-bank.mjs"), path.join(scriptsDir, "validate-question-bank.mjs"));
      const manifest = JSON.parse(readFileSync(path.join(sourceExam, "exam.json"), "utf8"));
      const manifestPath = path.join(examDir, "exam.json");
      const script = path.join(scriptsDir, "validate-question-bank.mjs");

      writeFileSync(manifestPath, JSON.stringify(manifest));
      expect(execFileSync(process.execPath, [script, "sc-900"], { encoding: "utf8" }))
        .toContain("0 errors");

      for (const invalid of ["scenario", ["case_study", ""]]) {
        manifest.modes.scenario.presentations = invalid;
        writeFileSync(manifestPath, JSON.stringify(manifest));
        const result = spawnSync(process.execPath, [script, "sc-900"], { encoding: "utf8" });
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr)
          .toContain("manifest.modes.scenario.presentations must be an array of nonempty strings");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
