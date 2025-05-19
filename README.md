# Conway's Game of Life

[![pipeline status](https://gitlab.com/louis.jackman/conways-game-of-life/badges/master/pipeline.svg)](https://gitlab.com/louis.jackman/conways-game-of-life/-/commits/master)

A in-browser implementation of [Conway's Game of
Life](https://en.wikipedia.org/wiki/Conway's_Game_of_Life). View a
[demo](https://volatilethunk.com/projects/conways-game-of-life/index.html).

This repository is currently hosted [on
GitLab.com](https://gitlab.com/louis.jackman/conways-game-of-life). An official
mirror exists on [GitHub](https://github.com/LouisJackman/conways-game-of-life).
GitLab is still the official hub for contributions such as PRs and issues.

## Build & Run Locally

Change into the repository's top-level directory after cloning it.

After [installing
ClojureScript](https://clojurescript.org/guides/quick-start), build the
project with:

```sh
clj -M -m cljs.main --optimizations advanced -c louis-jackman.conways-game-of-life
```

Once built, open `index.html` in your browser.

**If your environment has security restrictions against serving up local
files, consider a local web server instead.** To do that on most Linuxes or
macOS, change into the repository's top-level directory and run:

```sh
python3 -m http.server
```

Then visit [http://localhost:8000](localhost:8000).

## Develop Locally

Similar to building, ensure ClojureScript is installed and that you are inside
the repository's top-level directory. Rather than building and then serving it up, hotload via:

```sh
clj -M -m figwheel.main --build dev --repl
```

Wait for it to open the simulation in your browser. A REPL will eventually
appear, in which you can dynamically modify the simulation at runtime.

## TODO

- [ ] Use transients to batch area updates, rather than repeated `assoc` calls in `reduce`.
- [ ] Repaint diffs in the canvas rather than repainting from scratch every time.
- [ ] As areas are immutable with structural sharing, implement rewindable history and snapshots.
- [ ] See whether some `seq`s in tight loops, e.g. neighbour cell enumeration, are quicker as
      transducers.
- [ ] Add an option to "loop around" at the borders.
- [ ] Visualise hovering over cells with a mouse.
- [ ] Migrate keyword and variadic arguments to more overloaded positional arguments, to see if it
      aids performance.
