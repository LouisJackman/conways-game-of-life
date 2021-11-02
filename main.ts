const { freeze } = Object;

export const createRange = (from: number, to: number) => {
  const values = [];
  for (; from <= to; ++from) {
    values.push(from);
  }
  return values;
};

const unreachable = (): never => {
  throw new Error("unreachable code unexpectedly reached");
};

export const repeatForcingOfThunk = <T>(times: number, thunk: () => T) =>
  createRange(1, times).map(() => thunk());

export const repeat = <T>(times: number, value: T) =>
  createRange(1, times).map(() => value);

export const getContext = (element: HTMLCanvasElement) => {
  if (element === null) {
    throw new Error("the specified element was not found");
  }

  const context = element.getContext("2d");
  if (context === null) {
    throw new Error("2D context could not be acquired");
  }
  return context;
};

type Position = {
  readonly x: number;
  readonly y: number;
};

type AreaArgs = {
  readonly width: number;
  readonly height: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly initialCells: Position[];
};

export class Area {
  readonly width: number;
  readonly height: number;
  readonly cellWidth: number;
  readonly cellHeight: number;

  readonly #areaRows: boolean[][];

  constructor({
    width,
    height,
    cellWidth,
    cellHeight,
    initialCells
  }: AreaArgs) {
    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;

    this.#areaRows = repeatForcingOfThunk(height, () => repeat(width, false));

    this.spawn(...initialCells);
  }

  spawn(...positions: Position[]) {
    for (const { x, y } of positions) {
      const row = this.#areaRows[y];
      if (row === undefined) {
        unreachable();
      } else {
        row[x] = true;
      }
    }
  }

  kill({ x, y }: Position) {
    const row = this.#areaRows[y];
    if (row === undefined) {
      unreachable();
    } else {
      row[x] = false;
    }
  }

  isAlive({ x, y }: Position) {
    const row = this.#areaRows[y];
    return (row === undefined)
      ? unreachable()
      : row[x];
  }

  amountOfNeighbours({ x, y }: Position) {
    const positions: Readonly<readonly [number, number][]> = freeze([
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1],
    ]);

    const neighbours = positions.filter(
      ([x, y]) =>
        x > -1 &&
        x < this.width &&
        y > -1 &&
        y < this.height &&
        this.isAlive({ x, y })
    );
    return neighbours.length;
  }

  isUnderpopulated(position: Position) {
    return this.isAlive(position) && this.amountOfNeighbours(position) < 2;
  }

  isOverpopulated(position: Position) {
    return this.isAlive(position) && 3 < this.amountOfNeighbours(position);
  }

  isToBeSpawned(position: Position) {
    return !this.isAlive(position) && this.amountOfNeighbours(position) === 3;
  }

  stepSimulation() {
    const toKill = [];
    const toSpawn = [];
    const { height, width } = this;

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const position = { x, y };

        if (this.isUnderpopulated(position) || this.isOverpopulated(position)) {
          toKill.push(position);
        } else if (this.isToBeSpawned(position)) {
          toSpawn.push(position);
        }
      }
    }

    for (const position of toKill) {
      this.kill(position);
    }
    for (const position of toSpawn) {
      this.spawn(position);
    }
  }
}

const querySelectorOrThrow = (query: string): Element => {
  const element = document.querySelector(query);
  if (element === null) {
    throw new Error(`document query "${query}" yielded no results`);
  }
  return element;
};

export const setupControls = (visualisation: Visualisation) => {
  const playPauseButtonText = document.createTextNode("Pause");
  const playPauseAreaStatus = document.createTextNode(
    "The simulation is playing."
  );
  const stepsPerSecondInputText = document.createTextNode(
    "Running at 4 steps per second."
  );

  const playPauseControlsStatus = querySelectorOrThrow(
    ".controls .play-pause .status"
  );
  const playPauseButton = querySelectorOrThrow(".controls .play-pause .change");
  const stepsPerSecondControlsStatus = querySelectorOrThrow(
    ".controls .steps-per-second .status"
  );
  const stepsPerSecondInput = querySelectorOrThrow(
    ".controls .steps-per-second input"
  ) as HTMLInputElement;
  const stepsPerSecondButton = querySelectorOrThrow(
    ".controls .steps-per-second .update"
  );

  playPauseControlsStatus.appendChild(playPauseAreaStatus);

  playPauseButton.addEventListener("click", () => {
    if (visualisation.isRunning) {
      visualisation.pause();
      playPauseButtonText.nodeValue = "Play";
      playPauseAreaStatus.nodeValue = "The simulation is paused.";
    } else {
      visualisation.play();
      playPauseButtonText.nodeValue = "Pause";
      playPauseAreaStatus.nodeValue = "The simulation is playing.";
    }
  });
  playPauseButton.appendChild(playPauseButtonText);

  stepsPerSecondControlsStatus.appendChild(stepsPerSecondInputText);

  stepsPerSecondButton.addEventListener("click", () => {
    const input = +stepsPerSecondInput.value;

    stepsPerSecondInput.value = "";
    visualisation.stepsPerSecond = input;
    stepsPerSecondInputText.nodeValue = `Running at ${input} Steps per Seconds`;
  });
};

const aliveColor = "white";
const deadColor = "black";

type AreaPainterArgs = {
  readonly area: Area;
  readonly context: CanvasRenderingContext2D;
};

export class AreaPainter {
  readonly area: Area;
  readonly context: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly cellWidth: number;
  readonly cellHeight: number;

  constructor({ area, context }: AreaPainterArgs) {
    const { width, height, cellWidth, cellHeight } = area;

    this.area = area;
    this.context = context;

    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
  }

  paintTile(position: Position) {
    const { x, y } = position;

    this.context.fillStyle = this.area.isAlive(position)
      ? aliveColor
      : deadColor;

    this.context.fillRect(
      this.cellWidth * x,
      this.cellHeight * y,
      this.cellWidth,
      this.cellHeight
    );
  }

  paintAllTiles() {
    for (let y = 0; y < this.height; ++y) {
      for (let x = 0; x < this.width; ++x) {
        this.paintTile({ x, y });
      }
    }
  }
}

type CreateCanvasMouseDownListenerArgs = {
  readonly area: Area;
  readonly areaPainter: AreaPainter;
};

export const createCanvasMouseDownListener = ({
  area,
  areaPainter,
}: CreateCanvasMouseDownListenerArgs) => (event: MouseEvent) => {
  const x = Math.floor(event.offsetX / area.cellWidth);
  const y = Math.floor(event.offsetY / area.cellHeight);

  const position = { x, y };
  area.spawn(position);
  areaPainter.paintTile(position);
};

type VisualisationArgs = {
  readonly area: Area;
  readonly canvas: HTMLCanvasElement;
  readonly stepsPerSecond?: number;
};

export class Visualisation {
  readonly area: Area;
  readonly canvas: HTMLCanvasElement;
  readonly areaPainter: AreaPainter;

  steps: number;
  milisecondIntervalCount: number;
  isRunning: boolean;
  stepIntervalId?: number;

  constructor({ area, canvas, stepsPerSecond = 4 }: VisualisationArgs) {
    this.area = area;
    this.canvas = canvas;

    this.areaPainter = new AreaPainter({
      area,
      context: getContext(canvas)
    });

    this.steps = stepsPerSecond;
    this.milisecondIntervalCount = 1000 / stepsPerSecond;

    canvas.addEventListener(
      "mousedown",
      createCanvasMouseDownListener({
        area: area,
        areaPainter: this.areaPainter,
      })
    );

    this.isRunning = false;

    setupControls(this);
  }

  onInconsistentPlayPauseState() {
    throw new Error("an inconsistent visualiser play/pause state has occured");
  }

  step() {
    this.areaPainter.paintAllTiles();
    this.area.stepSimulation();
  }

  play() {
    if (this.isRunning) {
      this.onInconsistentPlayPauseState();
    } else {
      this.stepIntervalId = setInterval(
        () => this.step(),
        this.milisecondIntervalCount
      );
      this.isRunning = true;
    }
  }

  pause() {
    if (!this.isRunning) {
      this.onInconsistentPlayPauseState();
    } else {
      clearInterval(this.stepIntervalId);
      this.isRunning = false;
    }
  }

  get stepsPerSecond() {
    return this.steps;
  }

  set stepsPerSecond(newSteps) {
    this.steps = newSteps;
    this.milisecondIntervalCount = 1000 / newSteps;

    if (this.isRunning) {
      this.pause();
      this.play();
    }
  }
}

export const main = () => {
  const canvas = querySelectorOrThrow(".area") as HTMLCanvasElement;

  const visualisation = new Visualisation({
    area: new Area({
      width: 80,
      height: 40,
      cellWidth: 10,
      cellHeight: 10,
      initialCells: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 0 }
      ]
    }),
    canvas
  });
  visualisation.play();
};

main();

