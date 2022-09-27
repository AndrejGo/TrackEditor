class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    // Create a copy of this object.
    copy() {
        return new Point(this.x, this.y);
    }

    // Calculate the distance to another point.
    distanceTo(otherPoint) {
        return Math.sqrt(Math.pow(this.x - otherPoint.x, 2) + Math.pow(this.y - otherPoint.y, 2));
    }

    // Calculate the point "in the middle" between this point and another point.
    centerTo(otherPoint) {
        return { x: this.x + (otherPoint.x - this.x) / 2, y: this.y + (otherPoint.y - this.y) / 2 };
    }

    // Calculate the parameters of a line passing between this point and another point.
    lineTo(otherPoint) {
        let m = (otherPoint.y - this.y) / (otherPoint.x - this.x);
        //return { a: m, b: -1, c: m * point1.x - point1.y };
        return new Line(m, -1, m * this.x - this.y);
    }

    /**
     * Calculate if a point is to the left or right of a line.
     * 
     * Our definition of line direction:
     * Calculate two points - one where x = 0 and one where x = 1. The line runs from the point
     * where (x = 0) to the point where (x = 1).
     */
    rightOf(line) {
        let d = line.c - (line.a * this.x + line.b * this.y);
        if (d < 0) {
            return true;
        } else if (d > 0) {
            return false;
        }
        return null; // Returning null means the point is on the line.
    }

    equalTo(point) {
        return this.x == point.x && this.y == point.y;
    }
}

class Line {
    constructor(a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    static vertical = new Line(1, 0, 0);
    static horizontal = new Line(0, 1, 0);

    // Calculate the slope of the line (the value k if the line is in the form y = kx + m). If
    // b is 0, then the slope cannot be calculated and we return the largest possible number as an
    // error value.
    #slope() {
        if (this.b == 0) {
            return Number.MAX_VALUE;
        }
        return -this.a / this.b;
    }

    // Determine if this line is parallel to another line.
    #parallelTo(otherLine) {
        if (otherLine.b == 0) {
            return this.b == 0;
        } else if (this.b == 0) {
            return otherLine.b == 0;
        }
        return this.#slope() == otherLine.#slope();
    }

    // Calculate the intersection between this line and another line. Return null if the lines are
    // parallel.
    intersectionWith(otherLine) {
        if (this.#parallelTo(otherLine)) {
            return null;
        }
        let x = (otherLine.b * this.c - this.b * otherLine.c) /
            (this.a * otherLine.b - otherLine.a * this.b);
        let y = (otherLine.c - otherLine.a * x) / otherLine.b;
        return new Point(x, y);
    }

    // Calculate the line that is perpendicular to this one and passes through the given point.
    perpendicularThrough(point) {
        return new Line(this.b, -this.a, this.b * point.x - this.a * point.y)
    }

    // Calculate the line that is parallel to this one and passes through the given point.
    parallelThrough(point) {
        return new Line(this.a, this.b, this.a * point.x + this.b * point.y);
    }

    /**
     * For a point (u, v) and 2D line defined by ax + by = c, the value c - (au + bv) will be
     * negative for points (u, v) on one side of the line and positive for points on the other side
     * of the line.
     * For a given point, if this value is positive for line L, it will be negative for line
     * L.flipDirection().
     */
    flipDirection() {
        this.a = -this.a;
        this.b = -this.b;
        this.c = -this.c;
    }

    // Calculate the angle between this line and another line
    angleWith(otherLine) {
        return Math.atan(
            (otherLine.a * this.b - this.a * otherLine.b) /
            (this.a * otherLine.a + this.b * otherLine.b)
        );
    }
}

class Arc {

    constructor(center, radius, startAngle, endAngle, anticlockwise, color, endTangentLine,
        endPoint, width) {
        this.center = center;
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.anticlockwise = anticlockwise;
        this.color = color;
        this.endTangentLine = endTangentLine;
        this.endPoint = endPoint;
        this.width = width;
    }

    copy() {
        return new Arc(this.center, this.radius, this.startAngle, this.endAngle,
            this.anticlockwise, this.color, this.endTangentLine, this.endPoint, this.width);
    }

    /**
     * Construct an arc that starts in startPoint, ends in endPoint and is tangent to tangentLine in
     * startPoint.
     */
    calculateArc(startPoint, endPoint, tangentLine) {

        this.width = Arc.width;
        this.endPoint = endPoint;

        // This is to prevent a bug where the center of the arc could not be calculated.
        if (startPoint.x == endPoint.x) {
            endPoint.x++;
        }
        if (startPoint.y == endPoint.y) {
            endPoint.y++;
        }

        // When we eventually draw the arc, we will need to specify the center point of the arc, the
        // radius and a triple of:
        //     - start angle
        //     - end angle
        //     - clockwise or anticlockwise direction
        //
        // We need to calculate all of these values based on the points where the arc should start and
        // end. We need to make sure that the arc is tangent to the tangent line in its starting point.

        // Calculate the center point of the line between the start point and the end point.
        let centerPoint = startPoint.centerTo(endPoint);

        // Calculate the coefficients of the line that is perpendicular to the line connecting the
        // start point and the end point and which passes through the centerP point. Points on this line
        // have the same distance to the start point and the end point, so the center of the arc that
        // we are drawing needs to be somewhere on this line.
        let connectingLine = startPoint.lineTo(endPoint);
        let centerLine = connectingLine.perpendicularThrough(centerPoint);

        // Calculate the line that passes through the start point and is perpendicular to the
        // tangentLine. The center of the new arc must be on this line as well.
        let perpendicularLine = tangentLine.perpendicularThrough(startPoint);

        // The intersection of the center line and the perpendicular line is the center of the arc.
        this.center = centerLine.intersectionWith(perpendicularLine);

        // Calculate the radius of the arc.
        this.radius = this.center.distanceTo(startPoint);

        // Get an array [startAngle, endAngle, anticlockwise] that specifies the start and end angle
        // of the arc. Zero is at the 3 o'clock position and the angle increases from there in a
        // clockwise direction. The directionBoolean specifies if the arc is to be drawn in the
        // clockwise (false) or anti-clockwise (true) direction.
        this.#setArcAngles(startPoint, endPoint, tangentLine);

        this.endTangentLine = this.center.lineTo(endPoint).perpendicularThrough(endPoint);
        if (this.center.rightOf(tangentLine) != this.center.rightOf(this.endTangentLine)) {
            this.endTangentLine.flipDirection();
        }

        this.color = Arc.green;
        if (this.radius < 160 || this.angle() * this.radius < 150) {
            this.color = Arc.red;
        }
    }

    static width = 5;
    static green = 0x08d10c;
    static red = 0xde2f2f;
    static yellow = 0xe9e923;
    static blue = 0x1a52ff;

    #setArcAngles(startPoint, endPoint, tangentLine) {
        // The direction of the arc depends on whether the mouse is to the 'left' or 'right' of the
        // tangent line.
        this.anticlockwise = true;
        if (endPoint.rightOf(tangentLine)) {
            this.anticlockwise = false;
        }
        this.startAngle = this.#angleFrom3oClock(startPoint);
        this.endAngle = this.#angleFrom3oClock(endPoint);
    }

    /**
     * This method calculates the angle between the horizontal line and the line that goes from
     * this.center to point. Measuring starts at the 3 o'clock position in the clockwise direction.
     */
    #angleFrom3oClock(point) {
        let yDiff = Math.abs(this.center.y - point.y);
        if (point.y >= this.center.y) {
            if (point.x >= this.center.x) {
                // 1st quadrant
                return Math.asin(yDiff / this.radius);
            } else {
                // 2nd quadrant
                return Math.PI - Math.asin(yDiff / this.radius);
            }
        } else {
            if (point.x <= this.center.x) {
                // 3rd quadrant
                return Math.PI + Math.asin(yDiff / this.radius);
            } else {
                // 4th quadrant
                return 2 * Math.PI - Math.asin(yDiff / this.radius);
            }
        }
    }

    // Calculate the angle of the arc based on the start angle, the end angle and the direciton.
    angle() {
        let diff = Math.abs(this.startAngle - this.endAngle);
        if (this.anticlockwise) {
            if (this.endAngle > this.startAngle) {
                return 2 * Math.PI - diff;
            } else {
                return diff;
            }
        } else {
            if (this.endAngle > this.startAngle) {
                return diff;
            } else {
                return 2 * Math.PI - diff;
            }
        }
    }

    length() {
        return this.angle() * this.radius;
    }

    rightBoundary() {
        let a = this.copy();
        if (a.anticlockwise) {
            a.radius += 150;
        } else {
            a.radius -= 150;
        }
        a.color = Arc.yellow;
        return a;
    }

    leftBoundary() {
        let a = this.copy();
        if (a.anticlockwise) {
            a.radius -= 150;
        } else {
            a.radius += 150;
        }
        a.color = Arc.blue;
        return a;
    }

    draw(graphicsObject, scalingFactor) {
        graphicsObject.moveTo(
            this.center.x + Math.cos(this.startAngle) * (this.radius),
            this.center.y + Math.sin(this.startAngle) * (this.radius)
        );
        graphicsObject.lineStyle({ width: this.width / scalingFactor, color: this.color, alpha: 1 });
        graphicsObject.arc(this.center.x, this.center.y, this.radius, this.startAngle, this.endAngle,
            this.anticlockwise);
    }
}