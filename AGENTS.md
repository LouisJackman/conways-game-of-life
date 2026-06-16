# conways-game-of-life - AI Coding Agent Instructions

Canonical instructions for AI coding agents working in this repository. Tool-specific entrypoints symlink to this file where supported:
- `CLAUDE.md`
- `.cursorrules`
- `.github/copilot-instructions.md`

## Build & Run

**Prerequisites:** JVM (JDK/JRE) and Clojure CLI (`clj`). Dependencies are fetched automatically via Maven on first run.

**Production build:**

```sh
clj -M -m cljs.main --optimizations advanced -c louis-jackman.conways-game-of-life
```

Output lands in `out/main.js`. Open `index.html` in a browser (or serve via `python3 -m http.server`).

**Development with hot-reload:**

```sh
clj -M -m figwheel.main --build dev --repl
```

Opens the simulation in a browser with a REPL for runtime modifications. Figwheel config is in `dev.cljs.edn`.

**Docker build (no local JVM needed):**

```sh
docker build -t conways-game-of-life-builder .
docker run --rm -v "$PWD:/home/user/workspace" conways-game-of-life-builder
```

**Run tests (requires Node.js):**

```sh
clj -M -m cljs.main --compile-opts '{"output-dir": "out-test"}' -t node -m louis-jackman.conways-game-of-life-test
```

There is no linter configured for this project.

## Architecture

This is a single-file ClojureScript browser application in `src/louis_jackman/conways_game_of_life.cljs`. The namespace is `louis-jackman.conways-game-of-life`.

The file is organised into four layers, top to bottom:

1. **Utilities** -- `Coordinates` record, DOM helpers (`query-selector-or-throw`, `elem`, `text`, `add-class`), canvas context acquisition.
2. **Simulation Logic** -- Pure functions over immutable areas (2D vectors of boolean cells). `step-area-state` advances one generation. Cell transitions use `:no-change`, `:kill`, `:spawn` to minimise `assoc` calls.
3. **UI** -- Canvas drawing (`draw-area`), control form creation (`->ui-controls`, `->ui`), inline CSS stylesheet (`style`).
4. **State Synchronisation** -- `SimulationElement` record ties mutable atoms (area, frame rate, interval ID) to the DOM. `swap-SimulationElement!` supports Figwheel hot-reload by cleanly tearing down timers before replacement.

The entrypoint is `-main` at the bottom, which seeds a glider pattern and starts the simulation. A `defonce` atom holds the singleton `SimulationElement` to survive hot-reloads.

## Dependencies

Managed in `deps.edn`:

- `org.clojure/clojurescript` -- compiler
- `com.bhauman/figwheel-main` -- dev hot-reload server
- `com.bhauman/rebel-readline-cljs` -- enhanced REPL

## CI

GitLab CI (`.gitlab-ci.yml`) builds via Docker-in-Docker and produces a `conways-game-of-life.tar.xz` artifact containing `index.html` and `out/main.js`.

## Licence

AGPL-3.0 (`COPYING.md`).
