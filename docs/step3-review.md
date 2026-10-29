# Step 3 review: course data encoding

Review of the 22 Phase 1 courses in `data/courses/` against the UW Course Catalog text (retrieved 2026-10-22). Approved 2026-10-29.

"≥2.0" means a minimum grade of 2.0 in that course. A semicolon between groups means AND.

| Course | Verbatim prereqText | Structured logic in plain words | Unsure / notes |
|---|---|---|---|
| CSE 121 | Recommended: completion of Paul G. Allen School's Guided Self-Placement. | Prereq: none. Recommended: Guided Self-Placement. | (1) |
| CSE 122 | Recommended: CSE 121 or completion of Paul G. Allen School's Guided Self-Placement. | Prereq: none. Recommended: one of CSE 121 or Guided Self-Placement. | (1) |
| CSE 123 | Recommended: CSE 122 or completion of Paul G. Allen School's Guided Self-Placement. | Prereq: none. Recommended: one of CSE 122 or Guided Self-Placement. | (1) |
| CSE 143 | Prerequisite: CSE 142. | CSE 142 (retired). | The catalog itself names a retired course; the validator warns. Expected. |
| CSE 197 | Must be taken with CSE 121, CSE 122, or CSE 123. | Prereq: none. Co-requisite: one of CSE 121, CSE 122, CSE 123. | Audience `unknown`; "Allen Scholars / STARS" kept in `notes`. |
| CSE 311 | Prerequisite: a minimum grade of 2.0 in either CSE 123 or CSE 143; and a minimum grade of 2.0 in MATH 126 or MATH 135. | One of CSE 123 ≥2.0 or CSE 143 ≥2.0, AND one of MATH 126 ≥2.0 or MATH 135 ≥2.0. | (2) |
| CSE 312 | Prerequisite: CSE 311. | CSE 311. | — |
| CSE 331 | Prerequisite: a minimum grade of 2.0 in either CSE 123 or CSE 143. | One of CSE 123 ≥2.0 or CSE 143 ≥2.0. | (2) |
| CSE 332 | Prerequisite: CSE 311. | CSE 311. | — |
| CSE 333 | Prerequisite: CSE 351. | CSE 351. | — |
| CSE 351 | Prerequisite: CSE 123 or CSE 143. | One of CSE 123 or CSE 143. | — |
| CSE 369 | Prerequisite: CSE 311. | CSE 311. | — |
| CSE 371 | Prerequisite: either E E 205 or E E 215; either E E 271 or CSE 369. Offered: jointly with E E 371. | One of E E 205 or E E 215, AND one of E E 271 or CSE 369. | (3) `jointWith: [E E 371]`. |
| CSE 373 | Prerequisite: CSE 123 or CSE 143. | One of CSE 123 or CSE 143. | — |
| CSE 414 | Prerequisite: a minimum grade of 2.5 in either CSE 123, CSE 143, or CSE 163. | One of CSE 123 ≥2.5, CSE 143 ≥2.5, or CSE 163 ≥2.5. | (2) |
| CSE 421 | Prerequisite: CSE 312; CSE 332. | CSE 312 AND CSE 332. | — |
| CSE 446 | Prerequisite: CSE 332; MATH 208 or MATH 136; and either STAT 390, STAT 391, or CSE 312. | CSE 332, AND one of MATH 208 or MATH 136, AND one of STAT 390, STAT 391, or CSE 312. | — |
| CSE 447 | Prerequisite: CSE 312 and CSE 332; recommended: MATH 208; and CSE 446 is recommended before or concurrently. | Prereq: CSE 312 AND CSE 332. Recommended: MATH 208, and CSE 446 (before or concurrently). | (4) |
| CSE 451 | Prerequisite: CSE 332; CSE 333; and CSE 351. | CSE 332 AND CSE 333 AND CSE 351. | — |
| CSE 461 | Prerequisite: either CSE 326 or CSE 332; either CSE 303 or CSE 333. | One of CSE 326 (retired) or CSE 332, AND one of CSE 303 (retired) or CSE 333. | Two retired-course warnings, expected. Conflict recorded. |
| CSE 469 | Prerequisite: either E E 271 or CSE 369; and either CSE 123 or CSE 143. Offered: jointly with E E 469. | One of E E 271 or CSE 369, AND one of CSE 123 or CSE 143. | (3) `jointWith: [E E 469]`. Conflict recorded. |
| CSE 474 | Prerequisite: CSE 123 or CSE 143 Offered: jointly with E E 474; AWSpS. | One of CSE 123 or CSE 143. | (3) "AWSpS" is part of the Offered clause. `jointWith: [E E 474]`. Conflict recorded. (5) |

## Notes and decisions

1. **Guided Self-Placement label.** The `other` leaf reads "Guided Self-Placement"; the full catalog wording stays in `prereqText` and is shown under "Official wording". *Decision: keep the short label.*
2. **Minimum grade on each option.** "A minimum grade of 2.0 in either CSE 123 or CSE 143" is encoded as `minGrade` on each alternative, i.e. the grade applies to whichever course the student took. *Decision: correct reading; confirm with advisers (see [adviser-questions.md](adviser-questions.md)).*
3. **"Offered: jointly with …".** Not a prerequisite. Excluded from the logic, kept verbatim in `prereqText`, and the joint listing recorded in `jointWith`. *Decision: correct.*
4. **CSE 447 recommendations.** Two separate recommendations stored as one `all` group, because `recommended` holds a single requirement. *Decision: fine, since recommendations never block eligibility.*
5. **CSE 352.** Named only in the CSE 474 conflict text; conflicts are free text and are not checked against the course list.

## External stubs

`data/external.yaml` holds only `id`, `status` and `url`, plus `notes` where needed. No titles are added from outside the catalog.

- Active stubs link to the catalog page with the course anchor (e.g. `math.html#math126`, `ee.html#ee271`, `stat.html#stat391`), as the Allen School Non-Major Options page does.
- CSE 142 (retired) links to the [Non-Major Options page](https://www.cs.washington.edu/academics/undergraduate/non-major-options/), with the note "Last offered Summer 2022".
- CSE 303 and CSE 326 (retired) link to `cse.html`, with the note "No longer in the catalog; named only as an alternative in CSE 461’s prerequisite text."
