# Proposal: degree lens and decluttering

Status: **approved and built (Stage 2).** Screenshots of the result are in [screenshots/after-lens/](screenshots/after-lens/).

Decisions made at approval, which override the proposal below where they differ:

- **CSE Electives list:** any Core course, any graded 400-level CSE course whose audience is not nonmajor, and CSE 480. Badges are "Core" or "Elective" (same teal), replacing "Core / elective".
- **Non-Major Options exceptions:**
  - CSE 373 doesn't count.
  - CSE 374 is a free elective only (no badge).
  - CSE 414 gets a neutral "Check with adviser" badge and a panel note.
  - None of the three is faded.
- **Never faded or hidden by "not used":** courses that lead to a required course, and non-CSE courses without a role. Non-CSE courses that have a role (E E 205/215, SOC 225, STAT 391) keep their badge.
- **New courses:** CSE 442, 444, 480 and 484, from the catalog; SOC 225 as a stub.
- **Programs:** DS extends CS unchanged; ties show the first group in the file; colors approved; titles cut to one line.
- **Simplify:** only the 9 groups of just CSE 123 and 143.
- **Level bands:** with 88 px gaps.
- **Filters:** a "Some prerequisites hidden" tag when filters hide a prerequisite. No 200-level checkbox; non-CSE courses follow "Hide non-CSE courses".
- **Pending:** Capstone and Data Science electives stay pending (adviser questions 4 and 5).

Screenshots of the current map (1440×900, 32 courses) are in [screenshots/before-lens/](screenshots/before-lens/):

| File | What it shows |
| --- | --- |
| `full-map.png` | Whole map, opening view |
| `full-map-fit.png` | Whole map zoomed out with the "fit view" button, showing the whole picture |
| `full-map-cse311.png` | Whole map with CSE 311 selected |
| `focus-cse474.png` | Just this course, CSE 474 |
| `list-cse474.png` | List view, CSE 474 |

Stage 2 will save the same views in `screenshots/after-lens/`, plus each degree.

## What the screenshots show

- **CSE 123 and 143 dominate the map.** In `full-map-fit.png`, a fan of dashed lines leaves both cards. They account for 26 of the 93 lines on the map.
- **Levels are mixed.** elk places each course by its longest chain of prerequisites, not by its number, so CSE 154 (100-level) sits to the right of 300-level courses, and CSE 163 sits among them.
- **Cards are uneven.** Most are 184×72, but CSE 143 and CSE 197 are taller, and titles wrap to two lines.
- **Nothing says how a course fits a degree.** That's the main question students bring to advising.

---

# Part A: Degree lens

## A1. The control

```
 Show my degree:  [ All | CS | CS: Data Science | CE ]
 Degree roles are a guide. Confirm your requirements in MyPlan's degree audit.
```

- **Placement:** a segmented control in the bar above the map, next to the legend. It's built the same way as the view switch: a `role="group"` of buttons with `aria-pressed`.
- **URL:** stored as `&degree=cs|ds|ce`; "All" removes the parameter. Back and Forward work as they do for courses and views.
- **Every view:** it applies to the whole map, "Just this course", and List.
- **The guidance line** sits directly under the control, in muted text, and is always visible.
- **Positions don't change** when the degree changes, only styles.

## A2. Roles

A course's role in a degree is the strongest that applies: **Required > Choose from a list > Counts as elective > Not used**.

| Role | On the card | Accessible name adds |
| --- | --- | --- |
| Required | Blue stripe on the left edge + badge "Required" | "Required for Computer Engineering." |
| Choose from a list | Orange stripe + the group's own badge text, e.g. "1 of 4 required", "CE systems elective", "Data Science requirement" | "1 of 4 required for Computer Engineering." |
| Counts as elective | Teal stripe + badge "Core / elective" | "Core / elective for Computer Engineering." |
| Not used | No stripe, no badge; title muted (still at least 4.5:1) | "Not used in Computer Engineering's CSE requirements." |

**"All" mode:** no stripes or fills. Each card gets small grey text tags **CS**, **DS**, **CE** for the degrees where it is Required. For example, CSE 311 shows "CS DS CE", and CSE 369 shows "CE". The accessible name adds "Required for CS, Data Science, and CE."

**Two groups at the same strength.** On the CE card, CSE 474 and CSE 403 are both in "1 of 4 required" and on the CE Systems Electives list. The badge shows the first group as listed in `ce.yaml`, which puts "1 of 4 required" before the systems electives. The panel lists every group the course belongs to. See question 4.

### What each course would show (computed from the lists in your brief)

"—" means Not used. Courses missing from the data are not shown.

| Course | CS | CS: Data Science | CE |
|---|---|---|---|
| CSE 121, 122, 154, 160, 163, 197, 373, 374, 391, 414 | — | — | — |
| CSE 123, 143 | Required | Required | Required |
| CSE 311, 312, 332, 351 | Required | Required | Required |
| CSE 331 | Required | Required | Core / elective |
| CSE 333, 340, 341, 344, 447 | Core / elective | Core / elective | Core / elective |
| CSE 369, 371 | Core / elective | Core / elective | Required |
| CSE 401, 451, 461, 469 | Core / elective | Core / elective | CE systems elective |
| CSE 403, 474 | Core / elective | Core / elective | 1 of 4 required (also CE systems elective) |
| CSE 421, 446 | Core / elective | Required | Core / elective |
| E E 205, E E 215 | — | — | Required |
| STAT 391 | Core / elective | Core / elective | Core / elective |
| E E 271, MATH 126, 135, 136, 208, STAT 390 | — | — | — |

Your five test cases come out as specified: CSE 331, 369, 446, 474 and 373.

**This table raises the biggest open issue.** Seventeen of 41 cards read "Not used" in every degree, including:
- CSE 121 and 122, which lead to the required CSE 123;
- MATH 126 and 135, which CSE 311 requires;
- CSE 373, 374, 391 and 414, which might count as CSE electives. Your brief mentions a "CSE Electives list" for CS, but doesn't give it.

Fading those cards, or hiding them with the "not used" filter, could tell a student that an intro course or a math prerequisite doesn't matter. See questions 1 and 2.

## A3. Data files

There are four new files, validated with Zod in `npm run data`, the same way as course files: strict objects, and errors that name the file and field.

```yaml
# data/programs/ce.yaml
id: ce
name: Computer Engineering
sources:
  - url: "https://www.washington.edu/students/gencat/program/S/ComputerScienceandEngineering-406.html"
    retrieved: "2026-10-22"
verified: { date: "2026-10-22", by: peer-adviser, method: catalog }
groups:
  - id: ce-required
    role: required
    badge: Required
    minGrade: 2.0
    courses:            # each entry is one course, or a choice ("CSE 123 or CSE 143")
      - any: [CSE 123, CSE 143]
      - CSE 311
      - CSE 312
      - CSE 332
      - CSE 351
      - CSE 369
      - CSE 371
      - any: [E E 215, E E 205]
  - id: ce-one-of-four
    role: choose
    badge: "1 of 4 required"
    pick: 1
    courses: [CSE 403, CSE 474, CSE 480, CSE 484]
  - id: ce-systems
    role: choose
    badge: CE systems elective
    pick: 3
    list: ce-systems          # a list from data/lists.yaml
  - id: ce-core
    role: elective
    badge: Core / elective
    pick: 2
    list: core
    exclude: [CSE 369, CSE 371]   # required for CE, so they don't count as Core
  - id: ce-capstone
    role: choose
    badge: Capstone
    pick: 1
    list: capstone            # pending: empty
```

- **`cs.yaml`:**
  - Required: CSE 123 or 143, then 311, 312, 331, 332, 351, each with a minimum of 2.0.
  - Core: six courses, at least four of them 400-level, with CSE 331 excluded.
  - "One more Core course or one Capstone course."
  - Electives from the CSE Electives list (question 1).
- **`ds.yaml`:**
  - Everything in CS, written as `extends: cs` so the CS groups aren't copied by hand.
  - Plus a required group: CSE 421, 442, 444, 446, and SOC 225.
  - Plus a "Data Science requirement" group with `list: ds-electives`, `status: pending`, and no courses.
- **`data/lists.yaml`:** the Core list (40 courses), the CE Systems Electives list (15 courses), Capstone (`status: pending`, empty), and DS electives (`status: pending`, empty). Each has its own `sources` and `verified`. CSE 466, 467 and 471 go under `conflicts`, as you asked:

  ```yaml
  conflicts:
    - "Allen School Course Lists page also names CSE 466, 467 and 471 as CE Systems Electives; they are not in the current UW Course Catalog (retrieved 2026-10-22)."
  ```

- **Rules like "at least four 400-level" and "33 credits"** are stored as plain text (`note:`) and shown in the panel. The map doesn't count credits or check progress, because it isn't a degree audit.
- **Validation:**
  - A course in a program or list that isn't in the data produces a **warning that names it, not an error**, as you asked for list members. I'd treat program members the same way (question 3).
  - Duplicate courses and unknown list ids are errors.

**Courses in your brief that aren't in the data yet**, which `npm run data` will report:

| Where | Not in the data |
| --- | --- |
| CS/DS/CE required | (none) |
| DS required | CSE 442, CSE 444, SOC 225 (your brief says to add SOC 225 as a stub) |
| CE "1 of 4" | CSE 480, CSE 484 |
| CSE Core list (40) | 23 courses: CSE 402, 422, 426, 427, 431, 434, 438, 440, 442, 443, 444, 452, 453, 455, 457, 458, 462, 470, 473, 478, 484, 486, 493 |
| CE Systems Electives (15) | 9 courses: CSE 402, 444, 452, 453, 470, 478, 484, E E 476, E E 477 |

## A4. How it looks, and color accessibility

```
 ┌▌──────────────────────────────┐   ┌▌──────────────────────────────┐   ┌───────────────────────────────┐
 │▌ CSE 474          400-level   │   │▌ CSE 332          300-level   │   │  CSE 373          300-level   │
 │▌ Introduction to Embedded S…  │   │▌ Data Structures and Paralle… │   │  Data Structures and Algori…  │  ← muted title
 │▌ [1 of 4 required]            │   │▌ [Required]                   │   │                               │
 └▌──────────────────────────────┘   └▌──────────────────────────────┘   └───────────────────────────────┘
   orange stripe                        blue stripe                         Not used: no stripe
```

- **How role and selection stay apart.** The role is a 6 px stripe on the left plus the badge. Selection stays what it is now: a purple fill for the selected course, a purple border for the path, and purple lines. Because they use different parts of the card, a card can show both.
- **Proposed tokens.** All meaningful colors are at least 3:1 against white, and all text is at least 4.5:1. Each will be added to `theme.test.ts`.

  | Token | Value | Contrast | Used for |
  | --- | --- | --- | --- |
  | `roleRequired` | `#005a9c` (blue) | 7.14:1 on white; badge text 6.18:1 on its tint | stripe, badge text |
  | `roleChoose` | `#b04a00` (orange) | 5.49:1; badge 4.82:1 | stripe, badge text |
  | `roleElective` | `#00756a` (teal) | 5.60:1; badge 4.85:1 | stripe, badge text |
  | `roleRequiredTint` / `roleChooseTint` / `roleElectiveTint` | `#e6f0f8` / `#fbeee4` / `#e3f2ef` | (badge backgrounds) | badge fill |

- **Color-blind check.** I measured the color difference between each pair (CIE ΔE; above about 20 reads as clearly different) in normal vision and in simulated deuteranopia and protanopia, using the Machado 2009 simulation at full severity:

  | Pair | Normal | Deuteranopia | Protanopia |
  | --- | --- | --- | --- |
  | Required / Choose | 103 | 100 | 86 |
  | Required / Elective | 53 | 42 | 42 |
  | Choose / Elective | 89 | 59 | 44 |
  | **Required (blue) / selection (UW purple)** | 32 | **9** | **14** |

  The three role colors stay clearly distinct. **But for deuteranopia and protanopia, the Required blue and UW purple look nearly the same.** That's why role and selection use different parts of the card (stripe and badge, versus fill and border). The badge text always says the role, and the selected course is also announced and marked with `aria-current`. I tried other palettes. Any role blue lands near purple, and red and green can't be told apart with deuteranopia, so this was the best trade-off. See question 7.
- **Forced colors:** stripes become system-color borders, and the badges keep their text and outlines.
- **Faded cards:** "Not used" cards look like the existing faded style, with a quiet border and muted title. When a course is also selected, its path is shown at full strength even if the path includes "Not used" courses.

## A5. Panel, List view, legend

- **Panel:** a new "In your degree" section after Prerequisites lists all three degrees. The chosen degree comes first and in bold. Each line gives the strongest role, then any other groups:
  > **Computer Engineering: 1 of 4 required** (CSE 403, 474, 480, 484). Also a CE systems elective (3 needed).
  > CS: Core / elective. CS: Data Science: Core / elective.

  It ends with the guidance line and links to the program pages.
- **List view:**
  - Every course link gets the role as text, e.g. "CSE 474, Introduction to Embedded Systems — 1 of 4 required (CE)".
  - The list of all courses gets an optional grouping when a degree is picked: Required, then Choose from a list, Counts as elective, and Not used, under real headings.
  - The same filters apply (Part B).
- **Legend:** only when a degree is picked, one extra row: `▌Required  ▌Choose from a list  ▌Core / elective  (no stripe) Not used`, each with its stripe sample.
- **Accessible names:** the role sentence goes after the requirements, e.g. "CSE 474, Introduction to Embedded Systems. Requires one of CSE 123 or CSE 143. 1 of 4 required for Computer Engineering."

## A6. Tests

- **Unit tests for roles**, including your five cases: 331, 369, 446, 474 and 373, plus:
  - DS inherits the CS groups.
  - Exclusions: 331 isn't Core for CS; 369 and 371 aren't Core for CE.
  - Pending lists contribute no roles.
- **Validation tests:** a missing course gives a warning, an unknown list is an error, a duplicate is an error, and a schema error names the file and field.
- **App tests:**
  - The degree control writes `&degree=` and reads it back.
  - Badges and accessible names in each mode, and the "In your degree" panel section.
  - List view role text.
  - The legend row appears only with a degree picked.
  - Switching degree moves nothing.
  - axe checks with a degree picked.
- **Contrast tests** for every new token.

---

# Part B: Declutter

## B1. Filters panel

A `<details>` disclosure, closed by default, next to the degree control:

```
 ▸ Filters (2 on)
   Level:  ☑ 100  ☐ 200  ☑ 300  ☑ 400
   ☐ Hide courses not used in my degree      (only when a degree is picked)
   ☑ Hide non-CSE courses
   ☑ Simplify intro-course lines
   Showing 24 of 41 courses. [Reset filters]
```

- **The summary says how many filters are on,** so hidden courses are never a surprise. A polite status line repeats "Showing 24 of 41 courses" when a filter changes.
- **Hidden courses keep their places.** Nothing is laid out again. Lines to and from a hidden course are hidden too. A "1 of N" pill whose options are all hidden goes away with its line, but the course's accessible name and panel still list every requirement.
- **Courses on the selected course's path always appear,** even when filtered out. They get a dashed border and the line "Shown because it's on this course's path", which is also in the accessible name.
- **Keyboard:** arrow keys and Tab skip hidden courses. The existing check only moves to courses that are drawn.
- **The 200 checkbox** exists only for the E E courses. If you'd rather not have it, non-CSE courses at the 200 level could follow the "Hide non-CSE" switch instead.

## B2. Simplify intro-course lines (on by default)

**Measured on the current map:**
- 26 of 93 lines start at CSE 123 or 143.
- **9 "1 of 2" pills contain only those two courses,** feeding CSE 311, 331, 340, 341, 351, 373, 374, 469 and 474.
- **4 pills mix them with other options:** CSE 154 (also 122, 160, 163), CSE 163 (122, 160), CSE 391 (122), and CSE 414 (163).

**Proposal:**
- For the 9 pure groups, hide the two option lines, the pill, and its line into the course: 27 lines in all.
- In their place, the card gets a small tag: **"Needs CSE 123 or 143"**, with the grade when there is one (CSE 311: "Needs CSE 123 or 143, ≥ 2.0").
- **Mixed groups keep their lines** (question 6). A tag saying "Needs CSE 123 or 143" on CSE 154 would be wrong, because CSE 160 also works.
- **Selecting a course shows its whole path,** including the hidden lines. Selecting CSE 123 shows all its lines.
- **The accessible name and panel never change,** and arrow keys still move from CSE 311 to CSE 123.

## B3. Level bands: feasible, and the map gets wider

elk can keep levels apart. I tried "partitioning" in a scratch run on the real data, without changing the repository. Each node gets a partition equal to its level, and junction pills take the level of the course they feed. No line goes from a higher level to a lower one, so elk can honor every partition.

| Layout | Width × height | Label overlaps | Line bends | Levels in separate columns |
| --- | --- | --- | --- | --- |
| Now | 3254 × 1759 | 0 | 168 | No: 100-level spans 12–2756 px, overlapping 300 and 400 |
| Levels as partitions | 4292 × 2197 | 0 | 166 | Yes |
| Partitions + wider column gaps (88 px) | 4840 × 2197 | 0 | 166 | Yes |

- **Each level becomes a column band,** with a very light background (decorative only) and a sticky heading: "100-level", "200-level (non-CSE)", "300-level", "400-level". Headings are real text and are announced as group labels.
- **Trade-off:** the map gets about 32% wider, or about 49% with the wider gaps from B4. The 100-level band alone is about 2200 px wide, because the intro sequence and its many branches are long chains. The opening view still frames the intro courses, so the first screen doesn't change much. Seeing the whole map means more panning or zooming out.
- **Alternative:** column headings without partitions. That's impossible: today the levels overlap, so no heading could be placed honestly.

## B4. Calmer cards

- **One size for every card:** 200×88 px.
  - Row 1: the course number and level tag.
  - Row 2: the title, cut to one line with "…".
  - Row 3: a single line for the badge or tags. That's the role badge in degree mode, or CS/DS/CE plus "Needs CSE 123 or 143" in All mode.
  - "Take with …" (CSE 197) and the CSE 143 note move to the panel and the accessible name, with a short "Co-requisite" or "See details" tag on the card, so no card is taller.
- **Shorter titles:** there's no short-title source in the data, and I won't invent abbreviations, so the map cuts titles to one line. The full title stays in the accessible name and the panel. See question 8 for an optional `shortTitle` field.
- **Column gap** goes from 56 to 88 px.

## B5. Remembering choices

- **What's stored:** degree, level filters, the hide switches, and simplify lines. Each lives in the URL (`&degree=ce&levels=300,400&hide=noncse,unused&simple=0`) and in `localStorage`. Every storage read and write is in try/catch, and the map works without storage.
- **Which wins:**
  - If the URL has any of these parameters, it wins. A shared link shows exactly what the sender saw.
  - With no parameters, the saved choices apply and are written into the URL, so what's on screen is always in the URL.
  - "Reset filters" clears both.

## B6. What doesn't change

- **Keyboard and focus:** navigation, focus on the panel heading, Escape and Close, the live region, the skip link, and "/" for search.
- **List view and "Just this course":** both keep working and also apply the degree lens.
  - In "Just this course", every course drawn is on the path, so filters hide nothing, but roles show.
  - In List view, filters hide courses from the A–Z list, and a line says how many are hidden.
- **Positions stay fixed** through any degree, filter, or simplify change. Only the change to partitioned layout (B3) moves things, once.

## Tests expected to change in Stage 2

- `layoutFocusGraph` "CSE 197 gets a taller box": cards become one size (B4). It becomes "every card is the same size, and the co-requisite is in the accessible name".
- Possibly position-based tests ("ancestors left of the focus course", "every edge points left to right"). These should still pass with partitions. If any fails, I'll list it.
- The overlap tests on the full map and every focus view stay, and will cover the new layout.

Stage 2 also updates `CHANGELOG.md`, and adds to MAINTAINING.md how to update `data/programs/*.yaml` and `data/lists.yaml` each year (in section 7, "Annual review").

---

## Questions

1. **The CSE Electives list for CS isn't in your brief.** CS says "Electives from the CSE Electives list to reach 33 credits".
   - Without that list, CSE 154, 160, 163, 373, 374, 391 and 414 all read "Not used" for CS and DS, and some may be wrong.
   - Should I add an empty "CSE Electives (pending)" group, like Capstone?
   - And until the list exists, should courses read "Not on a list in this map yet" rather than "Not used"? I recommend that wording for CSE courses.
2. **Prerequisites of required courses would read "Not used".** These are CSE 121 and 122 (leading to CSE 123), and MATH 126 and 135 (required by CSE 311).
   - Options: (a) fade them as specified; (b) no fade and no badge for courses that are prerequisites of a required course; (c) a fifth, neutral role, "Leads to a required course".
   - I recommend (b). It adds no new color, and "Hide courses not used in my degree" then wouldn't hide them either.
   - Separately: should non-CSE courses ever be "Not used"? The program data covers only CSE requirements. I recommend no badge and no fade for non-CSE courses.
3. **Required courses missing from the data:** CSE 442 and 444 (DS), and CSE 480 and 484 (CE "1 of 4"). SOC 225 should be added as a stub, as your brief says.
   - Should I also add stubs for 442, 444, 480 and 484? They'd appear as white "Not in prototype yet" cards, so the DS and CE requirements are visible.
   - Or only report them as warnings?
   - The stub URLs would follow the existing pattern (`…/crscat/cse.html#cse442`, `…/crscat/soc.html#soc225`). I'd use no titles, as with the other stubs.
4. **Two groups at the same strength** (CSE 403 and 474 in CE): should the badge be "1 of 4 required", the first group in `ce.yaml`? I recommend yes, with the panel listing both.
5. **DS inherits CS unchanged:** the same Core rule (six courses, four at 400-level), the same "one more Core or Capstone", and CSE 331 still excluded from Core. Correct?
6. **Simplifying intro lines:** OK to simplify only the 9 groups that contain just CSE 123 and 143, and leave the mixed groups (154, 163, 391, 414) as they are?
7. **Colors:** the lens adds blue, orange and teal. That's an exception to the design pass's "UW purple is the only accent".
   - For color-blind users, the Required blue is close to the purple selection, handled by using different parts of the card plus text.
   - OK? Or would you rather Required use a darker purple-free color at the cost of a smaller difference from the teal?
8. **Short titles:** cut to one line with "…" (my recommendation), or add an optional `shortTitle` field that maintainers fill in from an official source? If you know one, such as the Time Schedule's abbreviated titles, tell me.
9. **Level bands:** accept the wider map (about 4300 px instead of 3250, or about 4800 with wider gaps)? I recommend yes, with the 88 px gaps.
10. **"Hide non-CSE" and "1 of N" pills:** when every option of a pill is hidden (MATH 126 and 135 for CSE 311), the pill and its line disappear. The card still lists the requirement in its accessible name and panel. Is that OK, or should the card get a "Some prerequisites hidden" tag?
