# Conway's Game of Life -- AI Coding Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Build & Run

**Prerequisites:** Node.js 20.19 or later and npm. Install dependencies with:

```sh
npm ci
```

**Production build:**

```sh
npm run build
```

The TypeScript compiler writes `main.js` alongside `main.ts`. Open `index.html` in a browser or serve the repository with `python3 -m http.server`.

**Create the release archive:**

```sh
npm run publish
```

This builds the application and creates `conways-game-of-life.tar.xz` containing `index.html`, `main.js`, and `style.css`.

**Run tests:**

```sh
npm test
```

This type-checks the application and tests before running the tests with Node's test runner through `tsx`.

**Check formatting:**

```sh
npx prettier --check .
```

There is no linter configured for this project.

## Architecture

This is a small TypeScript browser application. The application code is in `main.ts`, the static page is in `index.html`, and presentation rules are in `style.css`.

`main.ts` is organised into four layers, top to bottom:

1. **Utilities** -- range/repetition helpers, DOM querying, and canvas context acquisition.
2. **Simulation logic** -- `Area` owns the cell matrix and implements Conway's rules in `stepSimulation`.
3. **Drawing and controls** -- `AreaPainter`, mouse handling, and `setupControls` connect the area to the DOM.
4. **Animation and startup** -- `Visualisation` owns the timer, while `main` creates the initial glider and starts the simulation.

The browser entrypoint is the guarded `main()` call at the bottom of `main.ts`. The document guard allows tests to import simulation classes in Node without constructing browser UI.

## Dependencies

Managed in `package.json` and locked in `package-lock.json`:

- `typescript` -- application and test type-checking
- `tsx` -- execution of TypeScript tests through Node's test runner
- `prettier` -- code formatting
- `tslib` -- TypeScript runtime helpers

## CI

GitLab CI (`.gitlab-ci.yml`) installs dependencies with `npm ci`, runs `npm run publish`, and retains `conways-game-of-life.tar.xz` as an artifact.

## Licence

AGPL-3.0 (`COPYING.md`).
