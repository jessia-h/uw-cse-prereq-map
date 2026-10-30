# Design proposal: a calmer, easier map

Status: **approved and built (Stage 2).** Screenshots of the result are in [screenshots/after/](screenshots/after/).

Decisions made at approval, which override the proposal below where they differ:

- Retired courses appear **nowhere** in the interface (map, list view, search, Unlocks, cards, accessible names, panel text), only in the collapsed “Official catalog wording”. So there is no “Also accepted” line.
- CSE 143's card says “For students who already completed an earlier intro course” (also in its accessible name); the panel adds “Most students should take CSE 122 or CSE 123 instead.” (adviser question 3).
- CSE 163, and any CSE course not yet encoded: a white card with a “Not in prototype yet” tag. “Non-CSE course” is only for E E, MATH, and STAT.
- Level tags read “300-level”. The blue focus ring and the amber conflict note stay. Hint: “Select a course to see what it needs and what it unlocks.”

Screenshots of the current app (1440×900) are in [screenshots/before/](screenshots/before/):

| File | What it shows |
| --- | --- |
| `full-map.png` | Whole map, nothing selected |
| `full-map-cse311-panel.png` | Whole map, CSE 311 selected, panel open |
| `full-map-cse469-panel.png` | Whole map, CSE 469 selected, panel open |
| `focus-cse311-panel.png` | Just this course, CSE 311, panel open |
| `focus-cse469-panel.png` | Just this course, CSE 469, panel open |

Stage 2 will save the same five views, with the same names, in `screenshots/after/`.

## What's wrong today

From the screenshots:

- **Too much to read before the map.** The banner, title, search, toolbar, intro line, "Try" chips, and a three-line key take up the top 370 px. The map starts below that.
- **The key reads like a manual.** It has seven entries. One of them is a 30-word sentence about how selection works.
- **Everything is equally loud.** Every line is purple, and every card has a purple border. When nothing is selected, nothing stands out. When something is selected, the highlighted path competes with dozens of other purple lines.
- **The "one of N" boxes are as big as small cards.** There are 17 on the full map, and they add a lot of visual weight.
- **Retired courses take space without helping anyone plan.** CSE 142 alone adds a column on the left of the full map. CSE 303 and CSE 326 sit among the 300-level courses.
- **The panel opens with metadata.** You have to read down to the Prerequisites heading to learn what you need.

---

## 1. Retired courses off the map

**Before:** CSE 142, 303, and 326 are drawn as grey cards labeled "retired." CSE 461 gets two "one of 2" boxes, each with a retired option.

**After:**

- **Not drawn in any graph view.** Retired courses don't appear on the whole map or in Just this course. They stay in the data and in the eligibility logic: a student who took CSE 142 still satisfies CSE 143. The tests in `prereq.test.ts` already check this and stay unchanged.
- **Collapsing OR groups.** When removing a retired option leaves an OR group with one course, that course connects with a plain solid "Required" line. For CSE 461, CSE 332 → CSE 461 and CSE 333 → CSE 461 become solid lines, and both "one of 2" boxes go away.
  - This is done when the graph is built (`focusGraph.ts`), using the same rule that already skips a junction for a one-option OR.
  - The "1 of N" count on any remaining pill counts only courses that are drawn.
- **One quiet line in the panel, below Prerequisites:**
  - CSE 461: *"Also accepted: CSE 326 (retired) instead of CSE 332; CSE 303 (retired) instead of CSE 333."*
  - CSE 143: *"Also accepted: CSE 142 (retired, last offered Summer 2022)."* (see question 1)
  - "Last offered Summer 2022" comes from the `notes` field in `external.yaml`. CSE 303 and 326 have no last-offered date in the data, so the line says only "retired."
- **List view and search are unchanged.** Both still include the retired courses, because List view must stay as it is.
  - If a retired course is selected while a graph view is showing, the panel opens and the map shows a short notice: "CSE 142 is retired, so it isn't drawn on the map."
- **Keyboard:** ← skips prerequisites that aren't drawn. For example, ← from CSE 143 no longer tries to reach CSE 142.
- **Accessible names stay complete.** CSE 461's name still says "Requires one of CSE 326 or CSE 332, and …". The names describe the catalog rule, not the drawing.
- **Non-CSE courses stay** (E E, MATH, STAT), styled as a **Non-CSE course** card (see section 5).

**Measured with elk on the real data** (scratch run, no repo changes): the full map goes from 17 junctions to 15 and has 4 fewer line bends. Its size depends on the card size from section 5 (see the table in section 4).

## 2. A much simpler legend

**Before:** a "Key" heading with seven entries over three lines, plus a selection-behavior sentence.

**After:** one row with four samples and a hint.

```
 ──▶ Required    ┄┄▶(1 of 2) Choose one    [≥ 2.0] Minimum grade    [ MATH 126 ] Non-CSE course     How to read this map
 Click a course to see what it needs and what it unlocks.
```

- **Each sample is drawn like the real thing:** the same stroke and dash pattern, the same pill, the same grade tag, and a small grey card. Each sample is `aria-hidden`, and its text label carries the meaning.
- **Removed:**
  - "CSE course in this map": every other card is one, so it doesn't need a legend entry.
  - "Take with …": the text on CSE 197's card already says it.
  - The selection-behavior sentence.
- **Recommended courses:** the "Show recommended courses" checkbox label gets its own dotted sample: `☐ Show recommended courses ┈┈▶`. The legend stays at four items, and the dotted style is explained next to the control that turns it on.
- **"How to read this map"** opens a native `<dialog>` (modal) with a short explanation of:
  - what left and right mean
  - what a selected course highlights
  - "1 of 2" pills
  - minimum grades
  - co-requisites
  - recommended courses
  - why retired courses aren't drawn
  - keys: Tab, arrows, Enter, Escape, and "/"

  It has an h2 heading and a Close button. Focus moves into the dialog and returns to the trigger when it closes. Escape closes the dialog only; the panel's Escape handler will ignore Escape while the dialog is open.
- **Link or button:** you asked for a link. It opens a dialog rather than going somewhere, so it should be a `<button>` styled like a link. That's how it will be announced too ("How to read this map, button").

## 3. Quieter default state

**Before:** every line and every CSE card border is UW purple at full strength.

**After:**

| State | Lines | Cards | Text |
| --- | --- | --- | --- |
| Nothing selected | grey `#8c8c8c`, 1.25 px | white, subtle border `#d6d3de` | `text` |
| Selected course | — | filled UW purple, white text | 10.41:1 |
| On the selected path | UW purple, 2.5 px | purple 2 px border | `text` |
| Off the path while something is selected | grey `#8c8c8c`, 1 px | subtle border, muted title | `textMuted` (7.00:1) |

- **Selection is the only strong visual:** purple fill, purple lines, and a thicker stroke.
- **Trade-off: lines can't get much lighter than this.**
  - Lines carry meaning, so WCAG 1.4.11 requires 3:1 against the background.
  - `#8c8c8c` is 3.36:1. The "light grey" you described (around `#b0b0b0`) would be 2.17:1, which fails.
  - Instead, the quiet look comes from thinner lines and no color, not from fading below 3:1.
  - If you'd accept faded lines below 3:1 only *while* a selection is active (on the argument that those lines aren't needed for the current task), say so. I don't recommend it.
- **Card borders can be subtle (1.48:1).** The card's text identifies it, so the border is decorative. Selected cards and cards on the path get strong borders.
- **New tokens in `theme.ts`, each added to `theme.test.ts`:**
  - `edgeQuiet` (3.36:1)
  - `cardBorderQuiet` (decorative; the test records that it's decorative, rather than skipping it silently)
  - `pillFill`
  - `tagFill`
  - `surfaceTint` (`#f3f0f8`: purple 9.23:1 and muted text 6.21:1 on it)

## 4. Lighter OR groups: "1 of 2" pills

**Before:** a 72×28 box with a dashed border reading "one of 2," the same visual weight as a small card.

**After:** a 48×20 pill reading **1 of 2**. The dashed option lines run into it, and a single line leaves it. It's grey when quiet and purple on the selected path.

**Can elk lay this out cleanly? Yes.** I tested it on the real data in a scratch script, with nothing changed in the repo:

| Layout | Width × height | Label overlaps |
| --- | --- | --- |
| Now | 2884 × 1265 | 0 |
| No retired, 48×20 pills | 2738 × 1185 | 0 |
| No retired, pills, new 184×72 cards | 2818 × 1271 | 0 |

All 22 focus views with the new sizes (recommended shown) also have 0 overlaps.

**The trade-off:** the pill stays a small node in the layout; it isn't a label floating on a merged line. elk's layered algorithm has no "merge these lines and label the merged part" feature. I could draw the pill on the line without a node, but then elk wouldn't reserve space for it, and three or more dashed lines would arrive at the course separately, so they could read as separate requirements. Keeping a tiny node guarantees the lines visibly merge at the pill, and the overlap test can keep covering it. Visually, the pill sits where the lines join.

## 5. Course cards

**Before:** 176×64. The course number and the full title are both small, and grey cards carry an italic "outside this map" or "retired."

**After** (184×72, 8 px rounded corners, 1 px subtle border):

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ CSE 311               300    │   │ MATH 126           Non-CSE   │  ← grey fill, grey outline
│ Foundations of Computing I   │   │                              │
└──────────────────────────────┘   └──────────────────────────────┘
```

- **Course number** large and bold (18 px). The title is below in 12 px, cut off with "…" after two lines. The full title is still in the accessible name and the panel. I won't write shorter titles myself; that would be content from outside the catalog.
- **Level tag:** a small pill reading "100", "300", or "400", taken from the course number. Non-CSE cards show "Non-CSE" there instead. Should it say "300" or "300-level"? See question 3.
- **Size:** every card is the same size, except CSE 197, which stays taller so its "Take with one of CSE 121, CSE 122, CSE 123" line still fits. Hiding that line would lose information, or bring back the legend entry.
- **CSE 163** is an active CSE course that isn't in the prototype, so "Non-CSE" would be wrong for it. See question 2.

## 6. Page layout

**Before:** a full-width orange banner, the title on the left, search on the right, then a separate toolbar row and an intro row.

**After:**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Prototype: 22 of about 100 CSE courses. Unlocks lists and the map are …  [×]    │ ← thin strip
├──────────────────────────────────────────────────────────────────────────────────┤
│ UW Allen School CSE Prerequisite Map   [ 🔍 Search courses…           ]          │
│                                         Try: (CSE 332) (CSE 451) (CSE 469)       │
│ [ Whole map | Just this course | List ]       ☐ Show recommended courses ┈┈▶     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ legend row + hint                                              How to read this… │
│ ┌──────────────────────────────── map ─────────────────────────┐ ┌── panel ──┐  │
```

- **Top bar:**
  - The title.
  - A prominent search box (wider, 44 px tall, with a search icon).
  - Example chips under the search box. These replace the separate intro row.
  - The view switch as a segmented control. It keeps `role="group"` and `aria-pressed`, so tests and screen readers are unaffected.
- **The map starts much higher** on a 900 px screen (around 220 px from the top, instead of 370 px).
- **Prototype strip:**
  - Thin (one line, 13 px text, neutral surface), with a Dismiss button labeled "Dismiss prototype notice".
  - Dismissal is remembered in `localStorage`. Reads and writes are wrapped in try/catch, so the strip just shows again if storage is blocked.
  - The same sentence stays in the footer, so the information never disappears. The strip stays inside `<header>` (axe "region" rule).
- **The skip link stays the first Tab stop**, unchanged.

## 7. Panel: the answer first

**Before:** the heading, credits, and an audience badge, then "Prerequisites / All of these:" and a list.

**After:** a card with 24 px padding, consistent section spacing, and small uppercase section headings. The order is:

1. **Heading**, then the **answer sentence** in larger text:
   - *"To take CSE 311, you need one of CSE 123 or CSE 143, and one of MATH 126 or MATH 135, each with a minimum grade of 2.0."*
   - *"To take CSE 469, you need one of E E 271 or CSE 369, and one of CSE 123 or CSE 143."*
   - *"To take CSE 461, you need CSE 332 and CSE 333."* (with the "Also accepted" line below Prerequisites)
   - *"CSE 121 has no prerequisites listed in the catalog."*
   - CSE 197 adds: *"Take it alongside one of CSE 121, CSE 122, or CSE 123."*

   The sentence is generated from the encoded requirements, the same data and the same helpers as the accessible names, so it never says anything the data doesn't. "Each with a minimum grade of …" is used only when every course in the sentence has the same minimum; otherwise grades go inline after each course.
2. Credits and audience (unchanged wording).
3. Prerequisites, Co-requisites, and Recommended: the existing sections.
4. Also accepted (retired). This is new, and only shown where it applies.
5. Official catalog wording, Unlocks, Source, Last verified, the conflict note, and the disclaimer: unchanged.

Focus still goes to the heading, and Escape and Close behave exactly as they do now.

## 8. Visual polish

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48 px, as `--space-1` to `--space-7`, used everywhere instead of one-off values. These are sizes, not colors, so I'd add a `space` export next to `colors` in `theme.ts` and generate the variables the same way.
- **One font family:** the existing system stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`). It's already the only family. I'd normalize to three sizes and two weights. I don't recommend a web font: it would add an external request for no clear accessibility gain.
- **UW purple is the only accent.**
  - The search icon and the "Try" chips move from purple borders to a quiet grey style, so purple again means "selected" or "action."
  - Gold is decoration only: the thin rule under the top bar.
  - **Two exceptions I recommend keeping** (question 4):
    - The **blue focus ring** (`#0050c8`). A purple ring would disappear next to the purple selected path, and focus visibility matters more than palette purity.
    - The **amber conflict note** in the panel. It's a warning, and a different color helps it read as one. It's also labeled "Note: prerequisites differ," so it doesn't rely on color.
- **All colors stay in `theme.ts`.** No hex values in components or CSS.

---

## Things that must not regress, and how Stage 2 will check them

- **Existing tests:** all 144 tests stay. **Five tests in `focusGraph.test.ts` assert the behavior this proposal changes,** so they'll be rewritten to assert the new rule rather than deleted:
  - "CSE 451: all ancestors …": the expected list loses CSE 142.
  - "CSE 461: retired alternatives appear as nodes" becomes "CSE 461: retired alternatives are not drawn; 332 and 333 are solid required lines."
  - Three tests check junction labels (CSE 469, the CSE 123 descendant junction, and CSE 447 recommended): "one of 2" becomes "1 of 2".

  Everything in `App.test.tsx`, `prereq.test.ts`, and the axe checks stays as is.
- **New tests:**
  - No graph view contains a retired course.
  - The "Also accepted" line.
  - The answer sentence for CSE 121, 197, 311, 461, and 469.
  - The dialog: it opens, focus moves in, Escape closes it without closing the panel, and focus returns.
  - The banner dismissal is remembered, and works when `localStorage` throws.
  - New tokens added to the contrast tests.
  - axe on the open dialog.
- **Color is never the only signal:** the path is also thicker; pills say "1 of 2"; Non-CSE cards say "Non-CSE"; the selected course has `aria-current` and a filled background.
- **Unchanged behavior:** keyboard navigation, focus behavior, the live region, the skip link, and List view. Stage 2 reruns the real-Chrome mouse and keyboard script from Step 7.
- **Stable positions:**
  - On the whole map, toggling "Show recommended courses" already keeps positions. The layout includes recommended courses and hides them.
  - **Just this course re-lays out today when the box is toggled**, so cards move. I'd fix that the same way: lay out with recommended courses included, and hide them when the box is off. The cost is some empty space where hidden recommended courses would go.
  - Dismissing the banner moves the whole page up once, but nothing moves inside the map.
- **200% zoom, forced colors, and reduced motion:** rechecked in Chrome. Forced colors needs the pill and level-tag outlines added to the existing forced-colors block.

## Questions for you

1. **CSE 143's only prerequisite is retired CSE 142.**
   - After this change, CSE 143 has no incoming line, so on the map it looks like a course with no prerequisites.
   - Options: (a) accept that, since the panel says *"Also accepted: CSE 142 (retired, last offered Summer 2022)"*; (b) add a small "Prereq retired; see details" line on the card; (c) keep CSE 142 on the map as the one exception.
   - I recommend (a), with the answer sentence reading *"To take CSE 143, you need CSE 142, which is retired (last offered Summer 2022)."* That's more honest than "Also accepted" when there's nothing else to accept. Ask an adviser what students should actually do here.
2. **CSE 163 is a CSE course outside the prototype, not a non-CSE course.**
   - Options: (a) the same grey card, but its tag says "Not in map" instead of "Non-CSE", and the legend item reads "Non-CSE or not in map"; (b) keep the legend label exactly "Non-CSE course" and give CSE 163 the normal white card with a "Not in map" tag.
   - I recommend (b): the legend stays as you specified, and CSE 163 isn't mislabeled.
3. **Level tag text:** "300" or "300-level"? I recommend "300-level". It's clearer to a first-year student and still fits.
4. **The two color exceptions in section 8** (the blue focus ring and the amber conflict note): OK to keep?
5. **Hint wording:** "Click a course…" is fine for mouse and touch users. "Select a course to see what it needs and what it unlocks." would also cover keyboard users. Keep your wording, or switch?
