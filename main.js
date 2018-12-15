/*jslint browser: true */

var conwaysGameOfLife = (function () {
    "use strict";

    var freeze = Object.freeze;
    var seal = Object.seal;

    var fail = function (msg) {
        throw new Error("Error: " + msg);
    };

    var isDefined = function (x) { return x !== undefined; };

    var definedOr = function (x, alternative) {
        return isDefined(x) ? x : alternative;
    };

    var createRange = function (from, to) {
        var values = [];

        for (; from <= to; from += 1) {
            values.push(from);
        }
        return values;
    };

    var repeatForcingOfThunk = function (times, thunk) {
        return createRange(1, times).map(function () {
            return thunk();
        });
    };

    var repeat = function (times, value) {
        return createRange(1, times).map(function () {
            return value;
        });
    };

    var defaultAreaWidth = 30;
    var defaultAreaHeight = 20;

    var getContext = function (element) {
        var context;

        if (element === null) {
            fail("the specified element was not found");
        }

        context = element.getContext("2d");

        if (element === undefined) {
            fail("2D context could not be acquired");
        }

        return context;
    };

    var area = (function () {
        var amountOfNeighbours = function (position) {
            var x = position.x;
            var y = position.y;
            var that = this;

            var positions = freeze([
                [x - 1, y - 1],
                [x, y - 1],
                [x + 1, y - 1],
                [x - 1, y],
                [x + 1, y],
                [x - 1, y + 1],
                [x, y + 1],
                [x + 1, y + 1]
            ]);

            return positions.filter(function (neighbourPosition) {
                var x = neighbourPosition[0];
                var y = neighbourPosition[1];

                return (
                    (x > -1)
                        && (x < that.width)
                        && (y > -1)
                        && (y < that.height)
                        && that.isAlive({ x: x, y: y })
                );
            }).length;
        };

        var isUnderpopulated = function (position) {
            return (
                this.isAlive(position)
                    && (this.amountOfNeighbours(position) < 2)
            );
        };

        var isOverpopulated = function (position) {
            return (
                this.isAlive(position)
                    && (this.amountOfNeighbours(position) > 3)
            );
        };

        var isToBeSpawned = function (position) {
            return (
                !this.isAlive(position)
                    && (this.amountOfNeighbours(position) === 3)
            );
        };

        var stepSimulation = function () {
            var that = this;
            var toKill = [];
            var toSpawn = [];
            var height = this.height;
            var width = this.width;
            var y;
            var x;
            var position;

            for (y = 0; y < height; y += 1) {
                for (x = 0; x < width; x += 1) {
                    position = { x: x, y: y };

                    if (this.isUnderpopulated(position)
                        || this.isOverpopulated(position)
                    ) {
                        toKill.push(position);
                    } else if (this.isToBeSpawned(position)) {
                        toSpawn.push(position);
                    }
                }
            }
            toKill.forEach(function (position) { that.kill(position); });
            toSpawn.forEach(function (position) { that.spawn(position); });
        };

        return freeze({
            amountOfNeighbours: amountOfNeighbours,
            isUnderpopulated: isUnderpopulated,
            isOverpopulated: isOverpopulated,
            isToBeSpawned: isToBeSpawned,
            stepSimulation: stepSimulation,
        });
    }());


    var createArea = function (args) {
        var obj = Object.create(area);

        var rows = repeatForcingOfThunk(args.height, function () {
            return repeat(args.width, false);
        });

        obj.width = args.width;
        obj.height = args.height;
        obj.cellWidth = args.cellWidth;
        obj.cellHeight = args.cellHeight;

        obj.isAlive = function (position) {
            var x = position.x;
            var y = position.y;

            return rows[y][x];
        };

        obj.spawn = function () {
            Array.prototype.slice.call(arguments).forEach(function (position) {
                var x = position.x;
                var y = position.y;

                rows[y][x] = true;
            });
        };

        obj.kill = function (position) {
            var x = position.x;
            var y = position.y;

            rows[y][x] = false;
        };

        obj.spawn.apply(obj, args.initialCells);

        return freeze(obj);
    }

    var setupControls = function (visualisation) {
        var playPauseButtonText = document.createTextNode("Pause");
        var playPauseAreaStatus = document.createTextNode(
            "The simulation is playing."
        );
        var stepsPerSecondInputText = document.createTextNode(
            "Running at 4 steps per second."
        );

        var playPauseControlsStatus = document.querySelector(
            ".controls .play-pause .status"
        );
        var playPauseButton = document.querySelector(
            ".controls .play-pause .change"
        );
        var stepsPerSecondControlsStatus = document.querySelector(
            ".controls .steps-per-second .status"
        );
        var stepsPerSecondInput = document.querySelector(
            ".controls .steps-per-second input"
        );
        var stepsPerSecondButton = document.querySelector(
            ".controls .steps-per-second .update"
        );

        playPauseControlsStatus.appendChild(playPauseAreaStatus);

        playPauseButton.onclick = function () {
            if (visualisation.isRunning) {
                visualisation.pause();
                playPauseButtonText.nodeValue = "Play";
                playPauseAreaStatus.nodeValue = "The simulation is paused.";
            } else {
                visualisation.play();
                playPauseButtonText.nodeValue = "Pause";
                playPauseAreaStatus.nodeValue = "The simulation is playing.";
            }
        };
        playPauseButton.appendChild(playPauseButtonText);

        stepsPerSecondControlsStatus.appendChild(stepsPerSecondInputText);

        stepsPerSecondButton.onclick = function () {
            var input = +(stepsPerSecondInput.value);

            stepsPerSecondInput.value = "";
            visualisation.setStepsPerSecond(input);
            stepsPerSecondInputText.nodeValue = (
                "Running at "
                    + input
                    + " Steps per Second"
            );
        };
    };

    var createAreaPainter = function (args) {
        var area = args.area;
        var context = args.context;

        var width = area.width;
        var height = area.height;
        var cellWidth = area.cellWidth;
        var cellHeight = area.cellHeight;
        var aliveColor = "white";
        var deadColor = "black";

        var paintTile = function (position) {
            context.fillStyle = area.isAlive(position) ? aliveColor : deadColor;
            context.fillRect(
                cellWidth * position.x,
                cellHeight * position.y,
                cellWidth,
                cellHeight
            );
        };

        var paintAllTiles = function () {
            var y;
            var x;

            for (y = 0; y < height; y += 1) {
                for (x = 0; x < width; x += 1) {
                    paintTile({ x: x, y: y });
                }
            }
        };

        return freeze({
            paintTile: paintTile,
            paintAllTiles: paintAllTiles,
        });
    }

    var createCanvasMouseDownListener = function (args) {
        var area = args.area;
        var areaPainter = args.areaPainter;
        var canvas = args.canvas;

        return function (event) {
            var position;
            var x;
            var y;

            if (event.x === undefined) {
                x = (
                    event.clientX
                        + document.body.scrollLeft
                        + document.documentElement.scrollLeft
                );
                y = (
                    event.clientY
                        + document.body.scrollTop
                        + document.documentElement.scrollTop
                );
            } else {
                x = event.x;
                y = event.y;
            }

            x = Math.floor(
                (x - event.target.offsetLeft)
                    / area.cellWidth
            );
            y = Math.floor(
                (y - event.target.offsetTop)
                    / area.cellHeight
            );

            position = {x: x, y: y};
            area.spawn(position);
            areaPainter.paintTile(position);
        };
    };

    var createVisualisation = function (args) {
        var obj = {};

        var onInconsistentPlayPauseState = function () {
            fail("An inconsistent visualiser play/pause state has occured");
        };

        var area = args.area;
        var canvas = args.canvas;

        var areaPainter = createAreaPainter({
            area: area,
            context: getContext(canvas),
        });

        var stepIntervalId;
        var areaPainter;

        var step = function () {
            areaPainter.paintAllTiles();
            area.stepSimulation();
        };

        var steps = definedOr(args.stepsPerSecond, 4);
        var milisecondIntervalCount = (
            1000 / (definedOr(args.stepsPerSecond, 4))
        );

        canvas.addEventListener(
            "mousedown",
            createCanvasMouseDownListener({
                area: area,
                areaPainter: areaPainter,
                canvas: canvas,
            })
        );

        obj.isRunning = false;

        obj.getStepsPerSecond = function () {
            return steps;
        };

        obj.setStepsPerSecond = function (newSteps) {
            steps = newSteps;
            milisecondIntervalCount = 1000 / newSteps;

            if (this.isRunning) {
                this.pause();
                this.play();
            }
        };

        obj.play = function () {
            if (this.isRunning) {
                onInconsistentPlayPauseState();
            } else {
                stepIntervalId = setInterval(
                        step,
                        milisecondIntervalCount);
                this.isRunning = true;
            }
        };

        obj.pause = function () {
            if (!this.isRunning) {
                onInconsistentPlayPauseState();
            } else {
                clearInterval(stepIntervalId);
                this.isRunning = false;
            }
        };

        setupControls(obj);

        return seal(obj);
    };

    var main = function () {
        createVisualisation({
            area: createArea({
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
                ],
            }),
            canvas: document.querySelector(".area")
        }).play();
    };

    main();

    return freeze({
        createArea: createArea,
        createVisualisation: createVisualisation,
    });
}());

