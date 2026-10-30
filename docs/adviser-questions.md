# Questions for Allen School advisers

Interpretations the data currently relies on. Each one should be confirmed with an adviser before it moves from `method: catalog` to `method: adviser-confirmed`.

| # | Question | Current encoding | Affects | Status |
|---|---|---|---|---|
| 1 | Does "a minimum grade of 2.0 in either CSE 123 or CSE 143" mean 2.0 in whichever one the student took? | `minGrade` on each alternative | CSE 311, CSE 331 (2.0); CSE 414 (2.5, also CSE 163) | Open |
| 2 | Is this wording right for each audience value: `majors` → “Allen School majors only”, `nonmajor` → “Designed for non-majors”, `open` → “Open to all students”, `unknown` → “Not yet confirmed”? | `AUDIENCE_LABEL` in `src/lib/describe.ts` | Audience badge on every course | Open |
| 3 | How should the map present CSE 143? Its only catalog prerequisite is CSE 142 (retired, last offered Summer 2022), and retired courses aren't shown. The card says “For students who already completed an earlier intro course”, and the panel adds “Most students should take CSE 122 or CSE 123 instead.” Is that accurate advice, and who can still take CSE 143? | `RETIRED_PREREQ_NOTE` in `src/lib/describe.ts` | CSE 143 card, accessible name, panel, and list view | Open |
