// A PathSegment object combines an Arc and an array of Cone objects.
class PathSegment {

    constructor(centerLineArc, rightBoundaryArc, leftBoundaryArc, cones) {
        this.centerLineArc = centerLineArc;
        this.rightBoundaryArc = rightBoundaryArc;
        this.leftBoundaryArc = leftBoundaryArc;
        this.cones = cones;
    }

    /**
     * Update the path segment to conform to the requirement that its arc starts in startPoint
     * where it is tangential to tangentLine and ends in endPoint.
     * After calculating the center arc, calculate the left and right boundary and place cones
     * along them.
     */
    update(startPoint, endPoint, tangentLine, finishingTrack) {
        this.centerLineArc = new Arc();
        this.centerLineArc.calculateArc(startPoint, endPoint, tangentLine);
        this.rightBoundaryArc = this.centerLineArc.rightBoundary();
        this.leftBoundaryArc = this.centerLineArc.leftBoundary();
        this.placeCones(finishingTrack);
    }

    placeCones(finishingTrack) {
        this.cones = [];
        this.#placeConesAlongArc(this.rightBoundaryArc, finishingTrack);
        this.#placeConesAlongArc(this.leftBoundaryArc, finishingTrack);
    }

    /**
     * This function takes an arc and calculates the coordinate points of cones that should be
     * placed along it. The only hard requirement is a maximum distance between cones of 500
     * centimeters. We don't measure straigt distance but distance along the curve just to make
     * our lives easier.
     * The rules also state that this distance decreases in tight corners. The reuction is based
     * on both the radius and arc angle. It's complicated and arbitrary but it seems to work quite
     * well.
     */
    static #maxDistBetweenCones = 500;
    #placeConesAlongArc(arc, finishingTrack) {

        let arcLength = arc.length();

        // Calculate the number of cones to place
        let numCones = Math.ceil(arcLength / PathSegment.#maxDistBetweenCones);

        // Increase the number of cones based on the radius and angle of the arc.
        if (arc.angle() > Math.PI / 4) {
            if (arcLength < 75) {
                numCones = 1;
            } else if (arcLength < 400) {
                numCones = 2;
            } else if (arcLength <= 1000) {
                numCones = 3;
            }
        }

        // Calculate the angle between two neighbouring cones.
        let angleBetweenCones = arc.angle() / numCones;
        // Flip the sign of the angle difference if the arc is not anticlockwise. This is just
        // needed because of how PIXI defines angles and how we calculate the coordinate points.
        if (!arc.anticlockwise) {
            angleBetweenCones = -angleBetweenCones;
        }

        // Determine the color of the cone by assuming it is blue and then correcting it to yellow
        // if needed.
        let color = Cone.blue;
        // If the arc runs in an anticlockwise direction (left turn) and the radius is larger than
        // the radius of the center line arc, then the boundary is on the right and should be
        // yellow.
        if (arc.anticlockwise && this.centerLineArc.radius < arc.radius) {
            color = Cone.yellow;
        }
        // Likewise, if the arc runs in a clockwise direction (right turn) and the radius is
        // smaller than the radius of the center line arc, the boundary is yellow.
        if (!arc.anticlockwise && this.centerLineArc.radius > arc.radius) {
            color = Cone.yellow;
        }

        // Calculate the positions of the cones, starting at the end of the arc and moving
        // backwards towards the start.
        for (var i = 0; i < numCones; i++) {
            // If we're finishing the track, don't place down the first cone since there's already
            // one at the finish line.
            if (finishingTrack && i == 0) {
                continue;
            }
            // Create a new cone object with the right color and radius and add it to the array of
            // cones belonging to the segment.
            this.cones.push(new Cone(new Point(
                arc.center.x + Math.cos(arc.endAngle + angleBetweenCones * i) * arc.radius,
                arc.center.y + Math.sin(arc.endAngle + angleBetweenCones * i) * arc.radius
            ), color, Cone.small));
        }
    }

    draw(graphicsObject, scalingFactor, noisyCones) {
        // Start by drawing each cone of the path segment.
        this.cones.forEach((cone) => { cone.draw(graphicsObject, scalingFactor, noisyCones) });
        // Draw the green centerline arc.
        if(this.centerLineArc != null) {
            this.centerLineArc.draw(graphicsObject, scalingFactor);
        }
        // Draw the right and left boundaries of the path segment.
        if(this.rightBoundaryArc != null) {
            this.rightBoundaryArc.draw(graphicsObject, scalingFactor);
        }
        if(this.leftBoundaryArc != null) {
            this.leftBoundaryArc.draw(graphicsObject, scalingFactor);
        }
    }
}