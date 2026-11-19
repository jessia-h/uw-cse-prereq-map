# Maintaining the CSE Prerequisite Map

This is the runbook a Peer Adviser follows to keep the map correct. You do not need to know React to do routine updates: almost every change is an edit to one small YAML file.

> Sections marked **(Planned)** describe tooling that is not built yet. Follow the manual version until it exists.

---

## 1. Roles

| Role | Who | Does |
| --- | --- | --- |
| Data maintainer | A current Peer Adviser (rotates yearly) | Runs the checklists below, edits data, opens pull requests |
| Data reviewer | A named Allen School academic adviser | Approves changes to degree rules, anything marked as a conflict, and special topics |
| Code maintainer | Optional; a Peer Adviser comfortable with React | Fixes bugs, upgrades dependencies. Not needed for routine updates |
| Staff owner | An Allen School staff member | Holds repository and hosting admin access so the project survives graduations |

## 2. Which source is the authority

| Fact | Authoritative source | Cross-check against |
| --- | --- | --- |
| Prerequisites for regular courses | [UW Course Catalog: CSE](https://www.washington.edu/students/crscat/cse.html) | Course website; Allen School Course Lists |
| Prerequisites for special topics sections (CSE 390, 490, 492, 493) | [Allen School Course Lists, Special Topics section](https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/#special) for that quarter | UW Time Schedule section notes; course website; instructor |
| Whether a course or section is offered | UW Time Schedule, linked from [Allen School Time Schedules](https://www.cs.washington.edu/academics/time-schedules/) | Allen School teaching schedule (tentative) |
| Degree requirements (CS, CS: Data Science, CE) | UW General Catalog program pages | Allen School degree pages; adviser |
| Core, elective, CE systems elective, capstone lists | [Allen School Course Lists](https://www.cs.washington.edu/academics/undergraduate/degree-requirements/courses/) | Adviser |
| Majors-only status | [Allen School Non-Major Options](https://www.cs.washington.edu/academics/undergraduate/non-major-options/) | Adviser |

**When two sources disagree,** never pick one silently. Record both in the course's `conflicts` field, keep the catalog version in `prereq`, and send the difference to the data reviewer.

## 3. Cadence

| When | Task | Time |
| --- | --- | --- |
| Week 1 of each quarter | [Quarterly checklist](#6-quarterly-checklist-week-1-of-each-quarter) | 1–2 h |
| When next quarter's special topics are posted, and again in week 1 | [Special topics cross-check](#5-special-topics-courses-cse-390-490-492-493) | 1–2 h |
| Each summer, before Autumn | [Annual review](#7-annual-review-each-summer-before-autumn) | 4–6 h |
| Within a week of any error report | Fix it using [Making a data change](#4-making-a-data-change) | varies |
| Weekly, automatic **(Planned)** | Drift check compares stored catalog text with the live catalog and opens an issue if anything changed | 0 |

---

## 4. Making a data change

No local setup is needed for small edits: you can edit YAML in the GitHub web editor. For larger changes, run the project locally (see the README).

1. **Find the file.** Each course is `data/courses/CSE451.yaml`. Non-CSE courses, retired courses, and CSE courses not yet added to the map are stubs in `data/external.yaml`.
2. **Copy the official wording first.** Paste the catalog sentence exactly, character for character, into `prereqText`.
3. **Update the logic** in `prereq` to match that wording. Copy the closest existing course as a pattern:
   - AND: `CSE451.yaml`
   - Nested OR: `CSE469.yaml`
   - Minimum grades: `CSE311.yaml`, `CSE414.yaml`
   - Co-requisite: `CSE197.yaml`
   - Recommended, including "before or concurrently": `CSE447.yaml`
   - Retired alternatives: `CSE461.yaml`
4. **Update the evidence:** refresh the `sources` URL and set `verified` to today's date, `by: peer-adviser` (Git history records who made the change), and `method: catalog` (or `adviser-confirmed`).
5. **If sources disagree,** add a line to `conflicts` naming both sources and the date.
6. **Check it locally** (if running locally):
   ```bash
   npm run data       # validates all YAML (errors name the file and field), then lays out the map
   npm test           # all tests
   npm run typecheck
   npm run lint
   ```
   Some tests encode the real course data on purpose. If you changed a course's prerequisites, a test may fail. Read the failure, confirm the new behavior is correct per the catalog, then update that test.
7. **Open a pull request** with a title like "CSE 461: update prerequisites (catalog, Autumn 2027)" and paste the source link in the description.
8. **Look at it in the browser.** Run `npm run dev`, select the course, and check the map, "Just this course", and List. Does the panel's "To take … you need" sentence say the same thing as the catalog?
9. **Get approval.** Routine catalog-text updates: another Peer Adviser may approve. Degree rules, conflicts, and special topics: the data reviewer approves.
10. **Merge,** and add one line to `CHANGELOG.md`.
11. **Update the WordPress page.** The copy on the WordPress page doesn't update itself. Run `npm run build:wordpress`, open `dist-wordpress/wordpress-block.html`, copy all of it, and replace the old block in the page's **Code** tab (classic editor). Don't switch to the Visual tab afterwards: it can strip the script and the empty map container. Pasting a `<script>` needs the `unfiltered_html` capability (Administrators on a single site; only Super Admins on a multisite). Without it, WordPress silently removes the script.

### Rules that keep the data trustworthy

- Never change `prereq` without also updating `prereqText`, `sources`, and `verified`.
- Never delete a retired course. Set `status: retired`. Retired courses are hidden from the interface but still count in eligibility logic, so students who took them are treated correctly.
- If an active course's only prerequisite is retired (like CSE 143), it needs a note explaining this. The note is not in the YAML: it is an entry in `RETIRED_PREREQ_NOTE` in `src/lib/describe.ts` (ask the code maintainer if you're unsure), plus a question in `docs/adviser-questions.md`. A test in `src/lib/focusGraph.test.ts` fails if the note is missing.
- Never encode a prerequisite from memory, a syllabus, a rumor, or an old flowchart. If no official source says it, it does not go in.
- Interpretation questions go in `docs/adviser-questions.md`, not into the data as guesses.

### Adding a new course

1. Create `data/courses/CSE###.yaml` (file name must match the `id`, without the space).
2. Fill every required field; `npm run data` lists anything missing.
3. Any course it references must exist in `data/courses/` or `data/external.yaml`.
4. Set `audience` to `unknown` unless the Non-Major Options page or an adviser confirms it.

### Updating degree programs and course lists

The degree lens ("Show my degree") reads two kinds of files. Like course files, they hold only what an official source says.

- **`data/programs/cs.yaml`, `ds.yaml`, `ce.yaml`:** one file per degree, from the UW General Catalog program page. Each has `groups`:
  - `role: required` (must take; a choice like "CSE 123 or CSE 143" is written `any: [CSE 123, CSE 143]`), `role: choose` (counts toward a specific group, such as CE's "1 of 4 required"), or `role: elective` (Core or Elective).
  - `badge` is the text on the card. A group lists its `courses` directly or points at a `list` from `lists.yaml`; `exclude` removes courses that don't count there (CSE 331 isn't Core for CS).
  - Rules the map doesn't check (credit totals, "at least four 400-level") go in `note`, shown in the panel.
  - `ds.yaml` has `extends: cs`: it gets every CS group first, then its own.
  - When a course is in two groups of the same strength, the card shows the first one in the file.
- **`data/lists.yaml`:** the CSE Core, CE Systems Electives and CSE Electives lists (Allen School Course Lists page), lists that aren't available yet (`status: pending`, kept empty), and per-course `exceptions` from the Non-Major Options page (CSE 373, 374, 414). Courses a list names that disagree with the catalog go in that list's `conflicts`.
- **The CSE Electives list is a rule:** any Core course, any graded 400-level CSE course whose audience is not `nonmajor`, and CSE 480. When you add a 400-level course, add it to `electives` in `lists.yaml` if it qualifies; a test fails if you forget.
- `npm run data` validates these files too. A course they name that isn't in `data/courses/` or `data/external.yaml` is a **warning** (lists name many courses the map doesn't have yet); a missing list, a duplicate, or a schema mistake is an error.
- Interpretation questions (what a list includes, how to word a role) go in `docs/adviser-questions.md`.

### Retiring a course

1. Set `status: retired` in its file (or move it to `data/external.yaml` as a retired stub).
2. Run `npm run data`. Warnings list every course that still references it; that is expected when the catalog still names it.
3. Check whether any active course now has only retired prerequisites and needs a note (see `RETIRED_PREREQ_NOTE` above); `npm test` fails if one is missing.

---

## 5. Special topics courses (CSE 390, 490, 492, 493) **(Planned)**

Special topics are not in the prototype yet. When they are added, follow this procedure.

**Why they are tricky:** the catalog lists no prerequisites for these numbers. Each section's prerequisites appear only on the Allen School Course Lists page, change every quarter, and may say "TBA", "e.g.", "or equivalent", or "pre/co-requisite".

**Storage:** one file per quarter, `data/special-topics/<year>-<quarter>.yaml`, with an `expires` date (the last day of that quarter, from the UW academic calendar), a `confidence` field (`confirmed`, `partial`, or `tba`), and a `crossChecked` list of the sources you compared.

**Display rules:**
- `tba` or `partial`: show "Prerequisites not yet confirmed. Check with the instructor or an adviser." and draw no lines.
- "e.g." or "or equivalent" wording: encode the named courses as a "choose one" group, mark `partial`, and always show the verbatim text.
- Special topics lines are visually distinct and labelled with the quarter.

**Cross-check, each quarter:**
- [ ] Copy every undergraduate 390/490/492/493 section from the Special Topics section into a new quarter file.
- [ ] Confirm each section exists in the UW Time Schedule; note any restriction text.
- [ ] Compare with the course website, if posted.
- [ ] All sources agree: `confirmed`. Any disagreement or TBA: `partial` or `tba`, record it in `conflicts`, and ask the data reviewer.
- [ ] Re-check in week 1 of the quarter; TBA sections often fill in late.
- [ ] Never delete past quarter files; the `expires` date hides them.

---

## 6. Quarterly checklist (week 1 of each quarter)

- [ ] Compare a sample of courses' `prereqText` with the live catalog (until the drift check exists, check every course touched in the last year plus five random ones).
- [ ] Run the special topics cross-check (once special topics are in the map).
- [ ] Check the Allen School Course Lists page for added or removed Core, CE Systems Elective, or Capstone courses.
- [ ] Check the Non-Major Options page for changes to majors-only courses.
- [ ] Look for new course numbers in the catalog and add them.
- [ ] Review error reports and reply where possible.
- [ ] Merge dependency updates only if all checks pass (or leave them for the code maintainer).
- [ ] Note what you did in `CHANGELOG.md`.

## 7. Annual review (each summer, before Autumn)

- [ ] Compare the UW General Catalog pages for CS, CS: Data Science, and CE with `data/programs/*.yaml`, line by line, and get adviser approval for changes. Update each file's `sources` (retrieved date) and `verified`.
- [ ] Compare the Allen School Course Lists and Non-Major Options pages with `data/lists.yaml`: Core, CE Systems Electives, Electives, exceptions. Fill in any `pending` list that has become available (Capstone, Data Science electives) and change its `status` to `current`.
- [ ] Run `npm run data` and read the "not in the course data yet" warnings: they list courses to add in the next batches.
- [ ] Re-verify every course: `prereqText` matches the catalog; refresh `verified.date`.
- [ ] Re-check every open `conflicts` entry with the data reviewer.
- [ ] Mark courses no longer in the catalog as `status: retired`.
- [ ] Re-run the logic tests with the data reviewer and add tests for any rules that changed.
- [ ] Run the full [accessibility check](#8-accessibility-check-before-every-release).
- [ ] Review the disclaimer (site footer and course panel) and the prototype notice.
- [ ] Confirm next year's maintainer and data reviewer, and give them repository access.

---

## 8. Accessibility check (before every release)

Target: WCAG 2.1 AA. The List view must let a screen-reader user answer every question the map answers.

### Color contrast

| What | Minimum |
| --- | --- |
| Normal text | 4.5:1 against its background |
| Large text (≥ 24 px, or ≥ 18.7 px bold) | 3:1 |
| Lines, arrows, card borders that carry meaning, focus ring | 3:1 against adjacent colors |
| Faded (not-selected) courses | Text may be muted but must still meet 4.5:1; fade fills and lines more than text |

- All colors live in `src/theme.ts`. Add any new color there, and add it to `src/theme.test.ts` so the contrast check runs automatically.
- UW purple is safe for text and lines. UW gold fails on white and is decoration only.
- Never carry meaning by color alone: line style, text labels, and tags carry it.

### Automated

- [ ] `npm test` passes (includes contrast checks and axe checks on every view).
- [ ] `npm run typecheck` and `npm run lint` pass.

### Manual: mouse and keyboard (do not skip; automated tests have missed real bugs)

- [ ] Click a course on the map with a real mouse: the panel opens.
- [ ] First Tab reaches "Skip to course list".
- [ ] "/" focuses search; Enter selects the first result.
- [ ] Arrow keys move between connected courses on the map; focus ring always visible.
- [ ] Escape closes the panel and returns focus to the course.
- [ ] "How to read this map": Escape closes only the dialog.
- [ ] Embedded: run `npm run build`, then `python3 -m http.server 8000` from the repository root, and open `http://localhost:8000/docs/embed-test.html`. Scrolling over the map scrolls the page (and shows "Use Ctrl + scroll to zoom"); Ctrl/Cmd + scroll, a pinch, and the +/− buttons zoom; dragging pans. Tab goes from "Skip the interactive map" into the map, through it, and out to "View the course list as text"; Shift+Tab goes back.
- [ ] A cut-off course title shows in full on hover and on keyboard focus, stays while the pointer is on it, and Escape hides it (WCAG 1.4.13).
- [ ] "Show my degree": switching degrees changes badges only; no course moves. A Tab and arrow keys still reach every visible course.
- [ ] Filters: hiding a level or non-CSE courses updates "Showing N of M courses"; selecting a course brings back hidden courses on its path, marked "Shown because it's on this course's path".

### Manual: VoiceOver (Safari, macOS; Cmd+F5 to toggle)

- [ ] Answer "What do I need before CSE 332?" by listening only.
- [ ] Courses are read with their requirements, including minimum grades and "choose one" groups.
- [ ] Selection changes are announced.
- [ ] Nothing sounds confusing, overly long, or has odd punctuation.

### Manual: settings

- [ ] 200% browser zoom: everything reachable, no sideways scroll.
- [ ] Reduce motion on: selecting a course jumps without animating.
- [ ] Window narrower than 640 px: List view opens by default.
- [ ] Windows High Contrast mode (on a Windows machine, when possible): lines, cards, and focus stay visible.

---

## 9. Handoff and moving the repository

### While the repository lives in a personal account

- Add the supervisor or staff owner as a collaborator.
- Keep the base path configurable (`BASE_PATH`, see `.env.example`); use only relative asset paths.
- No secrets, API keys, or paid services.
- Keep all decisions and docs in the repository.

### Moving it to an Allen School account

- [ ] Use GitHub's "Transfer repository" (keeps history, issues, and pull requests), or import into the Allen School GitLab.
- [ ] Update base path and deployment settings for the new host; confirm `npm run build` output works there.
- [ ] Update links in the README and the site footer (and the error-report link, once one exists).
- [ ] Add a notice or redirect at the old URL if it was shared.

### Handing off to the next Peer Adviser

- [ ] They make one data change using only this document while you watch without helping.
- [ ] Anything they got stuck on is added to this document the same day.
- [ ] Repository admin and hosting access go to the staff owner and the new maintainer; remove your own admin rights afterwards.
- [ ] Record a 10-minute walkthrough video and link it from the README.
- [ ] Write a one-paragraph handoff note: open conflicts, pending adviser questions, known bugs.
