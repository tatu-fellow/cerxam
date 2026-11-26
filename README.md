# Cerxam — Microsoft certification practice

Cerxam is an unofficial, multi-exam study simulator for Microsoft certification
topics. It provides question feedback, timed mock exams, scenario practice, and
weak-area review. Exam details and practice formats are defined per exam.

## Supported exams

| Exam | Certification | Status | Questions |
| --- | --- | --- | ---: |
| AI-901 | Azure AI Fundamentals | Active | 160 |
| SC-900 | Microsoft Security, Compliance, and Identity Fundamentals | Beta | 160 |

SC-900 remains beta pending final content review. Its 45-question
mock is a practice format; the number of questions on the live exam can vary.
The status and question count for each exam are recorded in its manifest at
`src/data/exams/<exam-id>/exam.json`.

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm
- A current desktop browser

## Use the application

1. Run `npm ci` to install dependencies.
2. Run `npm run dev` and open the local URL printed by Vite.
3. Choose an exam and a practice mode:
   - **Learning:** work through the question bank with explanations.
   - **Weighted Mock Exam:** practise the exam's configured question count and
     duration.
   - **Applied Scenarios:** practise scenario-style questions and simulations.
   - **Weak Areas:** revisit missed questions, or try a harder set if there is
     no history yet.

Practice history is stored separately for each exam in your browser's local
storage. Existing AI-901 history is migrated automatically, and the dashboard
clears only the current exam's history. History is not synced between devices.

## Project status

The app is a working practice simulator. Its question banks and exam alignment
may change as the project is updated; it is not an official Microsoft product
or exam simulator.

See [CHANGELOG.md](CHANGELOG.md) for version history and beta release notes.

## Contributing

Contributions are welcome. Open an issue to discuss a substantial change, then
create a branch, make a focused change, and open a pull request to `master`.
Include a clear description and run these checks before submitting:

```bash
npm run validate:questions
npm test
npm run lint
npm run build
```

Each question record in
`src/data/exams/<exam-id>/questions/*.json` must include a nonempty `sourceUrls`
array. Add one or more direct, official Microsoft Learn documentation URLs that
support the answer and explanation; use specific training units, SDK
references, or product documentation rather than a general study guide. Verify
that the linked content supports the exact claim, and update the question,
answer key, explanation, and option explanations together when changing a
choice.

Explain why each distractor is wrong in its scenario, including any false
premise. Replace duplicate learning checks with distinct scenarios while
preserving question IDs. The validator checks structure and known boilerplate,
not factual accuracy, source relevance, or semantic duplicates; these still
require manual review.

For a documentation-grounded review in GitHub Copilot, use the shared
[validate-questions skill](.github/skills/validate-questions/SKILL.md). In a
fresh chat with this project open, use `/validate-questions` for all exams,
`/validate-questions <exam-id> changed` for local changes in one exam, or
supply question IDs (the skill infers their exam from the ID prefix). Connect
the Microsoft Learn Docs MCP server for source verification. The skill writes
`QUESTION_VALIDATION_REPORT-<EXAM-CODE>.md` for a single-exam review, or
`QUESTION_VALIDATION_REPORT-MULTI-EXAM.md` for a multi-exam review; existing
reports are preserved and a timestamped filename is used. It does not edit
questions. Unavailable evidence is reported as unverified, and substantive
changes still need human approval. If the command is missing, check **Chat:
Open Customizations > Skills** and start a fresh chat.

### Changelog and releases

- Update [CHANGELOG.md](CHANGELOG.md) in every feature PR to `master` branch. Include the version, date in
  `YYYY-MM-DD` format, and a short summary of changes.
- Use semantic versioning `MAJOR.MINOR.PATCH` (`x.x.x`): increase the major
  version for incompatible changes, minor for backward-compatible features,
  and patch for backward-compatible fixes.
- For prereleases, append a suffix such as `2.0.0-beta.1` and mention **BETA**
  in the entry title. Keep entries newest first; use Added, Changed, and Fixed
  sections where helpful. Confirm the date when publishing.
- When publishing a version, create an annotated Git tag on its merged commit,
  matching the changelog version with a `v` prefix, such as `v1.0.0` or
  `v2.0.0-beta.1`. Push the tag explicitly so versions have stable reference
  points. Do not move or reuse published tags.

## Adding a new exam

1. Copy `src/data/exams/_template/` to a new folder named with the exam ID,
   such as `src/data/exams/<exam-id>/`.
2. Fill in `exam.json` using the official study guide. Verify its URL and
   skills-measured date; define the question ID prefix, domains, sections,
   topics, weights, exam format, and allowed source hosts.
3. Add question files under `src/data/exams/<exam-id>/questions/`. Use IDs
   matching the manifest prefix and add direct Microsoft Learn `sourceUrls`.
   Set `expectedQuestionCount` when the bank's intended size is established,
   and update it whenever questions are deliberately added or removed.
4. Run `npm run validate:questions -- <exam-id>` and resolve all findings.
5. Run `/validate-questions <exam-id>` in GitHub Copilot for a
   documentation-grounded review.
6. Run `npm test`, `npm run lint`, and `npm run build`.
7. Keep the exam `beta` until its content has been reviewed and approved, then
   change its manifest status to `active`.

The `_template` manifest contains placeholders and no question files; replace
all placeholders before publishing a new exam.
An exam may set `modes.scenario.presentations` alongside its scenario question
count to override which presentation labels qualify for Applied Scenarios.
Without that setting, the default includes `case_study` presentations; eligible
question types also remain included.

Do not commit `node_modules`, credentials, or other secrets. Verify question
wording, answers, and explanations against current official learning materials
before proposing changes.

## Important

Questions, answers, explanations, scoring, and exam-format simulations may be
incomplete or incorrect. **Always verify information with current official
Microsoft Learn materials; do not rely on Cerxam as the sole source of truth or
as a guarantee of exam readiness.** The app is for study practice only.
