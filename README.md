# UW Allen School CSE Prerequisite Map

An interactive map of how University of Washington CSE courses connect: what each course requires and what it unlocks. It is an advising aid built and maintained by Allen School Peer Advisers, not a degree audit or a registration tool.

## Status

**Prototype.** The map covers 36 of about 100 CSE courses, so "unlocks" lists and the map itself are incomplete. Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

**Live site:** https://jessia-h.github.io/uw-cse-prereq-map/ — every push to `main` rebuilds and redeploys it ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## Running it

You need [Node.js](https://nodejs.org/) 24 or newer (the version is pinned in `.nvmrc`, and `npm install` refuses older versions).

```bash
npm install     # once
npm run dev     # start the site at http://localhost:5173
npm test        # run all tests, including accessibility and color-contrast checks
```

## How the data works

- Each course is one small YAML file in [`data/courses/`](data/courses/), for example `data/courses/CSE451.yaml`. Degree requirements are in [`data/programs/`](data/programs/) (one file per degree) and the course lists they use (Core, CE Systems Electives, …) in [`data/lists.yaml`](data/lists.yaml). Courses from other departments, retired courses, and CSE courses not yet in the map are short stubs in [`data/external.yaml`](data/external.yaml).
- The [UW Course Catalog](https://www.washington.edu/students/crscat/cse.html) is the source of truth. Every course stores the catalog's prerequisite sentence word for word, next to the structured version the map draws.
- `npm run data` checks every file and names the file and field of any mistake. It runs automatically before `npm run dev` and `npm test`.
- To change or add a course, follow [docs/MAINTAINING.md](docs/MAINTAINING.md). Routine updates need no React knowledge.

## The `docs/` folder

| File | What it's for |
| --- | --- |
| [MAINTAINING.md](docs/MAINTAINING.md) | The runbook: making data changes, quarterly and annual checklists, the accessibility check, handoff |
| [adviser-questions.md](docs/adviser-questions.md) | Open questions for Allen School advisers about how to interpret the catalog |
| [step3-review.md](docs/step3-review.md) | The reviewed table of the first 22 courses as encoded, checked against the catalog |
| [design-proposal.md](docs/design-proposal.md) | The approved design pass, with before and after screenshots in [`screenshots/`](docs/screenshots/) |
| [degree-lens-proposal.md](docs/degree-lens-proposal.md) | The approved degree lens (CS, Data Science, CE roles) and decluttering, with screenshots in `screenshots/before-lens/` and `after-lens/` |
| [embed-test.html](docs/embed-test.html) | A long test page that embeds the built map in an iframe, the way WordPress will; instructions are at the top of the file |
| [PHASE1_PROMPT.md](docs/PHASE1_PROMPT.md) | The original build plan for the Phase 1 prototype |

## Accessibility

The site targets WCAG 2.1 AA, and its List view gives screen-reader users everything the map shows. It is checked before every release (see [MAINTAINING.md, section 8](docs/MAINTAINING.md#8-accessibility-check-before-every-release)).

## Disclaimer

Created and maintained by Allen School Peer Advisers. Advising aid only — verify in the UW Course Catalog and MyPlan.
