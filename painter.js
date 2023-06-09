//------------------------------------GLOBAL VARIABLES----------------------------------
w.disableDragging();

var absZoom = zoomRatio * userZoom;
var PaintBuffer = [];
var PaintScale = [(~~(owotWidth / cellW)) / absZoom, (~~(owotHeight / cellH)) / absZoom];
var [px, py] = CellToPixelCoords(PixelToCellCoords(0, 0));
const parent = document.createElement('div');
var PaintScreenPos = [0, 0];
const canvas = document.createElement('canvas');
const paintCtx = canvas.getContext("2d");
var usePaintFill = false;
var PrevDraw = {
  x: -1,
  y: -1
}
var PaintColors = {
  stroke: 0,
  fill: 0
}

var PixelColor = {
  R: 0,
  G: 0,
  B: 0,
  A: 0
}
let startPosition = {
  x: 0,
  y: 0
};
let lineCoordinates = {
  x: 0,
  y: 0
};
let isDrawStart = false;
let strokes = [];
var selectedTool = "line";
//------------------------------------HELPER FUNCTIONS----------------------------------

function PixelToCellCoords(pixelCoords = [0, 0]) {
  // arguments can either be [x, y] or x, y

  let x, y;

  // If input is an array
  if (Array.isArray(pixelCoords) && pixelCoords.length < 3) {
    [x = 0, y = 0] = pixelCoords;
  }
  // If input is two separate arguments
  else if (arguments.length < 3) {
    [x = 0, y = 0] = arguments;
  }
  // Invalid input
  else {
    console.error('PixelToCellCoords: Invalid pixelCoords. Arguments can either be [x, y] or x, y. Your pixelCoords was: ' + pixelCoords);
    return;
  }

  return getTileCoordsFromMouseCoords(x, y);
}

function hexToRgb(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return [r, g, b];
}

function CellToPixelCoords(cellCoords = [0, 0, 0, 0])
// arguments can either be [x, y, z, w] or x, y, z, w
{

  let x, y, z, w;
  // If input is an array
  if (Array.isArray(cellCoords) && cellCoords.length < 5) {
    [x = 0, y = 0, z = 0, w = 0] = cellCoords;
  }
  // If input is four separate arguments
  else if (arguments.length < 5) {
    [x = 0, y = 0, z = 0, w = 0] = arguments;
  }
  // Invalid input
  else {
    console.error('CellToPixelCoords: Invalid cellCoords. Arguments can either be [x, y, z, w] or x, y, z, w. Your cellCoords was: ' + cellCoords);
    return;
  }
  let X = ((Math.round(x) * tileW) + (z) * cellW) + Math.round(positionX) + Math.round(owotWidth / 2);
  let Y = ((Math.round(y) * tileH) + (w) * cellH) + Math.round(positionY) + Math.round(owotHeight / 2);
  return [X, Y];
}

function RenderPixels() {

  // get the pixel data
  const imageData = paintCtx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // loop through the pixels and log their color and coordinates if alpha != 0
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var a = data[i + 3];
      PixelColor.R = r;
      PixelColor.G = g;
      PixelColor.B = b;
      PixelColor.A = a;
      if (PixelColor.A !== 0) {
        console.log(
          PixelColor
        )

        let [e, f, g, h] = getTileCoordsFromMouseCoords(((x * absZoom) * cellW + PaintScreenPos[0]), ((y * absZoom) * cellH + PaintScreenPos[1]));

        PaintBuffer.push([f, e, h, g, getDate(), "█", 0, rgb_to_int(PixelColor.R, PixelColor.G, PixelColor.B)])


      }
    }

  }

}
const getClientOffset = (event) => {
  const {
    pageX,
    pageY
  } = event.touches ? event.touches[0] : event;

  const x = (pageX / cellW) - (parent.offsetLeft / cellW);
  const y = (pageY / cellH) - (parent.offsetTop / cellH);

  return {
    x,
    y
  }
}

//------------------------------------MAIN FUNCTIONS----------------------------------
function PaintCanvasSetup() {
  parent.style.position = 'absolute';
  parent.style.top = px;
  parent.style.left = py;

  canvas.width = PaintScale[0];
  canvas.height = PaintScale[1];
  canvas.style.border = '2px solid black';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = (PaintScale[0] * cellW) + "px";
  canvas.style.height = (PaintScale[1] * cellH) + "px";
  // create a handle element

  // make the canvas draggable
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;

  parent.appendChild(canvas);
  document.body.appendChild(parent);

}
// move the canvas to the nearest top-left cell.
function moveCanvas() {
  // if (event.target !== handle) return;
  let posX = 0;
  let posY = 0;
  [posX, posY] = CellToPixelCoords(PixelToCellCoords(0, 0));
  parent.style.top = posY + 'px';
  parent.style.left = posX + 'px';
  PaintScreenPos = [posX, posY];
}

function startDragging(event) {
  document.addEventListener('mousemove', moveCanvas);
}

function stopDragging(event) {
  document.removeEventListener('mousemove', moveCanvas);
}

function writePixels() {
  network.write(PaintBuffer.splice(0, 512))
  if (PaintBuffer.length !== 0) {
    setTimeout(function() {
      writePixels();
    }, 10)
  }
}
const mouseDownListener = (event) => {
  startPosition = getClientOffset(event);
  isDrawStart = true;
}

const mouseMoveListener = (event) => {
  if (!isDrawStart) return;

  lineCoordinates = getClientOffset(event);
  if (selectedTool !== "draw") {
    clearCanvas();
  }
  if (selectedTool == "line") {
    drawLine();
  } else if (selectedTool == "circle") {
    drawCircle(event);
  } else if (selectedTool == "square") {
    drawRectangle();
  } else if (selectedTool == "draw") {
    draw(event);
  }

}

const mouseupListener = (event) => {
  isDrawStart = false;
  RenderPixels();
  writePixels();
  clearCanvas();
  PrevDraw.x = -1;
}

const clearCanvas = () => {
  paintCtx.clearRect(0, 0, canvas.width, canvas.height);
}
const drawLine = () => {
  paintCtx.imageSmoothingEnabled = false;
  paintCtx.beginPath();
  paintCtx.moveTo(startPosition.x, startPosition.y);
  paintCtx.lineTo(lineCoordinates.x, lineCoordinates.y);
  paintCtx.stroke();
}
// function to draw a circle
// function to draw an ellipse
function drawCircle(event) {
if(!usePaintFill){
paintCtx.fillStyle = "transparent";

}
else{
  paintCtx.fillStyle = colorPickerFill.value;

  }
  // calculate the width and height of the ellipse
  width = Math.abs(lineCoordinates.x - startPosition.x);
  height = Math.abs(lineCoordinates.y - startPosition.y);

  // check if the Shift key is pressed
  const shiftPressed = event.shiftKey;

  // if Shift is pressed, make the ellipse twice as wide as it is high
  if (shiftPressed) {
    width = height * (cellH / cellW);
  }

  // calculate the top-left corner of the ellipse
  const left = Math.min(startPosition.x, lineCoordinates.x);
  const top = Math.min(startPosition.y, lineCoordinates.y);

  // clear the canvas and begin a new path
  paintCtx.clearRect(0, 0, canvas.width, canvas.height);
  paintCtx.beginPath();

  // draw the ellipse
  paintCtx.ellipse(
    left + width / 2, // center X
    top + height / 2, // center Y
    width / 2, // radius X
    height / 2, // radius Y
    0, // rotation
    0, // start angle
    2 * Math.PI // end angle
  );
  paintCtx.fill();
  paintCtx.stroke();
}

// function to draw a rectangle
function drawRectangle() {

if(!usePaintFill){
paintCtx.fillStyle = "transparent";

}
else{
  paintCtx.fillStyle = colorPickerFill.value;

  }

  paintCtx.fillRect(startPosition.x, startPosition.y, lineCoordinates.x - startPosition.x, lineCoordinates.y - startPosition.y);
  paintCtx.strokeRect(startPosition.x, startPosition.y, lineCoordinates.x - startPosition.x, lineCoordinates.y - startPosition.y);

}

// function to draw a curve
function drawCurve() {

  paintCtx.beginPath();
  paintCtx.moveTo(startPosition.x, startPosition.y);
  paintCtx.quadraticCurveTo(lineCoordinates.x - startPosition.x, lineCoordinates.y - startPosition.y, 10, 10);
  paintCtx.stroke();
}

function draw(event) {
  paintCtx.imageSmoothingEnabled = false;
  paintCtx.beginPath();
  if (PrevDraw.x == -1) {
    PrevDraw.x = startPosition.x;
    PrevDraw.y = startPosition.y;
  }

  paintCtx.moveTo(PrevDraw.x, PrevDraw.y);
  paintCtx.lineTo(lineCoordinates.x, lineCoordinates.y);
  paintCtx.stroke();
  PrevDraw.x = lineCoordinates.x;
  PrevDraw.y = lineCoordinates.y;
}

function updatePaintCanvas() {
  PaintScale = [(~~(owotWidth / cellW)) / absZoom, (~~(owotHeight / cellH)) / absZoom];
  [px, py] = CellToPixelCoords(PixelToCellCoords(0, 0));
  parent.style.top = px;
  parent.style.left = py;
  canvas.width = PaintScale[0];
  canvas.height = PaintScale[1];
  canvas.style.width = (PaintScale[0] * cellW) + "px";
  canvas.style.height = (PaintScale[1] * cellH) + "px";
if(!usePaintFill){
paintCtx.fillStyle = "transparent";

}
else{
  paintCtx.fillStyle = colorPickerFill.value;

  }
  paintCtx.strokeStyle = colorPickerStroke.value;
}

function browserZoomAdjust() {

  zoomRatio = deviceRatio();
  absZoom = zoomRatio * userZoom;

}
//------------------------------------FUNCTION CALLS----------------------------------
PaintCanvasSetup();

w.on("tilesRendered", function() {
  updatePaintCanvas();
  moveCanvas();
});
//------------------------------------CREATE LISTENERS----------------------------------
canvas.addEventListener('mousedown', mouseDownListener);
canvas.addEventListener('mousemove', mouseMoveListener);
canvas.addEventListener('mouseup', mouseupListener);
window.addEventListener("resize", browserZoomAdjust);

//------------------------------------Buttons and Styles--------------------------------

// Create toolbar element
const toolbar = document.createElement('div');

// Add radio buttons to toolbar
const radio1 = document.createElement('input');
radio1.type = 'radio';
radio1.name = 'group';
radio1.id = 'draw';

const label1 = document.createElement('label');
label1.setAttribute('for', 'draw');
label1.textContent = 'Draw Tool';
const radio2 = document.createElement('input');
radio2.type = 'radio';
radio2.name = 'group';
radio2.id = 'line';
radio2.checked = true;
const label2 = document.createElement('label');
label2.setAttribute('for', 'line');
label2.textContent = 'Line Tool';
const radio3 = document.createElement('input');
radio3.type = 'radio';
radio3.name = 'group';
radio3.id = 'circle';
const label3 = document.createElement('label');
label3.setAttribute('for', 'circle');
label3.textContent = 'Circle Tool';
const radio4 = document.createElement('input');
radio4.type = 'radio';
radio4.name = 'group';
radio4.id = 'square';
const label4 = document.createElement('label');
label4.setAttribute('for', 'square');
label4.textContent = 'Square Tool';
const radio5 = document.createElement('input');
radio5.type = 'radio';
radio5.name = 'group';
radio5.id = 'curve';
const label5 = document.createElement('label');
label5.setAttribute('for', 'curve');
label5.textContent = 'Curve Tool';
// Add radio buttons to grid
const grid = document.createElement('div');
grid.style.display = 'grid';
grid.style.gridTemplateColumns = 'repeat(20, 1fr)';
grid.style.gridGap = '10px';

const fillcheck = document.createElement('input');
fillcheck.type = 'checkbox';
fillcheck.id = 'fillCheck';
const labelfill = document.createElement('label');
labelfill.setAttribute('for', 'fillCheck');
labelfill.textContent = 'Use Fill';

grid.appendChild(fillcheck);
grid.appendChild(labelfill);

grid.appendChild(radio1);
grid.appendChild(label1);
grid.appendChild(radio2);
grid.appendChild(label2);
grid.appendChild(radio3);
grid.appendChild(label3);
grid.appendChild(radio4);
grid.appendChild(label4);
grid.appendChild(radio5);
grid.appendChild(label5);

// Add event listener to radio buttons
const getSelectedRadio = () => {
  const radios = document.getElementsByName('group');
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      selectedTool = radios[i].id;
      return radios[i].id;
    }
  }
}

radio1.addEventListener('click', () => {
  getSelectedRadio();
});

radio2.addEventListener('click', () => {
  getSelectedRadio();
});

radio3.addEventListener('click', () => {
  getSelectedRadio();
});

radio4.addEventListener('click', () => {
  getSelectedRadio();
});

radio5.addEventListener('click', () => {
  getSelectedRadio();
});

fillcheck.addEventListener('click', () => {
  usePaintFill = fillcheck.checked
});

// Add grid to toolbar
toolbar.appendChild(grid);

// Style toolbar
toolbar.style.position = 'fixed';
toolbar.style.top = '0';
toolbar.style.backgroundColor = 'lightgray';
toolbar.style.padding = '10px';
toolbar.style.width = "100%";

// Add toolbar to page
document.body.appendChild(toolbar);

//---------------adding color picker
// Create a color picker element
const colorPickerStroke = document.createElement('input');

// Set the type attribute to "color"

colorPickerStroke.type = 'color';

// Add an event listener to the color picker to update a color variable when a color is selected
colorPickerStroke.addEventListener('change', function() {
  const selectedColor = hexToRgb(colorPickerStroke.value);
  paintCtx.strokeStyle = colorPickerStroke.value;
  PaintColors.stroke = rgb_to_int(selectedColor[0], selectedColor[1], selectedColor[2])

});

// Append the color picker element to the DOM (in this case, the body)
toolbar.appendChild(colorPickerStroke);
//---------------adding color picker
// Create a color picker element
const colorPickerFill = document.createElement('input');
colorPickerFill.value = "#ffffff";
// Set the type attribute to "color"
colorPickerFill.type = 'color';

// Add an event listener to the color picker to update a color variable when a color is selected
colorPickerFill.addEventListener('change', function() {
  const selectedColor = hexToRgb(colorPickerFill.value);
  paintCtx.fillStyle = colorPickerFill.value;
  PaintColors.fill = rgb_to_int(selectedColor[0], selectedColor[1], selectedColor[2])

});

// Append the color picker element to the DOM (in this case, the body)
toolbar.appendChild(colorPickerFill);
