# Questions for Allen School advisers

Interpretations the data currently relies on. Each one should be confirmed with an adviser before it moves from `method: catalog` to `method: adviser-confirmed`.

| # | Question | Current encoding | Affects | Status |
|---|---|---|---|---|
| 1 | Does "a minimum grade of 2.0 in either CSE 123 or CSE 143" mean 2.0 in whichever one the student took? | `minGrade` on each alternative | CSE 311, CSE 331 (2.0); CSE 414 (2.5, also CSE 163) | Open |
| 2 | Is this wording right for each audience value: `majors` → “Allen School majors only”, `nonmajor` → “Designed for non-majors”, `open` → “Open to all students”, `unknown` → “Not yet confirmed”? | `AUDIENCE_LABEL` in `src/lib/describe.ts` | Audience badge on every course | Open |
