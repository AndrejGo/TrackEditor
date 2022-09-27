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

    // Get the parameters of the skidpad track.
    let leftRadius = 100 * Number(document.getElementById("left-radius").value);
    let rightRadius = 100 * Number(document.getElementById("right-radius").value);
    let startStraight = 100 * Number(document.getElementById("start-straight").value);
    let finishStraight = 100 * Number(document.getElementById("finish-straight").value);

    // Only proceed if the user specified all of the parameters.
    if (leftRadius == 0 || rightRadius == 0 || startStraight == 0 || finishStraight == 0) {
        return;
    }

    // Placing the skidpad always clears whatever track was previously there.
    clearTrack();
    activelyDrawing = false;

    // Construct 4 segments, the start straight, right loop, left loop and the finish line.

    // Start straight
    let numStartStraightCones = Math.ceil(startStraight / 500);
    let distanceBetweenCones = Math.round(startStraight / numStartStraightCones);
    for (i = 0; i <= numStartStraightCones; i++) {
        // Yellow
        let yellowCone = { x: 150, y: -i * distanceBetweenCones };
        cones.yellow.push(yellowCone);
    }

    // Right circle
    let angle = Math.acos((rightRadius - 300) / rightRadius);
    let rightCircleCenter = { x: rightRadius - 150, y: - startStraight - Math.sin(angle) * rightRadius };
    cones.yellow.push(rightCircleCenter);

    arcLength = (2 * Math.PI - 2 * Math.abs(angle)) * rightRadius;
    numCones = Math.ceil(arcLength / 500);
    diff = (2 * Math.PI - 2 * Math.abs(angle)) / numCones;

    for (coneAngle = Math.PI - angle; coneAngle >= - Math.PI + angle; coneAngle -= diff) {
        cones.yellow.push({
            x: Math.cos(coneAngle) * rightRadius + rightCircleCenter.x,
            y: Math.sin(coneAngle) * rightRadius + rightCircleCenter.y
        });
    }
}