# Changelog

One line per change, newest first. Data changes name the course and the source (see `docs/MAINTAINING.md`, section 4).

## 2026-11-19

- Deploys to GitHub Pages (https://jessia-h.github.io/uw-cse-prereq-map/) on every push to `main`: `.github/workflows/deploy.yml`.

## 2026-11-18

- Accessibility from the review meeting: short accessible names for course cards (“CSE 451, Introduction to Operating Systems”, plus the role when a degree is picked), with requirements, grades, notes and unlocks as the description (`aria-describedby`); the scroll wheel no longer zooms the map (Ctrl/Cmd + scroll, pinch, or +/− do), with a “Use Ctrl + scroll to zoom” hint; full titles on hover and focus for cut-off card titles (WCAG 1.4.13); `docs/embed-test.html` for checking the map inside an iframe.

- Degree lens: “Show my degree” (CS, CS: Data Science, CE) with role badges, an “In your degree” panel section, and role text in the List view. New data: `data/programs/cs.yaml`, `ds.yaml`, `ce.yaml` and `data/lists.yaml` (catalog and Allen School Course Lists / Non-Major Options pages, retrieved 2026-10-22). Capstone and Data Science elective lists are pending.
- Added CSE 442, 444, 480, 484 from the UW Course Catalog (retrieved 2026-10-22), and SOC 225 as a stub. The map now has 36 courses.
- Declutter: level bands, one card size, filters (level, non-CSE, not used in my degree), and “Simplify intro-course lines” (on by default). Choices are remembered in the URL and browser storage. See `docs/degree-lens-proposal.md`.

## 2026-11-17

- Batch 1 data: added CSE 154, 160, 163, 340, 341, 344, 374, 391, 401, 403 from the UW Course Catalog (retrieved 2026-10-22); removed the CSE 163 stub from `data/external.yaml`. The map now has 32 courses.

## 2026-10-30

- Design pass: quieter map, "1 of 2" pills, new course cards, answer-first panel, "How to read this map" dialog. Retired courses (CSE 142, 303, 326) are hidden from the interface but still count in eligibility logic. See `docs/design-proposal.md`.
- Step 7: List view, keyboard navigation, accessibility pass, fixed mouse clicks on map courses.

## 2026-10-29

- Steps 1–6: project setup, data schema and validator, 22 prototype courses encoded from the UW Course Catalog (retrieved 2026-10-22), prerequisite logic, focus view, full map, detail panel.
