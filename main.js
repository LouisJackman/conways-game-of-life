const { freeze, seal } = Object;

export const fail = msg => {
  throw new Error("Error: " + msg);
};

export const isDefined = x => x !== undefined;

export const definedOr = (x, alternative) => (isDefined(x) ? x : alternative);

export const createRange = (from, to) => {
  const values = [];
  for (; from <= to; ++from) {
    values.push(from);
  }
  return values;
};

export const repeatForcingOfThunk = (times, thunk) =>
  createRange(1, times).map(() => thunk());

export const repeat = (times, value) => createRange(1, times).map(() => value);

export const defaultAreaWidth = 30;
export const defaultAreaHeight = 20;

export const getContext = element => {
  if (element === null) {
    fail("the specified element was not found");
  }

  const context = element.getContext("2d");
  if (context === undefined) {
    fail("2D context could not be acquired");
  }

  return context;
};

const areaRows = Symbol();

export class Area {
  constructor({ width, height, cellWidth, cellHeight, initialCells }) {
    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;

    this[areaRows] = repeatForcingOfThunk(height, () => repeat(width, false));

    this.spawn(...initialCells);
  }

  spawn(...positions) {
    positions.forEach(({ x, y }) => {
      this[areaRows][y][x] = true;
    });
  }

  kill({ x, y }) {
    this[areaRows][y][x] = false;
  }

  isAlive({ x, y }) {
    return this[areaRows][y][x];
  }

  amountOfNeighbours({ x, y }) {
    const positions = freeze([
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1]
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

  isUnderpopulated(position) {
    return this.isAlive(position) && this.amountOfNeighbours(position) < 2;
  }

  isOverpopulated(position) {
    return this.isAlive(position) && 3 < this.amountOfNeighbours(position);
  }

  isToBeSpawned(position) {
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

    toKill.forEach(position => this.kill(position));
    toSpawn.forEach(position => this.spawn(position));
  }
}

export const setupControls = visualisation => {
  const playPauseButtonText = document.createTextNode("Pause");
  const playPauseAreaStatus = document.createTextNode(
    "The simulation is playing."
  );
  const stepsPerSecondInputText = document.createTextNode(
    "Running at 4 steps per second."
  );

  const playPauseControlsStatus = document.querySelector(
    ".controls .play-pause .status"
  );
  const playPauseButton = document.querySelector(
    ".controls .play-pause .change"
  );
  const stepsPerSecondControlsStatus = document.querySelector(
    ".controls .steps-per-second .status"
  );
  const stepsPerSecondInput = document.querySelector(
    ".controls .steps-per-second input"
  );
  const stepsPerSecondButton = document.querySelector(
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

export class AreaPainter {
  constructor({ area, context }) {
    const { width, height, cellWidth, cellHeight } = area;

    this.area = area;
    this.context = context;

    this.width = width;
    this.height = height;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
  }

  paintTile(position) {
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

export const getMouseDownPositions = event => {
  let x;
  let y;
  if (event.x === undefined) {
    x =
      event.clientX +
      document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y =
      event.clientY +
      document.body.scrollTop +
      document.documentElement.scrollTop;
  } else {
    x = event.x;
    y = event.y;
  }
  return [x, y];
};

export const createCanvasMouseDownListener = ({
  area,
  areaPainter,
  canvas
}) => event => {
  const [baseX, baseY] = getMouseDownPositions(event);

  const x = Math.floor((baseX - event.target.offsetLeft) / area.cellWidth);
  const y = Math.floor((baseY - event.target.offsetTop) / area.cellHeight);

  const position = { x, y };
  area.spawn(position);
  areaPainter.paintTile(position);
};

export class Visualisation {
  constructor({ area, canvas, stepsPerSecond = 4 }) {
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
        canvas: canvas
      })
    );

    this.isRunning = false;

    setupControls(this);
  }

  onInconsistentPlayPauseState() {
    fail("An inconsistent visualiser play/pause state has occured");
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
    return steps;
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
    canvas: document.querySelector(".area")
  });
  visualisation.play();
};

main();
