/**
 * The World class wraps all of the various PIXI graphics objects that we draw to. It also contains
 * the methods that we use to pan and zoom the grid.
 */
class World {

    /**
     * Create the "world" by making a bunch of PIXI objects and adding them to the app.
     * 
     *     Container that will hold everything. This object will be translated and scaled when
     *     panning and zooming.
     *      |
     *      |--> placedGraphics: A graphics object that will be used to draw the "static" path
     *      |                    segments that the user placed down.
     *      |
     *      |--> wipGraphics: A graphics object that will be used to draw the "dynamic" path segment
     *      |                 that follows the mouse pointer. We use a separate graphics object to
     *      |                 avoid needlessly drawing object to the screen.
     *      |
     *      |--> gridGraphics: This graphics object will hold the grid lines and map boundary.
     *      |
     *      |--> finishPrompt: This graphics object will contain the circles that highlight the end
     *                         of the track when the user moves the mouse close to it.
     */
    constructor(app) {
        this.app = app;

        // Create a container to hold everything and add it to the stage.
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        // Create a graphics object that will hold the path segments that have been placed by the
        // user.
        this.placedGraphics = new PIXI.Graphics();
        this.container.addChild(this.placedGraphics);

        // Create a graphics object that will hold the path segment that the user is currently
        // working on.
        this.wipGraphics = new PIXI.Graphics();
        this.container.addChild(this.wipGraphics);

        // Create a graphics object that will hold the grid lines.
        this.gridGraphics = new PIXI.Graphics();
        this.container.addChild(this.gridGraphics);

        // Create a graphics object that will be used to draw the prompt to finish the track.
        this.finishPrompt = new PIXI.Graphics();
        this.container.addChild(this.finishPrompt);

        // The scaling factor is used by draw methods to keep the path segment a simmilar size on
        // the screen regardless of the zoom.
        this.scalingFactor = 1;

        // The needToRedraw boolean is set to true whenever placed path segments need to be
        // redrawn. We put it in this object because the mouse wheel handler method needs access to
        // it.
        this.needToRedraw = true;
    }

    static gridColor = 0x666666;
    static borderColor = 0x00ee00;

    // Draw the grid and register the mouse wheel handler method.
    setUp() {

        // Move the origin of the container to the center of the stage.
        this.container.position.x = this.app.screen.width / 2;
        this.container.position.y = this.app.screen.height / 2;

        // Draw a border around the available space to draw the track.
        this.gridGraphics.lineStyle({ width: 30, color: World.borderColor, alpha: 1 });
        this.gridGraphics.beginFill(0x000000, 0.01);
        this.gridGraphics.drawRect(-10000, -10000, 20000, 20000);
        this.gridGraphics.endFill();

        // Draw grid lines
        let x_pos = -10000;
        this.gridGraphics.lineStyle({ width: 2, color: World.gridColor, alpha: 1 });
        for (var i = x_pos; i <= 10000; i += 100) {
            this.gridGraphics.moveTo(i, -10000);
            this.gridGraphics.lineTo(i, 10000);
        }
        let y_pos = -10000;
        for (var i = y_pos; i <= 10000; i += 100) {
            this.gridGraphics.moveTo(-10000, i);
            this.gridGraphics.lineTo(10000, i);
        }

        /**
         * Zooming is a bit complicated, especially because PIXI doesn't support scroll events
         * natively. Register our own handler for the scroll event.
         */
        document.getElementById("canvas-wrapper").addEventListener("wheel", this);
    }

    /**
     * pan the entire grid according to the position of the mouse. mouseInput is calculated by the
     * getMouseInput() method of the UserInterface class.
     */
    pan(mouseInput) {
        // If the user is holding down the mouse button, we need to move the container along
        // with the mouse pointer to achieve panning. The panningDif value prevents the origin of
        // the world from jumping to the mouse pointer when the user presses the button.
        //
        // We bound the movement to a minimum of -9500 and maximum of 9500. Since the whole world
        // is 10000 x 10000 (at least the grid), this will always leave a bit of the world in the
        // stage. These values are multiplied by the current scale (which is always equal for the x
        // and y axis).
        this.container.x = Math.min(
            Math.max(
                mouseInput.position.x + mouseInput.panningDif.x,
                -9500 * this.container.scale._x
            ),
            9500 * this.container.scale._x + this.app.screen.width
        );
        this.container.y = Math.min(
            Math.max(
                mouseInput.position.y + mouseInput.panningDif.y,
                -9500 * this.container.scale._x
            ),
            9500 * this.container.scale._x + this.app.screen.height
        );
    }

    /**
     * This method handles the mouse wheel event to zoom the grid in and out.
     */
    handleEvent(e) {
        e.preventDefault();

        // When the user zooms, we need to redraw the placed path segments.
        this.needToRedraw = true;

        // We "zoom" by increasing or decreasing the scale factor of the container. We decrease
        // it by multiplying with 0.9 and increase it by multiplying it with 1/0.9. We choose the
        // right factor based on the direction (sign) of the scroll.
        let diff = 0.9;
        if (e.deltaY < 0) {
            diff = 1 / diff;
        }
        // We only use the scaling factor of the x axis to do the calculation since the factors for
        // x and y are always the same in our app.
        let newScalingFactor = this.container.scale._x * diff;

        // Bound the new scaling factor to a maximum of 2 and minimum of 0.1.
        this.scalingFactor = Math.max(Math.min(newScalingFactor, 2), 0.05);

        // If we only change the scaling factor of the container, the zoom would be centered on the
        // origin (the top left corner). We want it to be centered on the mouse pointer, so we need
        // to combine scaling with translation.

        // Get the position of the mouse in the coordinates of the div that contains the stage.
        let divRect = document.getElementById("canvas-wrapper").getBoundingClientRect();
        let divMouseX = e.pageX - divRect.left;
        let divMouseY = e.pageY - divRect.top;

        // Get the position of the mouse pointer in the (scaled and translated) coordinates of
        // container.
        let gridMouseX = (divMouseX - this.container.position.x) / this.container.scale._x;
        let gridMouseY = (divMouseY - this.container.position.y) / this.container.scale._y;

        // Apply the translation and scaling to achieve zooming centered on the mouse pointer.
        this.container.setTransform(
            -gridMouseX * this.scalingFactor + divMouseX,
            -gridMouseY * this.scalingFactor + divMouseY,
            this.scalingFactor,
            this.scalingFactor
        );
    }

    /**
     * The scaling factor is used when drawing arcs and cones so that they look good regardless of
     * the amount of zoom. However, when the grid is zoomed all the way in or all the way out the
     * elements look out of proportion. So we limit the maximum and minimum value to fix this.
     */
    boundScalingFactor() {
        return Math.min(Math.max(this.scalingFactor, 0.25), 1.5);
    }
}