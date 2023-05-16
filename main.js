import { Grid } from "./modules/grid.mjs";
import { Automata, createNRandomAutomatas, searchForAutomatasOfDensity, automatasToString, interpretImport } from "./modules/automata.mjs";
import { getCoordinatesForCenteredSquare } from "./modules/utilities.mjs";

var colormap = require('colormap');

// DOM elements
let automataCanvas = document.getElementById("automataCanvas");

let runButton = document.getElementById("runButton");
let stepButton = document.getElementById("stepButton");
let clearButton = document.getElementById("clearButton");

let randomButton = document.getElementById("randomButton");
let randomOptionsButton = document.getElementById("randomOptionsButton");
let randomMenu = document.getElementById("randomMenu");
let randomSizeSlider = document.getElementById("randomSizeRange");

let randomAutomataButton = document.getElementById("randomAutomataButton");
let randomAutomataOptionsButton = document.getElementById("randomAutomataOptionsButton");
let randomAutomataMenu = document.getElementById("randomAutomataMenu");
let searchForAutomataCheckbox = document.getElementById("searchForAutomataCheckbox");
let transitionProbabilityNumber = document.getElementById("transitionProbabilityNumber");

let cancelButton = document.getElementById("cancelButton");
let zoomSlider = document.getElementById("zoomRange");
let speedSlider = document.getElementById("speedRange");

let drawSelect = document.getElementById("drawTypeSelection");

let loaderContainer = document.getElementById("canvasLoaderContainer");
let loaderText = document.getElementById("canvasLoaderText");

let importExportContent = document.getElementById("importExportMenu");
let importExportButton = document.getElementById("importExportButton");
let importExportText = document.getElementById("importExportText");

document.addEventListener("contextmenu", (e) => e.preventDefault());



// grid and automatas
automataCanvas.width = automataCanvas.offsetWidth;
automataCanvas.height = automataCanvas.offsetHeight;

automataCanvas.getContext("2d").imageSmoothingEnabled = false;

let width = 400, height = 225, gridLinesPixelSize = 20, numOfAutomatas = 4;

for (var i = 0; i < numOfAutomatas; i++) {
    var option = document.createElement("option");
    option.text = i.toString();
    drawSelect.add(option);
} 

function getNColorsOfScheme(n, scheme) {
    let originalN = n;
    if (n < 10) n = 10*(n-1) + 1;
    // not 10 * n because if so it is like:
    // s n n n s n n n s n n n (s: sample, n: not sample)
    // when we want:
    // s n n n s n n n s
    let colors = colormap({
        colormap: scheme,
        nshades: n,
        format: "hex",
        alpha: 1
    });
    if (originalN >= 10) return colors;
    let out = []
    for (var i = 0; i < originalN; i++) {
        out.push(colors[i * 10]);
    }
    return out;
}

let transitionProbability = 0.1;
transitionProbabilityNumber.value = transitionProbability.toString();
let colorscheme = "jet";
let colors = ["white"].concat(getNColorsOfScheme(numOfAutomatas-1, colorscheme));
let automatas = createNRandomAutomatas(colors, transitionProbability);
let automataGrid = new Grid(width, height, automatas, true, gridLinesPixelSize, 10, 0, 0, automataCanvas);

// if we want to change automatas in the future safely
function setAutomatas(automataArray) {
    automataGrid.automatas = automataArray;
    if (automataArray.length == numOfAutomatas) 
        return;
    // we might need to make changes if the number of automatas changes
    numOfAutomatas = automataArray.length;
    // ensure we can draw all automatas through drawselect 
    for (var i = 0; i < numOfAutomatas; i++) {
        var option = document.createElement("option");
        option.text = i.toString();
        drawSelect.add(option);
    } 
    // recolor
    colors = ["white"].concat(getNColorsOfScheme(numOfAutomatas-1, colorscheme));
    for (var i = 0; i < numOfAutomatas; i++) {
        automataGrid.automatas[i].color = colors[i];
    }
}

automataGrid.zoomFactor = zoomSlider.value;
automataGrid.x = Math.floor((automataCanvas.width - automataGrid.zoomFactor * automataGrid.width)/2);
automataGrid.y = Math.floor((automataCanvas.height - automataGrid.zoomFactor * automataGrid.height)/2);
automataGrid.drawGrid();

addEventListener("resize", () => {
    automataGrid.canvas.width = automataCanvas.offsetWidth;
    automataGrid.canvas.height = automataCanvas.offsetHeight;
    automataGrid.canvas.getContext("2d").imageSmoothingEnabled = false;
    automataGrid.drawGrid();
});



// controls interaction
// "Run" button: updates automata on an interval
let automataUpdateRunning = false;
let runningId = 0;
let updateSpeedMs = 100;
let updateFunc = automataGrid.updateOneCycle.bind(automataGrid);
function onRunButtonClick() {
    // if not currently running, start running
    if (!automataUpdateRunning) {
        runningId = setInterval(updateFunc, updateSpeedMs);
        runButton.innerHTML = "Stop";
    }
    else {
        clearInterval(runningId);
        runButton.innerHTML = "Run";
    }
    automataUpdateRunning = !automataUpdateRunning;
}
runButton.addEventListener("click", onRunButtonClick);

// "Step" button: updates automata once
stepButton.addEventListener("click", updateFunc);

// Zoom slider (first slider): zooms grid in and out
function onZoomSliderInput() {
    automataGrid.zoomFactor = this.value;
    automataGrid.drawGrid();
}
zoomSlider.addEventListener("input", onZoomSliderInput);

// Speed slider: changes interval time
function onSpeedSliderChange() {
    updateSpeedMs = this.value;
    if (automataUpdateRunning) {
        clearInterval(runningId);
        runningId = setInterval(updateFunc, updateSpeedMs);
    }
}
speedSlider.addEventListener("change", onSpeedSliderChange);

// "Clear" button: clears grid
function onClearButtonClick() {
    automataGrid.clearGrid();
    automataGrid.rerenderAutomataImage();
    automataGrid.drawGrid();
}
clearButton.addEventListener("click", onClearButtonClick);

// "Random" button: clears grid and sets grid to randomized values
let randomSize = 10;
randomSizeSlider.value = randomSize.toString();
randomSizeSlider.min = "0";
randomSizeSlider.max = Math.floor(Math.min(width, height)/2).toString();
function onRandomButtonClick() {
    let coords = getCoordinatesForCenteredSquare(automataGrid.width, automataGrid.height, randomSize);
    automataGrid.randomizeAndClearGrid(coords[0], coords[1], coords[2], coords[3]);
    automataGrid.rerenderAutomataImage();
    automataGrid.drawGrid();
}
randomButton.addEventListener("click", onRandomButtonClick);

let randomMenuVisible = false;
function onRandomOptionsButtonClick() {
    randomMenuVisible = !randomMenuVisible;
    if (randomMenuVisible) 
        randomMenu.style.display = "block";
    else 
        randomMenu.style.display = "none";
}
randomOptionsButton.addEventListener("click", onRandomOptionsButtonClick);

randomSizeSlider.addEventListener("change", function() {
    randomSize = parseInt(this.value);
});

// "Randomize Automata" button: randomizes the automata rules, searches for "nice" automata
let randomizeTimeout = 1000 * 60 * 3;
let cancel = false;
let searchForAutomatas = true;
searchForAutomataCheckbox.checked = searchForAutomatas;
function onRandomizeAutomataButtonClick() {
    if (searchForAutomatas) {
        onClearButtonClick();
        let startTime = performance.now();
        let count = 0;
        const proceed = function() {
            count++;
            loaderText.innerHTML = "Tested " + count + " automata";
            if (performance.now() > startTime + randomizeTimeout || cancel)
                return false;
            return true;
        }
        const callback = function(foundAutomatas, success) {
            automataGrid.automatas = foundAutomatas;
            window.requestAnimationFrame(() => loaderContainer.style.display = "none");
            onRandomButtonClick();
            cancel = false;
        }
        window.requestAnimationFrame(() => loaderContainer.style.display = "block");
        searchForAutomatasOfDensity(colors, transitionProbability, -1, 0.05, 0, 10, 100, proceed, callback);
    }
    else {
        automataGrid.automatas = createNRandomAutomatas(colors, transitionProbability);
        onClearButtonClick();
        onRandomButtonClick();
    }
    importExportText.value = automatasToString(automataGrid.automatas);
}
randomAutomataButton.addEventListener("click", onRandomizeAutomataButtonClick);
// "Cancel" button: stops searching
cancelButton.addEventListener("click", () => cancel = true);

let randomAutomataMenuVisible = false;
function onRandomAutomataOptionsButtonClick() {
    randomAutomataMenuVisible = !randomAutomataMenuVisible;
    if (randomAutomataMenuVisible) 
        randomAutomataMenu.style.display = "block";
    else 
        randomAutomataMenu.style.display = "none";
}
randomAutomataOptionsButton.addEventListener("click", onRandomAutomataOptionsButtonClick);
searchForAutomataCheckbox.addEventListener("change", function() {
    searchForAutomatas = this.checked;
})

transitionProbabilityNumber.addEventListener("change", function() {
    transitionProbability = parseFloat(this.value);
})

// Draw Select: changes which automata you pain
drawSelect.addEventListener("input",  function() {
    drawingId = drawSelect.selectedIndex;
});

document.addEventListener("keydown", function(e) {
    e = e || window.event;
    let num = parseInt(e.key);
    if (document.activeElement === document.body && !isNaN(num) && num < numOfAutomatas && num >= 0) {
        drawingId = num;
        drawSelect.value = num.toString();
    }
});

// "Import/Export" button: drops up text area, interprets text in the text area as the automata rule
importExportText.value = automatasToString(automataGrid.automatas);
let importExportVisible = false;
let prevImportExportText = importExportText.value;
function onImportExportButtonClick() {
    importExportVisible = !importExportVisible;
    if (importExportVisible) 
        importExportContent.style.display = "block"; 
    else
        importExportContent.style.display = "none";
    if (importExportText.value != prevImportExportText && !importExportVisible) {
        setAutomatas(interpretImport(importExportText.value, colors));
        importExportText.value = automatasToString(automataGrid.automatas); // auto-formats
        prevImportExportText = importExportText.value;
    }
}

importExportButton.addEventListener("click", onImportExportButtonClick);


// Mouse interaction
let drawingId = 1;
function onCanvasClick(e) {
    // e = Mouse click event.
    if (e.which == 1) {
        onCanvasLeftClick(e); // left click
    }
    if (e.which == 3) {
        onCanvasRightClick(e); // right click
    }
}
// Left click draws
function onCanvasLeftClick(e) {
    const draw = function(e) {
        // e = Mouse click event
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left; //x position within the element.
        var y = e.clientY - rect.top;  //y position within the element.
        let gridCoords = automataGrid.convertGlobalCoordToLocalCoord(x, y);
        let gridX = gridCoords[0], gridY = gridCoords[1];

        if (!automataGrid.inBounds(gridX, gridY)) 
            return;

        automataGrid.setOneCell(drawingId, gridX, gridY);
        automataGrid.rerenderAutomataImage();
        automataGrid.drawGrid();
    }
    const endDrag = function() {
        automataCanvas.onmouseup = null;
        automataCanvas.onmousemove = null;
    }
    draw(e);
    automataCanvas.onmouseup = endDrag;
    automataCanvas.onmousemove = draw;
}
// Right click pans
function onCanvasRightClick(e) {
    const move = function (e){
        automataGrid.x += e.movementX;
        automataGrid.y += e.movementY;
        automataGrid.drawGrid();
    }
    const endDrag = function() {
        automataCanvas.onmouseup = null;
        automataCanvas.onmousemove = null;
    }
    automataCanvas.onmouseup = endDrag;
    automataCanvas.onmousemove = move;
}
automataCanvas.addEventListener("mousedown", onCanvasClick);

