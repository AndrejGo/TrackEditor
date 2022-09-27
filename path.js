// A PathSegment object combines an Arc and an array of Cone objects.
class PathSegment {

    constructor(centerLineArc, rightBoundaryArc, leftBoundaryArc, cones) {
        this.centerLineArc = centerLineArc;
        this.rightBoundaryArc = rightBoundaryArc;
        this.leftBoundaryArc = leftBoundaryArc;
        this.cones = cones;
    }

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

    static #maxDistBetweenCones = 500;
    #placeConesAlongArc(arc, finishingTrack) {

        let arcLength = arc.length();

        // Calculate the number of cones to place
        let numCones = Math.ceil(arcLength / PathSegment.#maxDistBetweenCones);

        if (arc.angle() > Math.PI / 4) {
            if (arcLength < 75) {
                numCones = 1;
            } else if (arcLength < 400) {
                numCones = 2;
            } else if (arcLength <= 1000) {
                numCones = 3;
            }
        }

        // Calculate the angle between two cones.
        let angleBetweenCones = arc.angle() / numCones;

        // Fix the angle. This is just needed because of how PIXI defines angles.
        if (!arc.anticlockwise) {
            angleBetweenCones = -angleBetweenCones;
        }

        let color = Cone.blue;
        if (arc.anticlockwise && this.centerLineArc.radius < arc.radius) {
            color = Cone.yellow;
        }
        if (!arc.anticlockwise && this.centerLineArc.radius > arc.radius) {
            color = Cone.yellow;
        }

        // Calculate the positions of the cones, starting at the end of the arc and moving
        // backwards towards the start.
        for (var i = 0; i < numCones; i++) {
            if (finishingTrack && i == 0) {
                continue;
            }
            // Add the position of the cone to the array.
            this.cones.push(new Cone(new Point(
                arc.center.x + Math.cos(arc.endAngle + angleBetweenCones * i) * arc.radius,
                arc.center.y + Math.sin(arc.endAngle + angleBetweenCones * i) * arc.radius
            ), color, Cone.small));
        }
    }

    draw(graphicsObject, scalingFactor, noisyCones) {
        this.cones.forEach((cone) => { cone.draw(graphicsObject, scalingFactor, noisyCones) });
        this.centerLineArc.draw(graphicsObject, scalingFactor);
        this.rightBoundaryArc.draw(graphicsObject, scalingFactor);
        this.leftBoundaryArc.draw(graphicsObject, scalingFactor);
    }
}