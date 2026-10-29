# Project: UW Allen School CSE Prerequisite Map — Phase 1 prototype

I'm a UW Computer Engineering student and Allen School Peer Adviser. I'm building an interactive, accessible website that shows prerequisite relationships between CSE courses. It is an advising aid, not a degree audit. You are helping me build the **Phase 1 prototype only**: 22 courses, a course-focused graph view, and a detail panel. I have a fresh Vite + React + TypeScript project in the current directory.

Work in small steps. **Do only one step at a time, then stop and wait for me to review before continuing.** Explain what you changed and why; I want to understand and maintain this code myself.

## Decisions already made (do not change without asking)

- Vite + React + TypeScript, static site, **no backend, no database, no accounts**.
- Graph rendering: React Flow (`@xyflow/react`). Layout: `elkjs` with the `layered` algorithm, direction left-to-right.
- Course data: one YAML file per course in `data/courses/` (e.g. `CSE451.yaml`), plus `data/external.yaml` for non-CSE and retired courses. A Node build script validates the YAML with **Zod** and emits `src/generated/courses.json`.
- Tests: Vitest.
- All colors defined as named tokens in one file, `src/theme.ts`.
- The site's base URL comes from one setting (Vite `base`, read from an env variable), because the repo will move to an Allen School account later. Use only relative asset paths. No secrets or API keys anywhere.
- Branding: may use UW/Allen School branding; footer says "Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and MyPlan."

## Critical data rules

1. **Never write prerequisites from your own knowledge.** Use only the catalog text I provide below. If something is ambiguous, ask me; do not guess.
2. Copy each catalog sentence **verbatim** into `prereqText`. Build the structured `prereq` logic only from that text.
3. "Recommended" items go in `recommended`, never in `prereq`. "Must be taken with" goes in `coreq`.
4. Retired courses (CSE 142, 303, 326) and non-CSE courses go in `data/external.yaml` as stubs with `status` and a catalog URL, so references resolve.
5. Every course gets `sources: [{ url: "https://www.washington.edu/students/crscat/cse.html", retrieved: "2026-10-22" }]` and `verified: { date: "2026-10-22", by: "peer-adviser", method: "catalog" }`.

## Schema

```ts
type Req =
  | { all: Req[] }                                   // AND
  | { any: Req[] }                                   // OR
  | { course: string; minGrade?: number; timing?: "before" | "concurrent-ok" }
  | { other: string };                               // e.g. "Guided Self-Placement"

interface Course {
  id: string;               // "CSE 451"
  title: string;
  credits: string;          // "4", "1/2, max. 8"
  summary?: string;         // leave empty for now
  prereq: Req | null;
  prereqText: string;       // verbatim catalog sentence(s); "" if none
  recommended?: Req;
  coreq?: Req;
  jointWith?: string[];     // e.g. ["E E 469"]
  audience: "majors" | "open" | "nonmajor" | "unknown";
  status: "active" | "retired";
  sources: { url: string; retrieved: string }[];
  verified: { date: string; by: string; method: "catalog" | "adviser-confirmed" };
  conflicts?: string[];
  notes?: string;
}
```

## The 22 courses (UW Course Catalog, retrieved 2026-10-22)

| ID | Title | Credits | Catalog prerequisite text (verbatim) | Audience |
|---|---|---|---|---|
| CSE 121 | Introduction to Computer Programming I | 4 | Recommended: completion of Paul G. Allen School's Guided Self-Placement. | open |
| CSE 122 | Introduction to Computer Programming II | 4 | Recommended: CSE 121 or completion of Paul G. Allen School's Guided Self-Placement. | open |
| CSE 123 | Introduction to Computer Programming III | 4 | Recommended: CSE 122 or completion of Paul G. Allen School's Guided Self-Placement. | open |
| CSE 143 | Computer Programming II | 5 | Prerequisite: CSE 142. | open |
| CSE 197 | Problem Solving for Computer Science and Engineering | 1/2, max. 8 | Must be taken with CSE 121, CSE 122, or CSE 123. | unknown (Allen Scholars / STARS) |
| CSE 311 | Foundations of Computing I | 4 | Prerequisite: a minimum grade of 2.0 in either CSE 123 or CSE 143; and a minimum grade of 2.0 in MATH 126 or MATH 135. | majors |
| CSE 312 | Foundations of Computing II | 4 | Prerequisite: CSE 311. | majors |
| CSE 331 | Software Design and Implementation | 4 | Prerequisite: a minimum grade of 2.0 in either CSE 123 or CSE 143. | unknown |
| CSE 332 | Data Structures and Parallelism | 4 | Prerequisite: CSE 311. | majors |
| CSE 333 | Systems Programming | 4 | Prerequisite: CSE 351. | majors |
| CSE 351 | The Hardware/Software Interface | 4 | Prerequisite: CSE 123 or CSE 143. | majors |
| CSE 369 | Introduction to Digital Design | 3 | Prerequisite: CSE 311. | unknown |
| CSE 371 | Design of Digital Circuits and Systems | 5 | Prerequisite: either E E 205 or E E 215; either E E 271 or CSE 369. Offered: jointly with E E 371. | unknown |
| CSE 373 | Data Structures and Algorithms | 4 | Prerequisite: CSE 123 or CSE 143. | nonmajor |
| CSE 414 | Introduction to Database Systems | 4 | Prerequisite: a minimum grade of 2.5 in either CSE 123, CSE 143, or CSE 163. | nonmajor |
| CSE 421 | Introduction to Algorithms | 3 | Prerequisite: CSE 312; CSE 332. | majors |
| CSE 446 | Machine Learning | 4 | Prerequisite: CSE 332; MATH 208 or MATH 136; and either STAT 390, STAT 391, or CSE 312. | majors |
| CSE 447 | Natural Language Processing | 4 | Prerequisite: CSE 312 and CSE 332; recommended: MATH 208; and CSE 446 is recommended before or concurrently. | unknown |
| CSE 451 | Introduction to Operating Systems | 4 | Prerequisite: CSE 332; CSE 333; and CSE 351. | majors |
| CSE 461 | Introduction to Computer-Communication Networks | 4 | Prerequisite: either CSE 326 or CSE 332; either CSE 303 or CSE 333. | majors |
| CSE 469 | Computer Architecture I | 5 | Prerequisite: either E E 271 or CSE 369; and either CSE 123 or CSE 143. Offered: jointly with E E 469. | unknown |
| CSE 474 | Introduction to Embedded Systems | 4 | Prerequisite: CSE 123 or CSE 143 Offered: jointly with E E 474; AWSpS. | unknown |

Notes:
- "Offered: ..." is not a prerequisite. Strip it from the logic but keep it in `prereqText` exactly as shown.
- CSE 461 names retired courses CSE 326 and CSE 303; keep them as OR alternatives that point to retired stubs.
- Add these conflicts (the Allen School Course Lists page shows different prerequisites):
  - CSE 461: "Allen School CE Systems Electives list shows 'CSE 332, CSE 333' (retrieved 2026-10-22)."
  - CSE 469: "Allen School CE Systems Electives list shows 'CSE 369, CSE 143' (retrieved 2026-10-22)."
  - CSE 474: "Allen School CE Systems Electives list shows 'CSE 333, CSE 352' (retrieved 2026-10-22)."
- External stubs needed: CSE 142 (retired), CSE 163, CSE 303 (retired), CSE 326 (retired), MATH 126, MATH 135, MATH 136, MATH 208, STAT 390, STAT 391, E E 205, E E 215, E E 271.

## Build steps (stop after each one)

1. **Project setup.** Add dependencies, folder structure, `src/theme.ts` with color tokens, the configurable base path, Vitest, and an npm script `npm run data` that will run the data build. Show me the folder tree.
2. **Schema + validator.** Zod schema matching the types above. The validator checks: schema validity; every referenced course exists in `courses/` or `external.yaml`; no prerequisite cycles (co-requisites excluded); warns when an active course references a retired course. Make it fail with a clear message naming the file and field.
3. **Encode the 22 courses + external stubs** in YAML from the table above. Then show me a summary table: course, your structured `prereq` in plain words, and the verbatim text side by side, so I can check each one.
4. **Logic + tests.** Functions: `satisfied(req, completed, current)` returning `"eligible" | "not-yet" | "check-with-adviser"` (an `other` leaf or a min-grade with unknown grade → check-with-adviser), `ancestors(courseId)`, `descendants(courseId)` (marking when the course is only one option in an OR group). Write Vitest tests for every pattern: AND (451), nested OR (469), min grade (311, 414), co-requisite (197), concurrent-ok recommendation (447), retired alternatives (461).
5. **Focus view.** Search box (by number or title) → selected course in the center, all ancestors to the left, direct descendants to the right, laid out with elkjs. OR groups render as a small "one of" junction node with dashed edges; required edges are solid; recommended edges dotted and hidden by default. Non-CSE courses render as grey outlined nodes. URL holds the selected course (`?course=CSE451`), and browser Back works.
6. **Detail panel.** Number, title, credits, audience badge, prerequisites rendered in plain words (e.g. "One of: E E 271 or CSE 369 — and one of: CSE 123 or CSE 143"), minimum grades inline, co-requisites and recommended in a separate section, collapsible "Official wording" with `prereqText`, "Unlocks" list, catalog link, verified date, any conflicts, and the footer disclaimer.
7. **List view + accessibility pass.** A list view that shows the same information as nested lists with real headings. Then check and fix everything in the accessibility requirements below.

## Accessibility requirements (WCAG 2.1 AA)

- Text contrast ≥ 4.5:1; large text ≥ 3:1; node borders, edges, arrowheads, and focus rings ≥ 3:1. UW purple is fine for text; UW gold is decoration only on white. Tell me the contrast ratio of every token in `theme.ts`.
- Never use color alone: line style (solid / dashed / dotted) and text labels carry meaning.
- Every node is a focusable button with an accessible name, e.g. "CSE 451, Introduction to Operating Systems. Requires CSE 332, CSE 333, and CSE 351. Unlocks 2 courses."
- OR groups are announced as "one of".
- A polite live region announces when the focused course changes.
- Full keyboard use: Tab, arrow keys between connected nodes, Enter opens details, Escape closes, "/" focuses search; focus is always visible; the panel returns focus when closed.
- "Skip to course list" link first; works at 200% zoom and 375 px width; respects `prefers-reduced-motion`.

## Out of scope for now

Full curriculum map, degree lens (CS / CS: Data Science / CE), "what can I take next" tracker, special topics courses, offering schedules, analytics, hosting/deployment beyond a local build.

**Start with Step 1 only.**