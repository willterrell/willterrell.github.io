class Automata{
    constructor(id, color, updateRule) {
        this._id = id;
        this._color = color;
        this._updateRule = updateRule;
        this._updateFunc = updateRule.getUpdateFunction();
    }
    get id() {
        return this._id;
    }
    get color() {
        return this._color;
    }
    update(neighbors) {
        return this._updateFunc(neighbors);
    }
    toString() {
        return this._updateRule.toString();
    }
}

class Rule{
    constructor(self_id, other_ids, referential, stringRule) {
        this._self_id = self_id;
        this._other_ids = other_ids;
        this._referential = referential;
        this.rule = new Map();
        this.preference = [];
        if (typeof stringRule != 'string')  
            this.randomize();
    }
    randomize() {
        let ids = [this._self_id, ...this._other_ids];
        for (const id of this._other_ids) {
            var idRule = new Map();
            for (const id2 of ids) {
                if (!this._referential && id2 == this._self_id)
                    idRule.set(id2, []);
                else
                    idRule.set(id2, randEight(this._referential));
            }
            this.rule.set(id, idRule);
        }
        this.preference = shuffle(this._other_ids);
    }
    getUpdateFunction() {
        let preference = this.preference;
        let fullRule = this.rule;
        let self_id = this._self_id;
        let ids = [this._self_id, ...this._other_ids];
        return function(neighbors) {
            for (const id of preference) {
                var rule = fullRule.get(id);
                for (const id2 of ids) {
                    var idRule = rule.get(id2);
                    var countOfId = neighbors.get(id2);
                    if (idRule.includes(countOfId))
                        return id; 
                }
            }
            return self_id;
        }
    }
    toString() {
        let output = this._self_id + ": \n";
        let ids = [this._self_id, ...this._other_ids];
        for (const id of this.preference) {
            output += "-> " + id +" \n";
            var rule = this.rule.get(id);
            for (const id2 of ids) {
                var idRule = rule.get(id2);
                output += "    " + id2 + ": " + idRule.toString() + ",\n";
            }
        }
        return output;
    }
}

// random selection of 1-8
function randEight(includeZero) {
    let output = [];
    let start = 0;
    //           0    1    2    3    4    5    6    7    8
    let prob = [0.1, 0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2, 0.1];
    if (!includeZero) start = 1;
    for (let i = start; i <= 8; i++) {
        var randDouble = Math.random();
        if (Math.random() < prob[i]) 
            output.push(i);
    }
    return output;
}

// random permutation
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

// draw full canvas
function drawCanvas(grid, x, y, gridBlockSize) {
    // grid must be rectangular
    let c = document.getElementById("myCanvas");
    let ctx = c.getContext("2d");
    if (gridImage == undefined) {
        gridImage = document.createElement("canvas");
        gridImage.width = gridWidth * defaultGridBlockSize;
        gridImage.height = gridHeight * defaultGridBlockSize;
        drawGrid(gridImage, grid);
        //console.log("grid");
    }
    if (automataImage == undefined) {
        automataImage = document.createElement("canvas");
        automataImage.width = gridWidth * automataSize;
        automataImage.height = gridHeight * automataSize;
        let automataCTX = automataImage.getContext("2d");
        automataCTX.fillStyle = "white";
        automataCTX.fillRect(0, 0, gridWidth * automataSize, gridHeight * automataSize);
        drawAutomata(automataImage, grid);
        //console.log("automata");
    }
    if (gridHasBeenUpdated) {
        drawAutomata(automataImage, grid);
        prevGrid = copyArray(grid);
        gridHasBeenUpdated = false;
        //console.log("update automata");
    }
    ctx.fillStyle = "#818589";
    ctx.fillRect(0, 0, c.width, c.height);
    x -= Math.floor(gridWidth / 2);
    y -= Math.floor(gridHeight / 2);
    ctx.drawImage(automataImage, x, y, gridBlockSize * gridWidth, gridBlockSize * gridHeight);
    ctx.drawImage(gridImage, x, y, gridBlockSize * gridWidth, gridBlockSize * gridHeight);
}

// draw full grid
function drawGrid(canvas, grid) {
    let ctx = canvas.getContext("2d");
    ctx.strokeStyle = "black";
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
            ctx.strokeRect(defaultGridBlockSize*i, defaultGridBlockSize*j, defaultGridBlockSize, defaultGridBlockSize);
        }
    }
}

// draw automata
function drawAutomata(canvas, grid) {
    //console.log("in drawAutomata");
    let ctx = canvas.getContext("2d");
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == prevGrid[i][j]) 
                continue;
            ctx.fillStyle = automataMap.get(grid[i][j]).color;
            ctx.fillRect(automataSize*i, automataSize*j, automataSize, automataSize);
        }
    }
}

function existsInGrid(i, j) {
    return i >= 0 && i < gridWidth && j >= 0 && j < gridHeight;
}

function updateAutomataConway(grid) {
    let newGrid = copyArray(grid); // copy grid
    for (let i = 0; i < grid.length; ++i) {
        for (let j = 0; j < grid[i].length; ++j) {
            newGrid[i][j] = conwaysRules(grid, i, j);
        }
    }
    return newGrid;
}

function copyArray(array) {
    let newArray = [];
    for (var i = 0; i < array.length; i++)
        newArray[i] = array[i].slice(); // slice returns a shallow copy
    return newArray;
}

function countNeighbors(grid, x, y) {
    let coordinates = [[x-1, y-1], [x-1, y], [x-1, y+1], [x, y-1], [x, y+1], [x+1, y-1], [x+1, y], [x+1, y+1]];
    let count = 0;
    for (const coordinate of coordinates) {
        let i = coordinate[0], j = coordinate[1];
        if (existsInGrid(i, j) && grid[i][j]) {
            count++;
        }
    }
    return count;
}

function getNeighbors(grid, x, y) {
    let coordinates = [[x-1, y-1], [x-1, y], [x-1, y+1], [x, y-1], [x, y+1], [x+1, y-1], [x+1, y], [x+1, y+1]];
    let neighbors = new Map();
    for (const id of ids) neighbors.set(id, 0);
    for (const coordinate of coordinates) {
        let i = coordinate[0], j = coordinate[1];
        if (!existsInGrid(i, j)) continue;
        let val = grid[i][j];
        let count = neighbors.get(val);
        neighbors.set(val, count + 1);
    }
    return neighbors;
}

function conwaysRules(grid, x, y) {
    let val = grid[x][y];
    let numOfNeighbors = countNeighbors(grid, x, y);
    //console.log(i, j, numOfNeighbors);
    if (val) { //conway rules
        if (numOfNeighbors <= 0) return false;
        else if (numOfNeighbors >= 6) return false;
    }
    else {
        if (numOfNeighbors == 3) return true;
    }
    return val;
}

function updateAndDraw() {
    const t0 = performance.now();
    updateAutomata();
    gridHasBeenUpdated = true;
    drawCanvas(grid, xPos, yPos, gridBlockSize);
    //console.log(checkDensity());
    tcount += 1;
    ms = ((tcount-1) * ms + performance.now() - t0)/tcount;
    console.log(ms);
}

function updateAutomata() {
    let newGrid = copyArray(grid);
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
            let currAutomata = automataMap.get(grid[i][j]);
            let neighbors = getNeighbors(grid, i, j);
            let newId = currAutomata.update(neighbors);
            newGrid[i][j] = newId;
        }
    }
    grid = newGrid;
}

//*
function onRunButtonClick(element, updateFunc) {
    return function() {
        running = !running;
        if (running) {
            element.innerHTML = "Stop";
            intervalId = setInterval(updateFunc, msDelay);
        }
        else {
            element.innerHTML = "Run";
            clearInterval(intervalId);
        }
    }
}

//*
function onCanvasClick(element) {
    return function(e) {
        // e = Mouse click event.
        if (e.which == 1) {
            //console.log("left");
            onCanvasLeftClick(e, element); // left click
        }
        if (e.which == 3) {
            //console.log("right");
            onCanvasRightClick(e, element); // right click
        }
      }
}

//*
function onCanvasLeftClick(e, element) {
    dragLeftClick(e); // if clicking
    element.onmouseup = endDragLeftClick(element);
    element.onmousemove = dragLeftClick;
}

//*
function dragLeftClick(e) {
    // e = Mouse click event.
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left; //x position within the element.
    var y = e.clientY - rect.top;  //y position within the element.
    x += Math.floor(gridWidth / 2);
    y += Math.floor(gridHeight / 2);
    let gridX = Math.floor((x - xPos) / gridBlockSize);
    let gridY = Math.floor((y - yPos) / gridBlockSize);

    if (!existsInGrid(gridX, gridY)) 
        return;

    // console.log("x: " + x + ", y: " + y);
    // console.log("gx: " + gridX + ", gy: " + gridY);
    if (grid[gridX][gridY] != drawId) {
        grid[gridX][gridY] = drawId;
        gridHasBeenUpdated = true;
        drawCanvas(grid, xPos, yPos, gridBlockSize);
    }
}

//*
function endDragLeftClick(element) {
    return function(e) {
        if (!running) savedGrid = copyArray(grid);
        element.onmouseup = null;
        element.onmousemove = null;
    }
}

let mouseStartingPosX = 0, mouseStartingPosY = 0;

//*
function onCanvasRightClick(e, element) {
    var rect = e.target.getBoundingClientRect();
    mouseStartingPosX = e.clientX - rect.left; //x position within the element.
    mouseStartingPosY = e.clientY - rect.top;  //y position within the element.
    element.onmouseup = endDragElement(element);
    element.onmousemove = dragElement;
    drawCanvas(grid, xPos, yPos, gridBlockSize);
}

//*
function dragElement(e) {
    xPos += e.movementX;
    yPos += e.movementY;
    drawCanvas(grid, xPos, yPos, gridBlockSize);
}

//*
function endDragElement(element) {
    return function(e) {
        element.onmouseup = null;
        element.onmousemove = null;
    }
}

//*
function onResetClick(stopRunningFunc) {
    return function() {
        grid = savedGrid;
        gridHasBeenUpdated = true;
        drawCanvas(grid, xPos, yPos, gridBlockSize);
        if (running) stopRunningFunc();
    } 
}

//*
function onZoomSliderInput() {
    gridBlockSize = this.value;
    //console.log("onscroll");
    drawCanvas(grid, xPos, yPos, gridBlockSize);
}

//*
function onSpeedSliderInput(updateFunc) {
    return function() {
        msDelay = this.value;
        if (running) {
            clearInterval(intervalId);
            intervalId = setInterval(updateFunc, msDelay);
        }
    }
}

function randomizeAutomata() {
    const noUpdate = new Rule(0, [1,2,3], false);
    const noAutomata = new Automata(0, "white", noUpdate);
    
    const wireUpdate = new Rule(1, [0,2,3], true);
    const wireAutomata = new Automata(1, "red", wireUpdate);
    
    const signalUpdate = new Rule(2, [0,1,3], true);
    const signalAutomata = new Automata(2, "orange", signalUpdate);

    const thirdUpdate = new Rule(3, [0,1,2], true);
    const thirdAutomata = new Automata(2, "yellow", thirdUpdate);
    
    automataMap.set(0, noAutomata);
    automataMap.set(1, wireAutomata);
    automataMap.set(2, signalAutomata);
    automataMap.set(3, thirdAutomata);

    clearGrid();
    randomizeGrid();
}

function findLowDensityAutomata(timeout) {
    return function() {
        let count = 0;
        let startTime = Date.now();
        while (true) {
            randomizeAutomata();
            clearGrid();
            randomizeGrid();
            for (let i = 0; i < 10; i++) {
                updateAutomata();
                var density = checkDensity();
                //console.log(density);
                if (density > 0.01 && density != 0 && i > 5) break;
            }
            count++;
            if (density < 0.01 && density != 0) {
                var automataString = "";
                for (let i = 0; i < ids.length; i++) {
                    var id = ids[i];
                    automataString += automataMap.get(id).toString() + "\n";
                }
                console.log(automataString);
                console.log(density);
                console.log(count);
                clearGrid();
                randomizeGrid();
                gridHasBeenUpdated = true;
                drawCanvas(grid, xPos, yPos, gridBlockSize);
                return true;
            }
            if (Date.now() - startTime > timeout) {
                console.log("Timeout");
                clearGrid();
                randomizeGrid();
                return false;
            }
        }
    }
}

function checkDensity() {
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
            if (grid[i][j] != 0) count++;
        }
    }
    return count/(grid.length*grid[0].length);
}

let fractionRadomized = 10;
function randomizeGrid() {
    let startX = Math.floor((gridWidth - fractionRadomized)/2);
    let startY = Math.floor((gridHeight - fractionRadomized)/2);
    for (let i = startX; i < grid.length/fractionRadomized+startX; i++) {
        for (let j = startY; j < grid[0].length/fractionRadomized+startY; j++) {
            grid[i][j] = Math.floor(Math.random() * ids.length);
        }
    }
}

function clearGrid() {
    grid = copyArray(Array(gridWidth).fill(Array(gridHeight).fill(0)));
}

function funcAndUpdate(func) {
    return function() {
        func();
        gridHasBeenUpdated = true;
        drawCanvas(grid, xPos, yPos, gridBlockSize);
    }
}

function textToAutomata() {

}

let canvas = document.getElementById("myCanvas");
let runButton = document.getElementById("runButton");
let resetButton = document.getElementById("resetButton");
let zoomSlider = document.getElementById("myRange");
let speedSlider = document.getElementById("speedSlider");
let drawSelect = document.getElementById("drawType");
let stepButton = document.getElementById("stepButton");
let clearButton = document.getElementById("clearButton");
let randomButton = document.getElementById("randomButton");
let randomAutomataButton = document.getElementById("randomAutomataButton");
let loaderContainer = document.getElementById("canvasLoaderContainer");
let loaderText = document.getElementById("canvasLoaderText");

let running = false;
let intervalId;
let gridWidth = 100, gridHeight = 100;
let grid = copyArray(Array(gridWidth).fill(Array(gridHeight).fill(0))); // weird stuff happens when we don't copy?
let prevGrid = copyArray(grid);
let gridHasBeenUpdated = false;
let gridImage, automataImage;
let savedGrid = copyArray(grid);
let gridBlockSize = 10, defaultGridBlockSize = 20, automataSize = 1;
let previousGridBlockSize = gridBlockSize;
let xPos = Math.floor(canvas.width/2), yPos = Math.floor(canvas.height/2);
let msDelay = 500;
let drawId = 1;
const automataMap = new Map();
const ids = [0, 1, 2, 3];
let ms = 0, tcount = 0;

randomizeAutomata();

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
canvas.getContext("2d").imageSmoothingEnabled = false;
addEventListener("resize", (event) => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawCanvas(grid, xPos, yPos, gridBlockSize);
});
canvas.addEventListener("mousedown", onCanvasClick(document));
document.onkeydown = function(e) {
    e = e || window.event;
    //console.log(e.key);
    let num = parseInt(e.key);
    if (!isNaN(num) && num < ids.length) {
        drawId = ids[num];
        drawSelect.value = drawId.toString();
    }
}
document.addEventListener("contextmenu", function(e)
{
	e.preventDefault()
});
runButton.addEventListener("click", onRunButtonClick(runButton, updateAndDraw)); 
resetButton.addEventListener("click", onResetClick(onRunButtonClick(runButton, updateAndDraw, 1000)));
zoomSlider.oninput = onZoomSliderInput;
speedSlider.oninput = onSpeedSliderInput(updateAndDraw);
drawSelect.oninput = function() {
    drawId = drawSelect.selectedIndex;
}
stepButton.onclick = updateAndDraw;
clearButton.onclick = funcAndUpdate(clearGrid);
randomButton.onclick = funcAndUpdate(randomizeGrid);
randomAutomataButton.onclick = funcAndUpdate(function() {
    loaderContainer.style.display = "block";
    setTimeout(findLowDensityAutomata(1000*60), 1);
    setTimeout(function() {loaderContainer.style.display = "none";}, 10);
});

console.log(loaderContainer);
//loaderContainer.style.display = "block";
drawCanvas(grid, xPos, yPos, gridBlockSize);

//console.log(grid);