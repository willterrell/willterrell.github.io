import { copyArray } from "./utilities.mjs";

export class Grid {
    constructor(width, height, automatas, render, gridLinesPixelSize, zoomFactor, x, y, canvas) {
        /* Parameters:
        width = width of automata array
        height = height of automata array
        gridLinesPixelSize = pixel height of gridline square
        numOfAutomatas = number of automatas, including the base automata
        canvas = canvas for the grid to be drawn on 
        automatas = numOfAutomatas long list of Automata objects
        */

        this._width = width;
        this._height = height; 
        // contains the Automata object for the nth automata at the nth index
        this._automatas = automatas;
        this._numOfAutomatas = automatas.length;

        // create automata arrays
        /* 
        full width x height array as appears on canvas

        e.g. 
        0 0 0
        1 1 2
        2 0 0
        */
        this._automataArray = copyArray(Array(width).fill(Array(height).fill(0)));
        /*
        3d array with nth subarray being width x height and containing the number of neighbors of id n in automataArray

        e.g.
        neighborArrays[0] =
        1 2 1
        3 5 4
        1 1 1
        */
        this._neighborArrays = copyArray(Array(this._numOfAutomatas).fill(Array(width).fill(Array(height).fill(0))));
        this.initializeNeighbors();
        // tracks which cells have had neighbors updated 
        this._changeArray = copyArray(Array(width).fill(Array(height).fill(0)));
        /*
         similar to changeArray but stores individual cell changes and in a different manner
         the nth subarray contains (i, j) indexes that need to be rendered as automata id=n
        */
        this._rerenderArray = copyArray(Array(this._numOfAutomatas).fill([]));

        // if we want to render this grid, initialize canvases
        this._render = render;
        if (render) {
            // create grid lines
            this._gridLinesImage = document.createElement("canvas");
            this._gridLinesImage.width = width * gridLinesPixelSize;
            this._gridLinesImage.height = height * gridLinesPixelSize;
            this._gridLinesPixelSize = gridLinesPixelSize;
            this.drawGridLines();

            // create automata image 
            this._automataImage = document.createElement("canvas");
            this._automataImage.width = width;
            this._automataImage.height = height;
            this.drawAutomataBackground();

            this._canvas = canvas;

            // drawing parameters 
            this._x = x;
            this._y = y;
            this._zoomFactor = zoomFactor;
        }
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get zoomFactor() {
        return this._zoomFactor;
    }

    get automatas() {
        return this._automatas;
    }

    get canvas() {
        return this._canvas;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    set x(x) {
        this._x = x;
    }

    set y(y) {
        this._y = y;
    }

    set zoomFactor(zoomFactor) {
        this._zoomFactor = zoomFactor;
    }

    set automatas(automatas) {
        this._automatas = automatas;
        if (this._numOfAutomatas != automatas.length) {
            this._numOfAutomatas = automatas.length;
            this._automataArray = copyArray(Array(this._width).fill(Array(this._height).fill(0)));
            this._neighborArrays = copyArray(Array(this._numOfAutomatas).fill(Array(this._width).fill(Array(this._height).fill(0))));
            this.initializeNeighbors();
            this._changeArray = copyArray(Array(this._width).fill(Array(this._height).fill(0)));
            this._rerenderArray = copyArray(Array(this._numOfAutomatas).fill([]));
            this.drawAutomataBackground();
        }
    }

    set canvas(canvs) {
        this._canvas = canvas;
    }


    /*
        Array queries
    */

    // returns whether i, j is a valid index of automataArray
    inBounds(i, j) {
        return (i >= 0 && i < this._width) && (j >= 0 && j < this._height);
    }

    // safe automataArray query
    getAutomataArrayCell(i, j) {
        if (this.inBounds(i, j)) return this._automataArray[i][j];
        return -1;
    }

    getCurrentDensity() {
        let count = 0;
        for (let i = 0; i < this._width; i++) {
            for (let j = 0; j < this._height; j++) {
                if (this._automataArray[i][j] != 0) 
                    count++;
            }
        }
        return count/(this._width * this._height);
    }

    // number of squares to be changed over the area of the full grid
    getCurrentActivity() {
        let count = 0;
        for (let i = 0; i < this._width; i++) {
            for (let j = 0; j < this._height; j++) {
                if (this._changeArray[i][j] != 0) 
                    count++;
            }
        }
        return count/(this._width * this._height);
    }

    // get the value that a single cell will update to
    getOneCellUpdateValue(i, j, currNeighbors) {
        let oldId = this._automataArray[i][j];
        let automata = this._automatas[oldId];
        let preference = automata.preference; // get from automata
        let rule = automata.rule;
        for (const id of preference) {
            for (const id2 of automata.ids) {
                var subrule = rule[id][id2];
                var numOfNeighborsOfId2 = currNeighbors[id2][i][j];
                if (subrule.includes(numOfNeighborsOfId2))
                    return id;
            }
        }
        return oldId; 
    }


    /*
        Array mutations
    */
    
    // at the beginning, the automata array is filled with zeros 
    // this function will initialize the neighbors for the 0th id to reflect that
    initializeNeighbors() {
        // middle
        for (var i = 0; i < this._width; i++) {
            for (var j = 0; j < this._height; j++) {
                this._neighborArrays[0][i][j] = 8;
            }
        }
        // edges 
        for (var i = 0; i < this._width; i++) {
            this._neighborArrays[0][i][0] = 5;
            this._neighborArrays[0][i][this._height-1] = 5;
        }
        for (var j = 0; j < this._height; j++) {
            this._neighborArrays[0][0][j] = 5;
            this._neighborArrays[0][this._width-1][j] = 5;
        }
        // corners
        this._neighborArrays[0][0][0] = 3;
        this._neighborArrays[0][this._width-1][0] = 3;
        this._neighborArrays[0][0][this._height-1] = 3;
        this._neighborArrays[0][this._width-1][this._height-1] = 3;
    }

    // sets automataArray to a certain value while updating neighbor arrays to match
    // unsafe, shape of array must be the same as the shape of automataArray
    setAutomataArray(array) {
        for (let i = 0; i < this._width; i++) {
            for (let j = 0; j < this._height; j++) {
                this.setOneCell(array[i][j], i, j);
            }
        }
    }

    clearGrid() {
        let clearArray = copyArray(Array(this._width).fill(Array(this._height).fill(0)));
        this.setAutomataArray(clearArray);
    }

    randomizeAndClearGrid(sx, sy, ex, ey) {
        let newArray = copyArray(Array(this._width).fill(Array(this._height).fill(0)));
        for (let i = sx; i <= ex; i++) {
            for (let j = sy; j <= ey; j++) {
                newArray[i][j] = Math.floor(Math.random() * this._numOfAutomatas);
            }
        }
        this.setAutomataArray(newArray);
    }

    // using the rule from the Automata object, updates automataArray and partialArrays using neighborArrays
    updateAutomataArrays() {
        let currNeighbors = copyArray(this._neighborArrays);
        let currChanges = this._changeArray;
        this._changeArray = copyArray(Array(this._width).fill(Array(this._height).fill(0)));
        for (let i = 0; i < this._width; i++) {
            for (let j = 0; j < this._height; j++) {
                if (currChanges[i][j] == 0) 
                    continue;
                var newValue = this.getOneCellUpdateValue(i, j, currNeighbors);
                this.setOneCell(newValue, i, j);
            }
        }

    }

    // change one cell in automataArray and update neighborsArray and changeArray to match
    setOneCell(id, i, j) {
        // don't have to do anything if we aren't changing the cell value
        var oldId = this._automataArray[i][j];
        if (id == oldId) 
            return;

        // update automataArray
        this._automataArray[i][j] = id;

        // update neighbors
        this.updateNeighborAndChangeForOneCell(oldId, i, j, -1);
        this.updateNeighborAndChangeForOneCell(id, i, j, 1);

        this._rerenderArray[id].push([i,j]);
    }

    // update neighbor and changeArray values to indicate the change of one cell
    // add = 1 or -1
    updateNeighborAndChangeForOneCell(id, i, j, add) {
        let height = this._height, width = this._width;
        if (j < height-1) {
            if (i < width-1) 
                this.changeNeighbor(id, i+1, j+1, add);
            this.changeNeighbor(id, i+0, j+1, add);
            if (i > 0) 
                this.changeNeighbor(id, i-1, j+1, add);
        }

        if (i < width-1) 
            this.changeNeighbor(id, i+1, j+0, add);
        if (i > 0) 
            this.changeNeighbor(id, i-1, j+0, add);

        if (j > 0) {
            if (i < width-1) 
                this.changeNeighbor(id, i+1, j-1, add);
            this.changeNeighbor(id, i+0, j-1, add);
            if (i > 0) 
                this.changeNeighbor(id, i-1, j-1, add);
        }        
    }

    changeNeighbor(id, i, j, add) {
        this._neighborArrays[id][i][j] += add;
        this._changeArray[i][j] = 1;
    }


    /*
        Drawing to the canvas
    */

    // draws gridlines onto the gridLinesImage canvas
    drawGridLines() {
        if (!this._render) return;
        let ctx = this._gridLinesImage.getContext("2d");
        ctx.strokeStyle = "black";
        for (let i = 0; i < this._width; i++) {
            for (let j = 0; j < this._height; j++) {
                ctx.strokeRect(this._gridLinesPixelSize*i, this._gridLinesPixelSize*j, this._gridLinesPixelSize, this._gridLinesPixelSize);
            }
        }
    }

    drawAutomataBackground() {
        if (!this._render) return;
        let ctx = this._automataImage.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this._width, this._height);
    }

    // redraw all automata, used when setting full array
    // possibly unnecessary
    fullyRenderAutomataImage() {
        // possible optimization: batch fillStyles
        if (!this._render) return;
        let ctx = this._automataImage.getContext("2d");
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                var id = this._automataArray[i][j];
                var automata = this._automatas[id];
                ctx.fillStyle = automata.color; // get from Automata object
                ctx.fillRect(i, j, 1, 1);
            }
        }
    }

    // redraw only updated automata, based off rerenderArray
    rerenderAutomataImage() {
        if (!this._render) return;
        let ctx = this._automataImage.getContext("2d");
        for (let id = 0; id < this._numOfAutomatas; id++) {
            var automata = this._automatas[id];
            ctx.fillStyle = automata.color; // gotten from Automata object
            var indexesToRerender = this._rerenderArray[id];
            for (const indexPair of indexesToRerender) {
                ctx.fillRect(indexPair[0], indexPair[1], 1, 1);
            }
        }
        this._rerenderArray = copyArray(Array(this._numOfAutomatas).fill([]));
    }

    // draw background, automata, gridlines to grid
    // gridPixelSize = pixel width of one automata 
    drawGrid() {
        if (!this._render) return;
        let c = this._canvas;
        let ctx = c.getContext("2d");
        ctx.fillStyle = "#818589";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(this._automataImage, this._x, this._y, 
                      this._width * this._zoomFactor, this._height * this._zoomFactor);
        ctx.drawImage(this._gridLinesImage, this._x, this._y,
                      this._width * this._zoomFactor, this._height * this._zoomFactor);
    }

    // update automata for one time step and draw to canvas
    // make sure you don't lose this
    updateOneCycle() {
        this.updateAutomataArrays();
        this.rerenderAutomataImage();
        this.drawGrid();
    }

    
    /*
        Misc
    */

    convertGlobalCoordToLocalCoord(gx, gy) {
        let lx = Math.floor((gx - this._x)/this._zoomFactor);
        let ly = Math.floor((gy - this._y)/this._zoomFactor);
        return [lx, ly];
    }
}