/**
 * The UserInterface class handles the mouse and keyboard inputs.
 */
class UserInterface {

    constructor(app, worldContainer) {
        this.app = app;
        this.worldContainer = worldContainer;
        this.prevMouseButtonPressed = false;
        this.panningDif = { x: 0, y: 0 };
        this.mousePressLocation = new Point(0, 0);
        this.prevMousePosition = new Point(0, 0);
        this.moved = false;
        this.ctrlz = false;

        // Register a handler for the keydown event where we check if the user pressed Ctrl+z.
        document.addEventListener("keydown", (event) => {
            if (event.keyCode == 90 && event.ctrlKey) {
                this.ctrlz = true;
            }
        });
    }

    /**
     * This method determines if the user clicked or is holding down the mouse button. Along with
     * this, it also calculates some values that we need for panning and zooming to work like
     * the position of the mouse pointer in the grid.
     */
    getMouseInput() {

        // Get the position of the mouse on the stage.
        let mousePosition = new Point(
            this.app.renderer.plugins.interaction.mouse.global.x,
            this.app.renderer.plugins.interaction.mouse.global.y
        );

        // Determine if the mouse moved since the last time this method was called.
        if (mousePosition.x != this.prevMousePosition.x ||
            mousePosition.y != this.prevMousePosition.y) {
            this.moved = true;
        }
        this.prevMousePosition = mousePosition.copy();

        // Check if the user is pressing the left mouse button.
        let mouseButtonPressed = this.app.renderer.plugins.interaction.mouse.buttons == 1;

        // If the mouse button is pressed, the user might be dragging the grid around to pan, or
        // they might have clicked to place the next path segment. Here we figure out which of the
        // two actions is happening.
        if (mouseButtonPressed) {

            // Check if the mouse button was not pressed the last time the method was called, which
            // means that the user just pressed it.
            if (!this.prevMouseButtonPressed) {

                // If the user clicked somewhere outside of the stage, we don't care. Return an
                // object with the hold and click properties set to false.
                if (this.#mouseOutsideStage(mousePosition)) {
                    return {
                        hold: false,
                        click: false,
                        panningDif: this.panningDif,
                        position: mousePosition,
                        positionInGrid: this.#getMousePointInGrid(mousePosition),
                        moved: this.moved
                    };
                }

                // Register that the mouse button was pressed.
                this.prevMouseButtonPressed = true;

                // Remember the position at which the button was pressed.
                this.mousePressLocation.x = mousePosition.x;
                this.mousePressLocation.y = mousePosition.y;

                // Remember the offset between the worldContainer origin and the mouse pointer.
                // This value will be used when panning to determine the point where the user
                // "grabbed" the grid to drag it around.
                this.panningDif = {
                    x: this.worldContainer.x - mousePosition.x,
                    y: this.worldContainer.y - mousePosition.y
                };
            }

            // As long as the left mouse button is being pressed, return an object with hold: true.
            return {
                hold: true,
                click: false,
                panningDif: this.panningDif,
                position: mousePosition,
                positionInGrid: this.#getMousePointInGrid(mousePosition),
                moved: this.moved
            };
        } else {

            // The left mouse button is not pressed. If it was also not pressed the last time this
            // method was called, we don't care and we do nothing. If the button was pressed in the
            // last tick, it means that the user just released the button and we need to check if
            // it was a click.
            if (this.prevMouseButtonPressed) {
                // Remember that the mouse button was not pressed in this method call.
                this.prevMouseButtonPressed = false;
                // We define a mouse click as an event where the user presses the mouse button,
                // DOESN'T MOVE THE MOUSE and then releases the mouse button. Here we check if the
                // mouse pointer is exactly where it was when the mouse press hapened. 
                if (mousePosition.distanceTo(this.mousePressLocation) < 1 && !this.#mouseOutsideStage(mousePosition)) {
                    return {
                        hold: false,
                        click: true,
                        panningDif: this.panningDif,
                        position: mousePosition,
                        positionInGrid: this.#getMousePointInGrid(mousePosition),
                        moved: this.moved
                    };
                }
            }
            // Remember that the mouse button was not pressed in this method call.
            this.prevMouseButtonPressed = false;
        }

        // The left mouse button is not pressed and it was not pressed the last time this method
        // was called. The user is not clicking so return an object with hold and click set to true.
        return {
            hold: false,
            click: false,
            panningDif: this.panningDif,
            position: mousePosition,
            positionInGrid: this.#getMousePointInGrid(mousePosition),
            moved: this.moved
        };
    }

    /**
     * Private method to determine if the mouse is in the app screen. If it is outside, its
     * actions don't concern us.
     */
    #mouseOutsideStage(mousePosition) {
        if (mousePosition.x < 0 || mousePosition.y < 0) {
            return true;
        }
        if (mousePosition.x > this.app.screen.width || mousePosition.y > this.app.screen.height) {
            return true;
        }
        return false;
    }


    /*
     * Calculate the coordinates of the mouse pointer in the scaled and translated coordinate system
     * of the grid.
     */
    #getMousePointInGrid(mousePosition) {
        let gridMouseX = (mousePosition.x - this.worldContainer.position.x) /
            this.worldContainer.scale._x;
        let gridMouseY = (mousePosition.y - this.worldContainer.position.y) /
            this.worldContainer.scale._y;
        return new Point(gridMouseX, gridMouseY);
    }

    /**
     * This method is called in the appLoop to check if the user pressed Ctrl+Z. Before returning
     * the boolean we set it to false since we "handled" the event.
     */
    pressedCtrlZ() {
        let temp = this.ctrlz;
        this.ctrlz = false;
        return temp;
    }
}