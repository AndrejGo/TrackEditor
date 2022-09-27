// A track is an array of PathSegments.
class Track {
    constructor(start, end, initialDirection) {
        this.start = start;
        this.end = end;
        this.initialDirection = initialDirection;
        this.segments = [];
        this.potentialSegment = new PathSegment();
        this.activelyDrawing = true;
        this.noisyCones = false;

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

    updatePotentialSegment(mousePoint) {

        let tangentLine = this.initialDirection;
        let start = this.start;
        if (this.segments.length > 0) {
            let prevCenterLineArc = this.segments[this.segments.length - 1].centerLineArc;
            tangentLine = prevCenterLineArc.endTangentLine;
            start = prevCenterLineArc.endPoint;
        }

        let finishingTrack = mousePoint.equalTo(t.end);

        this.potentialSegment.update(start, mousePoint, tangentLine, finishingTrack);
    }

    drawPlacedSegments(graphicsObject, scalingFactor) {
        graphicsObject.clear();
        this.segments.forEach((segment) => {
            segment.draw(graphicsObject, scalingFactor, this.noisyCones);
        });
        this.initialCones.forEach((cone) => {
            cone.draw(graphicsObject, scalingFactor, false);
        });
    }

    placePotentialSegment() {
        this.segments.push(this.potentialSegment);
        this.potentialSegment = new PathSegment();
    }

    drawFinishPrompt(graphicsObject) {
        graphicsObject.beginFill(0xcc0066, 0.7);
        graphicsObject.lineStyle({ width: 0, color: 0xcc0066, alpha: 1 });
        graphicsObject.drawCircle(t.end.x, t.end.y, 20);
        graphicsObject.beginFill(0xcc0066, 0.2);
        graphicsObject.lineStyle({ width: 3, color: 0xcc0066, alpha: 1 });
        graphicsObject.drawCircle(t.end.x, t.end.y, 50);
        graphicsObject.endFill();
    }

    toggleNoisyCones(W) {
        this.noisyCones = !this.noisyCones;
        W.needToRedraw = true;

        if (this.noisyCones) {
            this.segments.forEach((segment) => {
                segment.cones.forEach((cone) => {
                    cone.applyNoise();
                });
            });
        } else {
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
        W.needToRedraw = true;
    }
}