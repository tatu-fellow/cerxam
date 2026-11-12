# Cerxam — AI-901 practice simulator

Cerxam is an unofficial study app for practising Azure AI Fundamentals (AI-901) topics. It currently includes 160 questions and four practice modes.

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm
- A current desktop browser

## Use the application

1. Run `npm ci` to install dependencies.
2. Run `npm run dev` and open the local URL printed by Vite.
3. Choose a mode:
   - **Learning:** work through the question bank with explanations.
   - **Weighted Mock Exam:** 45 questions with a 45-minute timer.
   - **Applied Scenarios:** practise scenario-style questions and simulations.
   - **Weak Areas:** revisit missed questions, or try a harder set if there is no history yet.

Practice history is stored in your browser's local storage. It is not synced between devices.

## Project status

The app is a working practice simulator with question feedback, timed exams, scenario questions, and session results by learning objective. Its question bank and exam alignment may change as the project is updated; it is not an official Microsoft product or exam simulator.

## Contributing

Contributions are welcome. Open an issue to discuss a substantial change, then create a branch, make a focused change, and open a pull request to `master`. Include a clear description and run these checks before submitting:

```bash
npm run validate:questions
npm run lint
npm run build
```

Each question record in `src/data/questions/*.json` must include a nonempty `sourceUrls` array. Add one or more direct, official Microsoft Learn documentation URLs that support the answer and explanation; use specific training units, SDK references, or product documentation rather than a general study guide. Verify that the linked content supports the exact claim, and update the question, answer key, explanation, and option explanations together when changing a choice.

Explain why each distractor is wrong in its scenario, including any false premise. Replace duplicate learning checks with distinct scenarios while preserving question IDs. The validator checks structure and known boilerplate, not factual accuracy, source relevance, or semantic duplicates; these still require manual review.

For a documentation-grounded review in GitHub Copilot, use the shared [validate-questions skill](.github/skills/validate-questions/SKILL.md). In a fresh chat with this project open, select `/validate-questions` for the full bank, `/validate-questions changed` for local changes, or supply question IDs. Connect the Microsoft Learn Docs MCP server for source verification. The skill runs the validator and writes `QUESTION_VALIDATION_REPORT.md` (a new timestamped file if it already exists), without editing questions. Unavailable evidence is reported as unverified, and substantive changes still need human approval. If the command is missing, check **Chat: Open Customizations > Skills** and start a fresh chat.

Do not commit `node_modules`, credentials, or other secrets. Please verify question wording, answers, and explanations against current official learning materials before proposing changes.

## Important

Questions, answers, explanations, scoring, and exam-format simulations may be incomplete or incorrect. **Always verify information with current official Microsoft Learn materials; do not rely on Cerxam as the sole source of truth or as a guarantee of exam readiness.** The app is for study practice only.
