import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { Area } from "../main";

type Position = {
  readonly x: number;
  readonly y: number;
};

const createArea = (...initialCells: Position[]) =>
  new Area({
    width: 5,
    height: 5,
    cellWidth: 1,
    cellHeight: 1,
    initialCells,
  });

const centre = { x: 2, y: 2 };

describe("Area.stepSimulation", () => {
  it("kills live cells with fewer than two neighbours", () => {
    const isolated = createArea(centre);
    const oneNeighbour = createArea(centre, { x: 2, y: 1 });

    isolated.stepSimulation();
    oneNeighbour.stepSimulation();

    strictEqual(isolated.isAlive(centre), false);
    strictEqual(oneNeighbour.isAlive(centre), false);
  });

  it("keeps live cells with two or three neighbours alive", () => {
    const twoNeighbours = createArea(centre, { x: 2, y: 1 }, { x: 2, y: 3 });
    const threeNeighbours = createArea(
      centre,
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 1, y: 2 }
    );

    twoNeighbours.stepSimulation();
    threeNeighbours.stepSimulation();

    strictEqual(twoNeighbours.isAlive(centre), true);
    strictEqual(threeNeighbours.isAlive(centre), true);
  });

  it("kills live cells with more than three neighbours", () => {
    const area = createArea(
      centre,
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 1, y: 2 },
      { x: 3, y: 2 }
    );

    area.stepSimulation();

    strictEqual(area.isAlive(centre), false);
  });

  it("spawns dead cells with exactly three neighbours", () => {
    const area = createArea({ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 1, y: 2 });

    area.stepSimulation();

    strictEqual(area.isAlive(centre), true);
  });

  it("advances a blinker oscillator and returns it to its initial state", () => {
    const area = createArea({ x: 1, y: 2 }, centre, { x: 3, y: 2 });

    area.stepSimulation();

    strictEqual(area.isAlive({ x: 2, y: 1 }), true);
    strictEqual(area.isAlive(centre), true);
    strictEqual(area.isAlive({ x: 2, y: 3 }), true);
    strictEqual(area.isAlive({ x: 1, y: 2 }), false);
    strictEqual(area.isAlive({ x: 3, y: 2 }), false);

    area.stepSimulation();

    strictEqual(area.isAlive({ x: 1, y: 2 }), true);
    strictEqual(area.isAlive(centre), true);
    strictEqual(area.isAlive({ x: 3, y: 2 }), true);
    strictEqual(area.isAlive({ x: 2, y: 1 }), false);
    strictEqual(area.isAlive({ x: 2, y: 3 }), false);
  });
});
