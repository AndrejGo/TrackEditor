// ============================================================================================== //
// Constants and global variables
// ============================================================================================== //
const canvasBackground = 0x222222;

const pointOnLine = 0;
const pointOnRight = 1;
const pointOnLeft = 2;

const colorOrange = 0xff9f21;
const colorYellow = 0xe9e923;
const colorBlue = 0x1a52ff;

const colorGreen = 0x08d10c;
const colorRed = 0xde2f2f;

const lineWidth = 2;
var scaledLineWidth = lineWidth;
const coneRadius = 6;
var scaledConeRadius = coneRadius;
const originRadius = 6;

var worldContainer;
var cones;
var pathSegments;
var potentialPathSegment;
var endOfTrack;
var endOfTrackMarker;
var activelyDrawing = true;

var conesGraphics;
var arcsGraphics;

var needToRedraw = false;

// ============================================================================================== //
// Entry point to the JS code
// ============================================================================================== //

// Create a new PIXI application
const app = new PIXI.Application({
    // Make sure that the canvas PIXI is using is always the size of the div that contains it.
    resizeTo: document.getElementById("canvas-wrapper"),
    // If you turn off anti-aliasing, the application looks like shit.
    antialias: true
});
// Set the background color to a dark-ish shade of gray.
app.renderer.backgroundColor = canvasBackground;
// Add the canvas PIXI created to the div element.
document.getElementById("canvas-wrapper").appendChild(app.view);

// Create a worldContainer to contain all other elements and enable panning and zooming. Put in two
// initial graphics objects to contain the track elements we will draw on the grid.
setUpWorld();

// The setUpGrid function creates a PIXI Container that contains the grid lines.
setUpGrid();

app.ticker.add((delta) => appLoop());

function appLoop() {

    // Get the user input. An important task of this function is to compute whether the user is
    // holding the mouse button to pan the grid or if they clicked the mouse button to place down a
    // path segment.
    let mouseButtonInput = getMouseButtonInput();
    let mouseGridPoint = getMousePointInGrid(mouseButtonInput.mousePointerPosition);
    // Prepare the potentialPathSegment that the user might place down by clicking the mouse
    // button.
    let potentialPathSegment;
    // If we're actively drawing, prepare the potentialPathSegment.
    if (activelyDrawing) {

        potentialPathSegment = preparePotentialPathSegment(mouseGridPoint);

        // If the mouseGridPoint is close to the point where the track ends, we want to display a
        // circle on it to prompt the user to complete the track.
        // Check if the mouse pointer is close enough to the endOfTrack.
        if (distanceBetweenPoints(endOfTrack, mouseGridPoint) < 400) {
            // If it is, draw a red transparent circle over the endOfTrack to highlight it.
            endOfTrackMarker.beginFill(0xff0000, 0.5);
            endOfTrackMarker.drawCircle(endOfTrack.x, endOfTrack.y, 40);
            endOfTrackMarker.endFill();
        } else {
            // Otherwise clear it.
            endOfTrackMarker.clear();
        }
    }

    if (mouseButtonInput.buttonAction == holdingMouseButton) {

        // If the user is holding down the mouse button, we need to move the worldContainer along
        // with the mouse pointer to achieve panning. The panningDif value was calculated in 
        // getMouseButtonInput and prevents the origin of the world from jumping to the mouse
        // pointer when the user presses the button.
        //
        // We bound the movement to a minimum of -9500 and maximum of 9500. Since the whole world
        // is 10000 x 10000, this will always leave a bit of the world in the stage. These values
        // are multiplied by the current scale (which is always equal for the x and y axis).
        worldContainer.x = Math.min(
            Math.max(
                mouseButtonInput.mousePointerPosition.x + mouseButtonInput.panningDif.x,
                -9500 * worldContainer.scale._x
            ),
            9500 * worldContainer.scale._x + app.screen.width
        );
        worldContainer.y = Math.min(
            Math.max(
                mouseButtonInput.mousePointerPosition.y + mouseButtonInput.panningDif.y,
                -9500 * worldContainer.scale._x
            ),
            9500 * worldContainer.scale._x + app.screen.height
        );

        needToRedraw = false;

    } else if (mouseButtonInput.buttonAction == clickedMouseButton && activelyDrawing) {

        // If the user clicked on the grid, they placed down the current potentialPathSegment and
        // we need to append it to the end of the pathSegments array. Only do this if the arc is
        // possible (radius and length are large enough).
        if (!potentialPathSegment.invalid) {
            pathSegments.push(potentialPathSegment);

            if (drawNoisyCones) {
                let blueCones = potentialPathSegment.blueCones;
                for (j = 0; j < blueCones.length; j++) {
                    cones.blue.push(addNoiseToPoint(blueCones[j]));
                }

                let yellowCones = potentialPathSegment.yellowCones;
                for (j = 0; j < yellowCones.length; j++) {
                    cones.yellow.push(addNoiseToPoint(yellowCones[j]));
                }
            } else {
                let blueCones = potentialPathSegment.blueCones;
                for (j = 0; j < blueCones.length; j++) {
                    cones.blue.push(blueCones[j]);
                }

                let yellowCones = potentialPathSegment.yellowCones;
                for (j = 0; j < yellowCones.length; j++) {
                    cones.yellow.push(yellowCones[j]);
                }
            }
        }

        // If the user clicked within 40 pixels of endOfTrack, we know their pointer was snapped to
        // the endOfTrack and they completed the circuit. In that case, we need to stop
        // activelyDrawing the track segments. We also clear the endOfTrackMarker which is
        // prompting the user to click on endOfTrack;

        if (distanceBetweenPoints(endOfTrack, mouseGridPoint) < 40) {
            activelyDrawing = false;
            // We also stop displaying the circle prompting the user to complete the track.
            endOfTrackMarker.clear();
        }
    }

    // We only redraw the track after certain events. This is an optimization step, since this app
    // would otherwise occasionally freeze the browser. Events when we redraw:
    //     - Zoom
    //     - Mouse moved while actively drawing
    //     - After undo
    //     - After clear track
    //     - After cone randomization
    if (needToRedraw) {
        needToRedraw = false;
        drawCones(potentialPathSegment);
        drawArcs(pathSegments, potentialPathSegment);
    }
}

// ============================================================================================== //
// Function definitions
// ============================================================================================== //

/**
 * Create a worldContainer that will contain all other elements that we will draw. By translating
 * and scaling this container, we can achieve panning and zooming behaviour. Also draw the origin
 * and border of the grid. Also creates the cone and arc graphics objects.
 */
function setUpWorld() {
    // Create the worldContainer and add it to the stage.
    worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Create two graphics objects, one for the cones and one for the arcs displaying the centerline
    // and boundaries of the track.
    conesGraphics = new PIXI.Graphics();
    worldContainer.addChild(conesGraphics);
    arcsGraphics = new PIXI.Graphics();
    worldContainer.addChild(arcsGraphics);

    // Draw a small white circle in the origin of worldContainer for reference.
    let worldOriginCircle = new PIXI.Graphics();
    worldContainer.addChild(worldOriginCircle);

    // Draw a border around the available space to draw the track.
    const availableRectangle = new PIXI.Graphics();
    availableRectangle.lineStyle({ width: 30, color: 0x00ee00, alpha: 1 });
    availableRectangle.beginFill(0x000000, 0.01);
    availableRectangle.drawRect(-10000, -10000, 20000, 20000);
    availableRectangle.endFill();
    worldContainer.addChild(availableRectangle);

    // Move the origin of the worldContainer to the center of the stage.
    worldContainer.position.x = app.screen.width / 2;
    worldContainer.position.y = app.screen.height / 2;

    /**
     * Zooming is a bit complicated, especially because PIXI doesn't support scroll events
     * natively. Furthermore, if we just scale worldContainer, the "zooming" would be centered on
     * its origin, but we want it to be centered on the mouse pointer.
     */
    document.getElementById("canvas-wrapper").addEventListener("wheel", function (e) {
        e.preventDefault();

        needToRedraw = true;

        // We "zoom" by increasing or decreasing the scale factor of worldContainer. We decrease
        // it by multiplying with 0.9 and increase it by multiplying it with 1/0.9. We choose the
        // right factor based on the direction (sign) of the scroll.
        let diff = 0.9;
        if (e.deltaY < 0) {
            diff = 1 / diff;
        }
        // We only use the scaling factor of the x axis to do the calculation since the factors for
        // x and y are always the same.
        let newScalingFactor = worldContainer.scale._x * diff;

        // Bound the new scaling factor to a maximum of 2 and minimum of 0.1.
        newScalingFactor = Math.max(Math.min(newScalingFactor, 2), 0.05);
        // When we zoom out, we still want to be able to see the cones and the arcs we draw, so
        // apply the reverse scaling to their size. Further bound the scaling factor to make it
        // look a bit better at the extreme ends.
        scaledConeRadius = coneRadius / Math.min(Math.max(newScalingFactor, 0.15), 1);
        scaledLineWidth = lineWidth / Math.min(Math.max(newScalingFactor, 0.15), 1);

        // The second half of this function calculates the translation we need to apply along with
        // the scaling to make sure the zooming is centered on the mouse pointer.

        // Get the position of the mouse in the coordinates of the div that contains the stage.
        let divRect = document.getElementById("canvas-wrapper").getBoundingClientRect();
        let divMouseX = e.pageX - divRect.left;
        let divMouseY = e.pageY - divRect.top;

        // Get the position of the mouse pointer in the (scaled and translated) coordinates of
        // worldContainer.
        let gridMouseX = (divMouseX - worldContainer.position.x) / worldContainer.scale._x;
        let gridMouseY = (divMouseY - worldContainer.position.y) / worldContainer.scale._y;

        // Apply the translation and scaling.
        worldContainer.setTransform(
            -gridMouseX * newScalingFactor + divMouseX,
            -gridMouseY * newScalingFactor + divMouseY,
            newScalingFactor,
            newScalingFactor
        );

        // Redraw the circle in the origin every time we zoom to adjust its size.
        worldOriginCircle.clear();
        worldOriginCircle.beginFill(0xeeeeee);
        worldOriginCircle.drawCircle(
            0, 0, originRadius / Math.min(Math.max(newScalingFactor, 0.05), 2)
        );
        worldOriginCircle.endFill();
    });
}

/**
 * Create a gridContainer inside worldContainer and draw a grid inside it.
 */
function setUpGrid() {
    // Create a container that will hold the grid
    const gridContainer = new PIXI.Container();
    worldContainer.addChild(gridContainer);

    // Draw the grid.
    let x_pos = -10000;
    const line = new PIXI.Graphics();
    line.lineStyle({ width: 2, color: 0x666666, alpha: 1 });
    for (i = x_pos; i <= 10000; i += 100) {
        line.moveTo(i, -10000);
        line.lineTo(i, 10000);
    }
    let y_pos = -10000;
    for (i = y_pos; i <= 10000; i += 100) {
        line.moveTo(-10000, i);
        line.lineTo(10000, i);
    }
    gridContainer.addChild(line);
}

// Prepare the object stored in potentialPathSegment based on the last segment in pathSegments and
// the position of the mouse in the grid.
function preparePotentialPathSegment(mousePoint) {

    // If the user moved the mouse close to the endOfTrack, we snap to it to make closing
    // the loop easier. If we did this, we don't want to include the two cones at the end of the
    // path segment, since they might interfere with the ones already at the finish line.
    let snappedToEnd = false;
    if (distanceBetweenPoints(endOfTrack, mousePoint) < 40) {
        mousePoint = { x: endOfTrack.x, y: endOfTrack.y };
        snappedToEnd = true;
    }

    // Get the tangentLine of the last path segment. The potentialPathSegment must be tangent to
    // this line to smoothly continue the track.
    let tangentLine = pathSegments[pathSegments.length - 1].tangentLine;

    // The start of the potentialPathSegment is at the end of the last path segment.
    let lastSegment = pathSegments[pathSegments.length - 1];
    let startPoint = { x: lastSegment.endPoint.x, y: lastSegment.endPoint.y };

    // This is here to prevent a bug where an identical x or y value would someimes produce an
    // arc with an infinite radius that would not display properly.
    if (tangentLine.b == 0 && mousePoint.x == startPoint.x) {
        mousePoint.x++;
    }
    if (tangentLine.a == 0 && mousePoint.y == startPoint.y) {
        mousePoint.y++;
    }

    // Here is where we start prepairing the potential path segment. The main idea is that we want
    // to draw an arc that starts in the point where the last path segment ended (startPoint) and
    // ends where the user is pointing the mouse (mousePoint).
    // 
    // This arc should be tangent to the arc of the last path segment in startPoint. This tangent
    // line is saved in the tangentLine variable.

    // Calculate the center point of the line between the mousePoint and the startPoint.
    let mouseAndStartCenterPoint = centerPointBewteenTwoPoints(startPoint, mousePoint);

    // Calculate the coefficients of the line that is perpendicular to the line connecting the
    // startPoint and the mousePoint and which passes through the center point. Points on this line
    // have the same distance to the startPoint and the mousePoint, so the center of the arc that
    // we are drawing needs to be somewhere on this line.
    let centerLine = perpendicularThroughPoint(
        lineBetweenPoints(startPoint, mousePoint),
        mouseAndStartCenterPoint
    );

    // Calculate the line that passes through the startPoint and is perpendicular to the
    // tangentLine. The center of the new arc must be on this line as well.
    let perpendicularLine = perpendicularThroughPoint(tangentLine, startPoint);

    // The intersection of the above two lines is the center of the arc that we're drawing.
    let arcCenterPoint = intersection(centerLine, perpendicularLine);

    // Calculate the radius of the arc.
    let radius = distanceBetweenPoints(arcCenterPoint, startPoint);

    // Get an array [startAngle, endAngle, directionBoolean] that specifies the start and end angle
    // of the arc. Zero is at the 3 o'clock position and the angle increases from there is a
    // clockwise direction. The directionBoolean specifies if the arc is to be drawn in the
    // clockwise (false) or anti-clockwise (true) direction.
    let angles = getArcAngles(tangentLine, startPoint, arcCenterPoint, mousePoint);

    // Start prepairing the potentialPathSegment object.
    potentialPathSegment = {};
    potentialPathSegment.endPoint = mousePoint;

    // If the radius of the arc is too small or the lenght of the arc is too small, we don't allow
    // the user to place it down.
    potentialPathSegment.invalid = radius < 155 || arcSpanRadians(angles) * radius < 100;

    // Eventually, we will need to draw the right and left boundaries of the potentialPathSegment.
    // In a left turn, the "inside" (closer to the arcCenter) should be blue and the "outside"
    // should be yellow. In a right turn, we need the opposite.
    //
    // To determine the positions of the cones, we need to calculate the lengths of the two
    // boundaries. Their radius is either larger or lower than that of the center line, again
    // depending whether the turn is to the right or left.
    let insideBoundaryColor = colorBlue;
    let outsideBoundaryColor = colorYellow;
    let blueRadius = radius - 150;
    let yellowRadius = radius + 150;
    if (whichSideOfLine(tangentLine, mousePoint) == pointOnRight) {
        insideBoundaryColor = colorYellow;
        outsideBoundaryColor = colorBlue;
        blueRadius = radius + 150;
        yellowRadius = radius - 150;
    }

    // Add information about the arc of the segment. This information will be used to draw the
    // centerline arc, the right boundary arc and the left boundary arc.
    potentialPathSegment.arc = {
        center: arcCenterPoint,
        angles: angles,
        radius: radius,
        insideBoundaryColor: insideBoundaryColor,
        outsideBoundaryColor: outsideBoundaryColor
    };

    // Draw potential blue cones first. Start by calculating the maximum distance between two
    // cones, based on the length of the arc. While the rules state that the maximum distance is
    // 5 meters, they also say it will in practice be smaller in tighter turns.
    let maxDist = 500;
    let blueArcLength = arcSpanRadians(angles) * blueRadius;
    if (blueArcLength < 300) {
        maxDist = 150;
    } else if (blueArcLength < 1500) {
        maxDist = 250;
    }

    // Calculate the number of blue cones that we have to draw based on the length of the arc and
    // the maximum distance between the cones.
    let numBlueCones = Math.ceil(blueArcLength / maxDist);
    // Divide the arc span by the number of cones to get the angle between two cones.
    let angleBetweenBlueCones = arcSpanRadians(angles) / numBlueCones;

    // This is just to get the correct behaviour in the for loop that calculates cone positions. If
    // we're drawing a right turn, we have to decrement the angle between points but if we're
    // drawing a left turn, we need to increment it. It's just because of how PIXI defines angles.
    if (whichSideOfLine(tangentLine, mousePoint) == pointOnRight) {
        angleBetweenBlueCones = -angleBetweenBlueCones;
    }

    // Calculate the positions of the potential blue cones, starting at the end of the segment and
    // moving backwards towards the start of the path segment. Clear the array before we proceed.
    potentialPathSegment.blueCones = [];
    for (i = 0; i < numBlueCones; i++) {
        // Don't draw the first cone if we snapped to the endOfTrack.
        if (snappedToEnd && i == 0) {
            continue;
        }
        // Add the position of the cone to the array.
        potentialPathSegment.blueCones.push({
            x: arcCenterPoint.x + Math.cos(angles[1] + angleBetweenBlueCones * i) * blueRadius,
            y: arcCenterPoint.y + Math.sin(angles[1] + angleBetweenBlueCones * i) * blueRadius
        });
    }

    // After the potential blue cones, repeat the same process for the potential yellow cones.
    let yellowArcLength = arcSpanRadians(angles) * yellowRadius;
    maxDist = 500;
    if (yellowArcLength < 300) {
        maxDist = 150;
    } else if (yellowArcLength < 1500) {
        maxDist = 250;
    }

    // Calculate the number of yellow cones to draw and the angle between them.
    let numYellowCones = Math.ceil(yellowArcLength / maxDist);
    let angleBetweenYellowCones = arcSpanRadians(angles) / numYellowCones;
    // Flip the sign of the angle based on whether we are turning left or right, see explanation
    // for the blue cones.
    if (whichSideOfLine(tangentLine, mousePoint) == pointOnRight) {
        angleBetweenYellowCones = -angleBetweenYellowCones;
    }

    // Clear the array and calculate the positions of the potential yellow cones.
    potentialPathSegment.yellowCones = [];
    for (i = 0; i < numYellowCones; i++) {
        if (snappedToEnd && i == 0) {
            continue;
        }
        potentialPathSegment.yellowCones.push({
            x: arcCenterPoint.x + Math.cos(angles[1] + angleBetweenYellowCones * i) * yellowRadius,
            y: arcCenterPoint.y + Math.sin(angles[1] + angleBetweenYellowCones * i) * yellowRadius
        });
    }

    // The last thing we need to prepare is the tangent line of the path segment. This is a line
    // tangent to the center line arc that goes through the end point of the segment (where the
    // mouse is pointing). This line is used when drawing the next potentialPathSegment after this
    // one.
    let nextTangentLine = perpendicularThroughPoint(
        lineBetweenPoints(arcCenterPoint, mousePoint),
        mousePoint
    );
    // We need the tangent line to be "pointing in the right direction" for the function
    // whichSideOfLine to be accurate going forward. If the center of the arc is not on the same
    // side of the current tangentLine and the nextTangentLine, the flip the direction of the
    // nextTangentLine.
    if (whichSideOfLine(tangentLine, arcCenterPoint) !=
        whichSideOfLine(nextTangentLine, arcCenterPoint)) {
        nextTangentLine = flipLineDirection(nextTangentLine);
    }
    // Save the nextTangentLine with the potentialPathSegment.
    potentialPathSegment.tangentLine = nextTangentLine;

    return potentialPathSegment;
}

/**
 * Draw the cones stored with the pathSegments that the user placed down so far and the ones of the
 * potentialPathSegment. potentialPathSegment can be null, as can the blueCones and yellowCones
 * array inside of it.
 */
function drawCones(potentialPathSegment) {

    conesGraphics.clear();

    // Draw cones of the segments that were already placed.
    for (j = 0; j < cones.blue.length; j++) {
        let conePosition = cones.blue[j];
        drawCone(conePosition.x, conePosition.y, colorBlue, scaledConeRadius);
    }
    for (j = 0; j < cones.yellow.length; j++) {
        let conePosition = cones.yellow[j];
        drawCone(conePosition.x, conePosition.y, colorYellow, scaledConeRadius);
    }

    // Draw the cones of the potentialPathSegment.
    if (potentialPathSegment != null) {
        if (potentialPathSegment.blueCones != null) {
            for (i = 0; i < potentialPathSegment.blueCones.length; i++) {
                let conePosition = potentialPathSegment.blueCones[i];
                drawCone(conePosition.x, conePosition.y, colorBlue, scaledConeRadius);
            }
        }
        if (potentialPathSegment.yellowCones != null) {
            for (i = 0; i < potentialPathSegment.yellowCones.length; i++) {
                let conePosition = potentialPathSegment.yellowCones[i];
                drawCone(conePosition.x, conePosition.y, colorYellow, scaledConeRadius);
            }
        }
    }
}

/**
 * Draw an individual cone at position (x, y) of a certain color and certin diameter.
 */
function drawCone(x, y, color, diameter) {
    conesGraphics.beginFill(color);
    conesGraphics.lineStyle({ width: 2, color: color, alpha: 1 });
    conesGraphics.drawCircle(x, y, diameter);
    conesGraphics.endFill();
}

/**
 * Draw the center line, left and right boundary arcs of all of the segments that the user placed
 * down so far and those of the potentialPathSegment. potentialPathSegment can be null.
 */
function drawArcs(pathSegments, potentialPathSegment) {

    arcsGraphics.clear();

    for (i = 0; i < pathSegments.length; i++) {
        if (pathSegments[i].arc != null) {
            drawArc(pathSegments[i]);
        }
    }

    if (potentialPathSegment != null) {
        if (potentialPathSegment.arc != null) {
            drawArc(potentialPathSegment);
        }
    }
}

/**
 * Draw the center line, left and right boundary arcs of a single path segment.
 */
function drawArc(pathSegment) {

    let arc = pathSegment.arc;

    // If the path segment is invalid, draw the center line arc wiht a red color, otherwise it is 
    // green.
    let arcColor = colorGreen;
    if (pathSegment.invalid) {
        arcColor = colorRed;
    }

    // Draw the centerline arc.
    arcsGraphics.moveTo(
        arc.center.x + Math.cos(arc.angles[0]) * (arc.radius),
        arc.center.y + Math.sin(arc.angles[0]) * (arc.radius)
    );
    arcsGraphics.lineStyle({ width: scaledLineWidth, color: arcColor, alpha: 1 });
    arcsGraphics.arc(arc.center.x, arc.center.y, arc.radius, arc.angles[0], arc.angles[1],
        arc.angles[2]);

    // The arc that we just drew is the center line of the track. We want to draw the left and right
    // boundary as well. We can do this simply by redrawing the arc and just increasing or
    // decreasing the radius.

    // Draw the inside boundary. First move to the start of the arc.
    arcsGraphics.moveTo(
        arc.center.x + Math.cos(arc.angles[0]) * (arc.radius - 150),
        arc.center.y + Math.sin(arc.angles[0]) * (arc.radius - 150)
    );
    // Then draw the actual arc.
    arcsGraphics.lineStyle({ width: scaledLineWidth, color: arc.insideBoundaryColor, alpha: 1 });
    arcsGraphics.arc(arc.center.x, arc.center.y, arc.radius - 150, arc.angles[0], arc.angles[1],
        arc.angles[2]);

    // Draw the outside boundary. First move to the start of the arc.
    arcsGraphics.moveTo(
        arc.center.x + Math.cos(arc.angles[0]) * (arc.radius + 150),
        arc.center.y + Math.sin(arc.angles[0]) * (arc.radius + 150)
    );
    // Then draw the actual arc.
    arcsGraphics.lineStyle({ width: scaledLineWidth, color: arc.outsideBoundaryColor, alpha: 1 });
    arcsGraphics.arc(arc.center.x, arc.center.y, arc.radius + 150, arc.angles[0], arc.angles[1],
        arc.angles[2]);
}

/**
 * Calculate the parameters of a line passing through the two input points.
 */
function lineBetweenPoints(point1, point2) {
    let m = (point2.y - point1.y) / (point2.x - point1.x);
    return { a: m, b: -1, c: m * point1.x - point1.y };
}

/**
 * Calculate the parameters of a line perpendicular to 'line' and passing through point 'point'.
 */
function perpendicularThroughPoint(line, point) {
    return { a: line.b, b: -line.a, c: line.b * point.x - line.a * point.y };
}

/**
 * Calculate the parameters of a line parallel to 'line' and passing through point 'point'.
 */
function parallelLineThroughPoint(line, point) {
    return { a: line.a, b: line.b, c: line.a * point.x + line.b * point.y };
}

/**
 * Calculat the coordinates of a point that lies in the center of a line connecting point1 and
 * point2.
 */
function centerPointBewteenTwoPoints(point1, point2) {
    return { x: point1.x + (point2.x - point1.x) / 2, y: point1.y + (point2.y - point1.y) / 2 };
}

/**
 * For a point (u, v) and 2D line defined by ax + by = c, the value c - (au + bv) will be negative
 * for points (u, v) on one side of the line and positive for points on the other side of the line.
 * 
 * For a given point, if this value is positive for line L, it will be negative for line
 * flipLineDirection(L).
 */
function flipLineDirection(line) {
    return { a: -line.a, b: -line.b, c: -line.c };
}

/**
 * Calculate the span of the arc in terms of degrees. The angles are measured from 0 to 2 * PI
 * starting at the 3 o'clock position and increasing clockwise.
 */
function arcSpanRadians(arc) {
    startAngle = arc[0];
    endAngle = arc[1];
    counterClockwise = arc[2];
    let diff = Math.abs(startAngle - endAngle);
    if (counterClockwise) {
        if (endAngle > startAngle) {
            return 2 * Math.PI - diff;
        } else {
            return diff;
        }
    } else {
        if (endAngle > startAngle) {
            return diff;
        } else {
            return 2 * Math.PI - diff;
        }
    }
}

/**
 * Calculate the intersection of two lines.
 */
function intersection(line1, line2) {
    let x = (line2.b * line1.c - line1.b * line2.c) / (line1.a * line2.b - line2.a * line1.b);
    let y = (line2.c - line2.a * x) / line2.b;
    return { x: x, y: y };
}

/**
 * Calculate if a point is to the left or right of a line.
 * 
 * To find the direction of the line, calculate two points: one where x = 0 and one where x = 1.
 * The direction runs from the point (x = 0) to point (x = 1).
 */
function whichSideOfLine(line, point) {
    let d = line.c - (line.a * point.x + line.b * point.y);
    if (d < 0) {
        return pointOnRight;
    } else if (d > 0) {
        return pointOnLeft;
    }
    return pointOnLine;
}

/**
 * Calculate the angle between the horizontal line and a line passing through centerPoint an
 * the targetPoint. The returned value is in radians.
 */
function angle(centerPoint, targetPoint) {
    let d = Math.abs(centerPoint.y - targetPoint.y);
    let r = Math.sqrt(Math.pow(centerPoint.x - targetPoint.x, 2) + Math.pow(centerPoint.y - targetPoint.y, 2));
    let baseAngle = Math.asin(d / r);
    if (centerPoint.y <= targetPoint.y) {
        if (centerPoint.x <= targetPoint.x) {
            // First quadrant
            return baseAngle;
        } else {
            // Second quadrant
            return Math.PI - baseAngle;
        }
    } else {
        if (centerPoint.x <= targetPoint.x) {
            // Fourth quadrant
            return 2 * Math.PI - baseAngle;
        } else {
            // Third quadrant
            return Math.PI + baseAngle;
        }
    }
}

/**
 * Calculate the start and end angle of an arc as well as the direction (clockwise or
 * counter-clockwise). The center of the arc is in centerPoint. The start of the arc is in
 * startPoint and it should be tangent to tangentLine in this point. The end of the arc is in
 * mousePoint.
 */
function getArcAngles(tangentLine, startPoint, centerPoint, mousePoint) {
    // The direction of the arc depends on whether the mouse is to the 'left' or 'right' of the
    // tangent line.
    let counterClockwise = true;
    if (whichSideOfLine(tangentLine, mousePoint) == pointOnRight) {
        counterClockwise = false;
    }
    // The start and end angles can be calculated using just the points.
    let startAngle = angle(centerPoint, startPoint);
    let endAngle = angle(centerPoint, mousePoint);
    return [startAngle, endAngle, counterClockwise];
}

/**
 * Determine if the mouse pointer is outside of the stage.
 */
function pointerOutsideStage(pointerPos) {
    if (pointerPos.x < 0 || pointerPos.y < 0) {
        return true;
    }
    if (pointerPos.x > app.screen.width || pointerPos.y > app.screen.height) {
        return true;
    }
    return false;
}

/**
 * Calculate the distance between two points.
 */
function distanceBetweenPoints(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

const holdingMouseButton = 0;
const clickedMouseButton = 1;
let mouseButtonPressedLastTick = false;
var prevMousePosition = { x: -999999, y: -999999 };
let mouseMovedAtAnyPoint = false;
let panningDif = null;
/**
 * This function determines the mouse pointer position in the coordinates of the stage. It also
 * figures out if the user clicked the mouse or held and dragged it.
 */
function getMouseButtonInput() {

    // Get the position of the mouse pointer on the stage.
    let mousePointerPosition = app.renderer.plugins.interaction.mouse.global;

    // Determine if the mouse pointer moved since the last time this function was called.
    let mouseMoved = false;
    if (prevMousePosition.x != mousePointerPosition.x || prevMousePosition.y != mousePointerPosition.y) {
        mouseMoved = true;
        // If the mouse moved, we need to trigger a redraw if we are actively drawing.
        needToRedraw = activelyDrawing;
    }
    prevMousePosition.x = mousePointerPosition.x;
    prevMousePosition.y = mousePointerPosition.y;
    mouseMovedAtAnyPoint |= mouseMoved;

    // Check if the user is pressing the button this tick.
    let mouseButtonPressed = app.renderer.plugins.interaction.mouse.buttons;
    // If the mouse button is pressed, the user might be dragging the grid around to pan, or they
    // might have clicked to place the next path segment.
    if (mouseButtonPressed) {

        // Check if the mouse button was not pressed in the last tick, which means that the user
        // just pressed it.
        if (!mouseButtonPressedLastTick) {

            mouseMovedAtAnyPoint = false;

            // If they clicked somewhere outside of the stage, we don't care. Don't do anything
            // else.
            if (pointerOutsideStage(mousePointerPosition)) {
                return {
                    buttonAction: null,
                    mousePointerPosition: mousePointerPosition,
                    panningDif: null
                };
            }

            // Otherwise, remember the offset between the worldContainer origin and the mouse
            // pointer, which we might need if the user moves the grid.
            panningDif = {
                x: worldContainer.x - mousePointerPosition.x,
                y: worldContainer.y - mousePointerPosition.y
            };

            // Register that the mouse button was pressed in the last tick.
            mouseButtonPressedLastTick = true;
        }

        return {
            buttonAction: holdingMouseButton,
            mousePointerPosition: mousePointerPosition,
            panningDif: panningDif
        };
    } else {

        // The mouse button is not pressed. If it was also not pressed in the last tick, we don't
        // care and we do nothing. If the button was pressed in the last tick, it means that the
        // user just released it.
        if (mouseButtonPressedLastTick) {
            mouseButtonPressedLastTick = false;
            // A release of the mouse button only represents a click if the user did not move the
            // mouse.
            if (!mouseMovedAtAnyPoint) {
                return {
                    buttonAction: clickedMouseButton,
                    mousePointerPosition: mousePointerPosition,
                    panningDif: null
                };
            }
        }
        // Remember that the mouse button was not pressed in this tick.
        mouseButtonPressedLastTick = false;
    }
    return {
        buttonAction: null,
        mousePointerPosition: mousePointerPosition,
        panningDif: null
    };
}

/**
 * Calculate the coordinates of the mouse pointer in the scaled and translated coorinate system of
 * the grid.
 */
function getMousePointInGrid(mousePointerPosition) {
    let gridMouseX = (mousePointerPosition.x - worldContainer.position.x) / worldContainer.scale._x;
    let gridMouseY = (mousePointerPosition.y - worldContainer.position.y) / worldContainer.scale._y;
    return { x: gridMouseX, y: gridMouseY };
}

/**
 * When the user presses Ctrl+z, delete the last segment in the pathSegments array. If the user
 * did this after they finished drawing, we want to enable drawing once again.
 */
function KeyPress(e) {
    var evtobj = e;
    if (evtobj.keyCode == 90 && evtobj.ctrlKey) {
        undo();
    }
}
document.onkeydown = KeyPress;

/**
 * The user pressed Ctrl+Z or clicked on the undo button. Remove the last path segment.
 */
function undo() {
    // Don't remove the first path segment.
    if (pathSegments.length > 1) {
        // Remove the lastPathSegment from the pathSegments array.
        let lastPathSegment = pathSegments.pop();
        // Remove the cones belonging to the lastPathSegment from the arrays in cones.
        cones.blue.splice(-lastPathSegment.blueCones.length);
        cones.yellow.splice(-lastPathSegment.yellowCones.length);
    }
    // If the user undid the last path segment after completing the circuit, we need to start
    // actively drawing again.
    if (!activelyDrawing) {
        activelyDrawing = true;
    }
    // We always need to redraw the track after an undo.
    needToRedraw = true;
}

/**
 * Remove all path segments except for the first one.
 */
function clearTrack() {
    // Confirm the action with a dialogue box.
    let confirmClear = confirm("Clear the track? This action cannot be undone.");
    if (confirmClear) {
        // Remove all path segments except for the first one. Remove all cones from the noisy cones
        // arrays. We always actively draw after clearing the track.
        pathSegments.splice(1, pathSegments.length - 1);
        cones.blue = [];
        cones.yellow = [];
        activelyDrawing = true;
        needToRedraw = true;
    }
}

/**
 * This function takes the cone positions from the path segments and then either copies them
 * directly into cones or applies some noise before doing so.
 */
let drawNoisyCones = false;
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

    // We always need to redraw after toggling noisy cones.
    needToRedraw = true;

    // Clear the noisyCones array
    cones.blue = [];
    cones.yellow = [];
    // Toggle drawNoisyCones
    drawNoisyCones = !drawNoisyCones;

    // Go over all of the segments.
    for (i = 0; i < pathSegments.length; i++) {

        // Get and array of points representing the blue cones of the segment.
        let blueCones = pathSegments[i].blueCones;
        for (j = 0; j < blueCones.length; j++) {
            // For each cone, if we need to draw noisy cones, apply noise and add it to cones.
            // Never apply noise to the cones of the first segment.
            if (drawNoisyCones && i != 0) {
                cones.blue.push(addNoiseToPoint(blueCones[j]));
            } else {
                cones.blue.push(blueCones[j]);
            }
        }

        // Same as for blue cones.
        let yellowCones = pathSegments[i].yellowCones;
        for (j = 0; j < yellowCones.length; j++) {
            if (drawNoisyCones && i != 0) {
                cones.yellow.push(addNoiseToPoint(yellowCones[j]));
            } else {
                cones.blue.push(yellowCones[j]);
            }

        }
    }
}

// Applies noise in the range of [-noiseBase, noiseBase] to the x and y coordinates of the point.
let noiseBase = 20;
function addNoiseToPoint(point) {
    let factorX = Math.floor(Math.random() * 2) - 1;
    let noiseX = point.x + noiseBase * factorX;
    let factorY = Math.floor(Math.random() * 2) - 1;
    let noiseY = point.y + noiseBase * factorY;
    return { x: noiseX, y: noiseY };
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
    console.log("Angle: ", angle);
    let rightCircleCenter = { x: rightRadius - 150, y: - startStraight - Math.sin(angle) * rightRadius };
    cones.yellow.push(rightCircleCenter);
    console.log(rightCircleCenter);

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