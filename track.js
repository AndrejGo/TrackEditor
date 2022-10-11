// A track is an array of PathSegments.
class Track {

    /*
        Create a new track. Each track has an initial segment around the start and finish line.
        One end of the segment is the point where the user will start drawing the track and the
        other is where the user will end drawing the track. The initialDirection variable represents
        a tangent line to the first path segment.
    */
    constructor(start, end, initialDirection) {
        this.start = start;
        this.end = end;
        this.initialDirection = initialDirection;
        this.segments = [];
        this.potentialSegment = new PathSegment();
        this.activelyDrawing = true;
        this.noisyCones = false;

        // Add two yellow, two blue and 4 orange cones.
        this.initialCones = [];
        this.initialCones.push(new Cone(new Point(-150, -100), Cone.blue, Cone.small));
        this.initialCones.push(new Cone(new Point(-150, 100), Cone.blue, Cone.small));
        this.initialCones.push(new Cone(new Point(150, -100), Cone.yellow, Cone.small));
        this.initialCones.push(new Cone(new Point(150, 100), Cone.yellow, Cone.small));
        this.initialCones.push(new Cone(new Point(-150, -30), Cone.orange, Cone.large));
        this.initialCones.push(new Cone(new Point(-150, 30), Cone.orange, Cone.large));
        this.initialCones.push(new Cone(new Point(150, -30), Cone.orange, Cone.large));
        this.initialCones.push(new Cone(new Point(150, 30), Cone.orange, Cone.large));
    }

    /*
     * The track object maintains a potentialSegment that will be placed down when the user clicks.
     * This function updates this path segment according to the position of the mouse.
     */
    updatePotentialSegment(mousePoint) {

        // Determine the start point and tangent. Take the initial values to start.
        let tangentLine = this.initialDirection;
        let start = this.start;
        // If the user already placed some path segments, take the last one and update the start
        // point and tangent line.
        if (this.segments.length > 0) {
            let prevCenterLineArc = this.segments[this.segments.length - 1].centerLineArc;
            tangentLine = prevCenterLineArc.endTangentLine;
            start = prevCenterLineArc.endPoint;
        }

        // Determine whether the user is finishing the track. We need this information because in
        // that case the potential segment will contain 2 less cones at it's end.
        let finishingTrack = mousePoint.equalTo(t.end);

        // Update the potential segment.
        this.potentialSegment.update(start, mousePoint, tangentLine, finishingTrack);
    }

    /*
     * Draw the path segments the user already placed.
     */
    drawPlacedSegments(graphicsObject, scalingFactor) {
        // Clear any previously drawn elements.
        graphicsObject.clear();
        // Draw each placed segment.
        this.segments.forEach((segment) => {
            segment.draw(graphicsObject, scalingFactor, this.noisyCones);
        });
        // Also draw the cones around the initial track segment.
        this.initialCones.forEach((cone) => {
            cone.draw(graphicsObject, scalingFactor, false);
        });
    }

    /*
     * Place the potential path segment by adding it to the array of segments and create a new
     * path object in it's place.
     */
    placePotentialSegment() {
        this.segments.push(this.potentialSegment);
        this.potentialSegment = new PathSegment();
    }

    /*
     * Draw a circle around the end of the track, prompting the user to finish the track. The
     * circle looks like a bullseye.
     */
    drawFinishPrompt(graphicsObject) {
        graphicsObject.beginFill(0xcc0066, 0.7);
        graphicsObject.lineStyle({ width: 0, color: 0xcc0066, alpha: 1 });
        graphicsObject.drawCircle(t.end.x, t.end.y, 20);
        graphicsObject.beginFill(0xcc0066, 0.2);
        graphicsObject.lineStyle({ width: 3, color: 0xcc0066, alpha: 1 });
        graphicsObject.drawCircle(t.end.x, t.end.y, 50);
        graphicsObject.endFill();
    }

    /**
     * Apply or remove noise from the cone positions. The original, "clean" mathematical position
     * is always saved as a reference along with the noisy position so that we can go back.
     */
    toggleNoisyCones(W) {
        this.noisyCones = !this.noisyCones;
        W.needToRedraw = true;

        if (this.noisyCones) {
            // Just call applyNoise() of each cone of each segment.
            this.segments.forEach((segment) => {
                segment.cones.forEach((cone) => {
                    cone.applyNoise();
                });
            });
        } else {
            // Just call removeNoise() of each cone of each segment.
            this.segments.forEach((segment) => {
                segment.cones.forEach((cone) => {
                    cone.removeNoise();
                });
            });
        }
    }

    /**
     * This method removes the last placed path segment from the track.
     */
    undo(W) {
        this.segments.pop();
        // If the user undid the last path segment after completing the circuit, we need to start
        // actively drawing again.
        if (!this.activelyDrawing) {
            this.activelyDrawing = true;
        }
        // We need to redraw the track after each undo to remove the element we deleted.
        W.needToRedraw = true;
    }
}