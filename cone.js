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

    applyNoise(noiseBase) {
        if (noiseBase == null) {
            noiseBase = Cone.#defaultNoiseBase;
        }
        this.position.x = this.referencePosition.x + Math.floor(noiseBase * (Math.random() * 2 - 1));
        this.position.y = this.referencePosition.y + Math.floor(noiseBase * (Math.random() * 2 - 1));
    }

    removeNoise() {
        this.position = this.referencePosition.copy();
    }

    draw(graphicsObject, scalingFactor) {
        graphicsObject.beginFill(this.color);
        graphicsObject.lineStyle({ width: 0, color: this.color, alpha: 1 });
        let cappedRadius = Math.min(this.radius / scalingFactor, 20);
        graphicsObject.drawCircle(this.position.x, this.position.y, cappedRadius);
        graphicsObject.endFill();
    }
}