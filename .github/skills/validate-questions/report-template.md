# Question validation report

## Review baseline

- Reviewed at: <date, time, timezone>
- Scope and selection method: <all exams, one exam, changed with baseline, or IDs>
- Exam: <exam ID / code / title, or all selected exams>
- Workspace revision: <commit and dirty state, or Git unavailable>
- Inventory: <exam/file/record counts, selected IDs, removed IDs if applicable>
- Deterministic validator: <command, exit status, and relevant output>
- Verdict: <PASS | WARN | FAIL | BLOCKED>
- Human approval: Pending

## Summary

<Summarize established defects, editorial concerns, uncertainty, and exact
completion counts. Explain the verdict and any unreviewed work.>

## Exam reviews

Repeat this section once for each exam in scope.

### <EXAM-CODE> — <Exam title>

- Exam: <manifest ID>
- Status: <active | beta | retired>
- Official study guide: <manifest URL>
- Manifest skills-measured date: <date>
- Date confirmed in current study guide: <date or mismatch / unavailable>
- Documentation retrieval date/method: <date; Microsoft Learn Docs MCP or approved alternative>
- Exam verdict: <PASS | WARN | FAIL | BLOCKED>

#### Summary

<Exam-specific summary and completion counts.>

#### Deterministic validation

| Command/check | Result | Relevant output or limitation |
| --- | --- | --- |
| `npm run validate:questions -- <exam-id>` | <exit status / not run> | <details> |
| Additional schema checks | <result> | <coverage beyond the script> |

#### Per-question coverage

Use one row per selected ID. Allowed outcomes: verified, issue, unverified,
not reviewed, not applicable. Map objective text to the current study guide.

| ID / file | Current exam objective | Structure / metadata | Stem / options / key | Explanations / code | Sources | Findings |
| --- | --- | --- | --- | --- | --- | --- |
| <ID / relative file link> | <objective / evidence reference> | <outcome> | <outcome> | <outcome> | <outcome> | <finding IDs or none> |

#### Findings and proposed corrections

##### <F001> - <question ID and concise issue>

- **Location:** <relative file link; JSON property and option/item ID>
- **Severity:** <error | warning | needs human review>
- **Evidence type:** <documentation-backed fact | editorial judgment | unresolved>
- **Issue:** <what is wrong or uncertain and its consequence>
- **Evidence:** <source URL/section, short paraphrase, applicable version/date>
- **Proposed correction:** <concrete replacement wording/key/explanation/source;
  include dependent mappings that would need updating>

If no findings exist, state that explicitly rather than retaining sample entries.

#### Bank-wide observations

<Semantic duplicate pairs and rationale, distinct replacement proposals,
answer-position distribution, objective coverage and difficulty caveats.
Distinguish full-bank findings from targeted comparisons and cross-exam
comparisons.>

#### Evidence ledger

| Source URL / section | Retrieved | Supported claims / question IDs | Access, relevance, version caveats |
| --- | --- | --- | --- |
| <actual inspected source> | <date> | <claim paraphrases and IDs> | <details> |

#### Unverified items and review limits

<List unavailable sources, conflicting documentation, unchecked fields or
records, and any omitted checks. Never infer success from absent findings.>

## Review limits

This is a documentation-grounded AI review, not Microsoft endorsement or a
guarantee of live-exam coverage. Code examples were not executed and Azure/model
services were not invoked. Human approval is required for substantive changes.

Question and application files were not edited during this review.
