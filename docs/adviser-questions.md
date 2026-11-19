# Questions for Allen School advisers

Interpretations the data currently relies on. Each one should be confirmed with an adviser before it moves from `method: catalog` to `method: adviser-confirmed`.

| # | Question | Current encoding | Affects | Status |
|---|---|---|---|---|
| 1 | Does "a minimum grade of 2.0 in either CSE 123 or CSE 143" mean 2.0 in whichever one the student took? | `minGrade` on each alternative | CSE 311, CSE 331, CSE 154 (2.0, six options); CSE 414 (2.5, also CSE 163) | Open |
| 2 | Is this wording right for each audience value: `majors` → “Allen School majors only”, `nonmajor` → “Designed for non-majors”, `open` → “Open to all students”, `unknown` → “Not yet confirmed”? | `AUDIENCE_LABEL` in `src/lib/describe.ts` | Audience badge on every course | Open |
| 3 | How should the map present CSE 143? Its only catalog prerequisite is CSE 142 (retired, last offered Summer 2022), and retired courses aren't shown. The card has a “See details” tag; its accessible name and the panel say “For students who already completed an earlier intro course”, and the panel adds “Most students should take CSE 122 or CSE 123 instead.” Is that accurate advice, and who can still take CSE 143? | `RETIRED_PREREQ_NOTE` in `src/lib/describe.ts` | CSE 143 card, accessible name, panel, and list view | Open |
| 4 | Which courses are on the Capstone list? CS needs “one more Core course or one Capstone course”; CE needs one Capstone course. The list wasn't available when the degree data was written (2026-10-22). | `capstone` list in `data/lists.yaml`, `status: pending`, empty | CS and CE “In your degree”; no course shows a Capstone badge yet | Open |
| 5 | Which courses are on the data science elective list? CS: Data Science needs one course from it. | `ds-electives` list in `data/lists.yaml`, `status: pending`, empty | CS: Data Science “In your degree”; no course shows a “Data Science requirement” badge yet | Open |
