class Cone {
    constructor(point, color, radius) {
        this.referencePosition = point.copy();
        this.position = point.copy();
        this.color = color;
        this.radius = radius;
    }

    static large = 20;
    static small = 10;
    static #defaultNoiseBase = 20;
    static blue = 0x1a52ff;
    static yellow = 0xe9e923;
    static orange = 0xff9f21;

    /**
     * Calculate a random position aroud the reference position. This position will always lie
     * in a circle with radius noiseBase around the reference position.
     */
    applyNoise(noiseBase) {
        if (noiseBase == null) {
            noiseBase = Cone.#defaultNoiseBase;
        }
        this.position.x = this.referencePosition.x + Math.floor(noiseBase * (Math.random() * 2 - 1));
        this.position.y = this.referencePosition.y + Math.floor(noiseBase * (Math.random() * 2 - 1));
    }

    /**
     * Restore the position from the reference position.
     */
    removeNoise() {
        this.position = this.referencePosition.copy();
    }

    /**
     * Draw the cone in the supplied graphicsObject.
     */
    draw(graphicsObject, scalingFactor) {
        // Set the color of the cone.
        graphicsObject.beginFill(this.color);
        // Set the radius of the border to 0 so that we don't draw it.
        graphicsObject.lineStyle({ width: 0, color: this.color, alpha: 1 });
        // Calculate the radius. If we just use this.radius / scalingFactor it doesn't look good
        // when zoomed all the way out - the cone is too small.
        let boundRadius = Math.min(this.radius / scalingFactor, 20);
        
        graphicsObject.drawCircle(this.position.x, this.position.y, boundRadius);
        graphicsObject.endFill();
    }
}