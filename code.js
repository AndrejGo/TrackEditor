// Create a new PIXI application
const app = new PIXI.Application({
    // Make sure that the canvas PIXI is using is always the size of the div that contains it.
    resizeTo: document.getElementById("canvas-wrapper"),
    // If you turn off anti-aliasing, the application looks like shit.
    antialias: true
});
// Set the background color to a dark-ish shade of gray.
app.renderer.backgroundColor = 0x222222;
// Add the canvas PIXI created to the div element.
document.getElementById("canvas-wrapper").appendChild(app.view);

// The World object holds all of the PIXI graphics objects. Set these up and also register the
// function that will handle zooming.
let W = new World(app);
W.setUp();

// The ui object is used to handle mouse inputs.
let ui = new UserInterface(app, W.container);

// Create an empty track. It will start at (0, -100) in an upwards direction and end at (0, 100).
// The track will contain 2 initial blue cones and 2 initial yellow cones as well as 4 big orange
// cones that mark the finish line.
let t = new Track(new Point(0, -100), new Point(0, 100), Line.vertical);

// Execute the appLoop function each tick.
app.ticker.add((delta) => appLoop());

/**
 * This function handles the drawing and placing of the path segments.
 */
function appLoop() {

    // Check if the user pressed Ctrl+z
    if(ui.pressedCtrlZ()) {
        t.undo(W);
    }

    let mouseInput = ui.getMouseInput();

    // If the user moves the mouse close to the end point of the track, we want to highlight it to
    // prompt the user to finish it.
    W.finishPrompt.clear();
    if (mouseInput.positionInGrid.distanceTo(t.end) < 600 && t.activelyDrawing) {
        t.drawFinishPrompt(W.finishPrompt);
        if (mouseInput.positionInGrid.distanceTo(t.end) < 60) {
            mouseInput.positionInGrid = t.end.copy();
        }
    }

    if (mouseInput.hold) {
        // If the user is holding down the mouse button, then we need to pan the grid.
        W.pan(mouseInput);
    } else if (mouseInput.click) {
        // If the user clicked the mouse button, then we need to place dowh the segment they were
        // creating.
        t.placePotentialSegment();
        W.needToRedraw = true;

        // If the user clicked on the end of the track, we need to stop actively drawing potential
        // path segments.
        if (mouseInput.positionInGrid.equalTo(t.end)) {
            t.activelyDrawing = false;
            W.wipGraphics.clear();
        }
    }

    // W.needToRedraw is set to true when a user places down a potential path segment and when they
    // zoom. It's an optimization to avoid drawing the placed path segments when not necessary.
    if (W.needToRedraw) {
        W.needToRedraw = false;
        t.drawPlacedSegments(W.placedGraphics, W.boundScalingFactor());
    }

    // We only need to update and draw the potential path segment if the user moved the mouse while
    // we were actively drawing.
    if (mouseInput.moved && t.activelyDrawing) {
        t.updatePotentialSegment(mouseInput.positionInGrid);
        W.wipGraphics.clear();
        t.potentialSegment.draw(W.wipGraphics, W.boundScalingFactor());
    }
}

/**
 * To clear the track, just create an entirely new track object.
 */
function clearTrack() {
    // Confirm the action with a dialogue box.
    let confirmClear = confirm("Clear the track? This action cannot be undone.");
    if (confirmClear) {
        t = new Track(new Point(0, -100), new Point(0, 100), Line.vertical);
        W.wipGraphics.clear();
        W.needToRedraw = true;
    }
}

/**
 * This function gets called when the user clicks on the "Noisy cones" button. The color of the
 * button should change based on whether this is enabled or disabled.
 */
function toggleNoisyCones() {

    // Change the appearance of the button to indicate if the cone randomization is on or off.
    let button = document.getElementById("noisy-cone-btn");
    if (button.classList.contains("btn-outline-secondary")) {
        button.classList.remove("btn-outline-secondary");
        button.classList.add("btn-primary")
    } else {
        button.classList.remove("btn-primary");
        button.classList.add("btn-outline-secondary")
    }

    t.toggleNoisyCones(W);
}

function placeSkidpad() {

    // Placing the skidpad always clears whatever track was previously there. We also want to
    // disable drawing.
    clearTrack();
    t.initialCones = [];
    t.activelyDrawing = false;

    // Construct 4 segments, the start straight, right loop, left loop and the finish line.

    // Start straight
    t.segments.push(
        new PathSegment(
            null, null, null,
            [
                new Cone(new Point(-150, 0), Cone.orange, Cone.small),
                new Cone(new Point(150, 0), Cone.orange, Cone.small),
                new Cone(new Point(-150, -400), Cone.orange, Cone.small),
                new Cone(new Point(150, -400), Cone.orange, Cone.small)
            ]
        )
    );

    // Large orange cones
    t.segments.push(
        new PathSegment(
            null, null, null,
            [
                new Cone(new Point(-150, -1530), Cone.orange, Cone.large),
                new Cone(new Point(150, -1530), Cone.orange, Cone.large),
                new Cone(new Point(-150, -1470), Cone.orange, Cone.large),
                new Cone(new Point(150, -1470), Cone.orange, Cone.large)
            ]
        )
    );

    // End straight
    t.segments.push(
        new PathSegment(
            null, null, null,
            [
                new Cone(new Point(-150, -4000), Cone.orange, Cone.small),
                new Cone(new Point(-50, -4000), Cone.orange, Cone.small),
                new Cone(new Point(50, -4000), Cone.orange, Cone.small),
                new Cone(new Point(150, -4000), Cone.orange, Cone.small),

                new Cone(new Point(-150, -3500), Cone.orange, Cone.small),
                new Cone(new Point(150, -3500), Cone.orange, Cone.small),
                new Cone(new Point(-150, -3000), Cone.orange, Cone.small),
                new Cone(new Point(150, -3000), Cone.orange, Cone.small)
            ]
        )
    );

    let lineWidth = 3;
    let rightCenter = new Point(912.5, -1500);
    let leftCenter = new Point(-912.5, -1500);
    let innerRadius = 762.5;
    let outerRadius = 1062.5;
    let innerAngleArray = [
        0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875
    ];
    let outerAngleArray = [
        0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.71, 1.29, 1.375, 1.5, 1.625, 1.75, 1.875
    ];
    let rigthInnerCones = innerAngleArray.map(
        x => new Cone(
            new Point(rightCenter.x + Math.cos(x * Math.PI) * innerRadius, rightCenter.y + Math.sin(x * Math.PI) * innerRadius),
            Cone.yellow, Cone.small
        )
    );
    let rigthOuterCones = outerAngleArray.map(
        x => new Cone(
            new Point(rightCenter.x + Math.cos(x * Math.PI) * outerRadius, rightCenter.y + Math.sin(x * Math.PI) * outerRadius),
            Cone.blue, Cone.small
        )
    );
    let leftInnerCones = innerAngleArray.map(
        x => new Cone(
            new Point(leftCenter.x + Math.cos(x * Math.PI) * innerRadius, leftCenter.y + Math.sin(x * Math.PI) * innerRadius),
            Cone.blue, Cone.small
        )
    );
    let leftOuterCones = outerAngleArray.map(
        x => new Cone(
            new Point(leftCenter.x + Math.cos((1-x) * Math.PI) * outerRadius, leftCenter.y + Math.sin(x * Math.PI) * outerRadius),
            Cone.yellow, Cone.small
        )
    );
    

    // Right loop
    t.segments.push(
        new PathSegment(
            null,
            new Arc(rightCenter, innerRadius, Math.PI + 0.001, Math.PI, false, Arc.yellow,
                    null, null, lineWidth),
            null,
            rigthInnerCones
        )
    );
    t.segments.push(
        new PathSegment(
            null,
            new Arc(rightCenter, outerRadius, 1.3 * Math.PI, 0.7 * Math.PI, false, Arc.blue,
                    null, null, lineWidth),
            null,
            rigthOuterCones
        )
    );
    t.segments.push(
        new PathSegment(
            null,
            new Arc(
                new Point(-912.5, -1500),
                762.5,
                0.001,
                0,
                false,
                Arc.blue,
                null,
                null,
                5
            ), null,
            leftInnerCones
        )
    );
    t.segments.push(
        new PathSegment(
            null,
            new Arc(
                new Point(-912.5, -1500),
                1062.5,
                1.7 * Math.PI,
                0.3 * Math.PI,
                true,
                Arc.yellow,
                null,
                null,
                5
            ), null,
            leftOuterCones
        )
    );
}