const sp = new URLSearchParams(window.location.search);
let globalSeed; // Declare the seed as a global variable
const isMob = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

function preload() {
    // seed random and perlin noise functions with fxrand() - needed to make your script deterministic
    // you can now use random() and noise() in the script 
    globalSeed = Math.round(fxrand() * 2e9);
    console.log(globalSeed);
}

// FXHASH PARAMS
$fx.params([
  {
    id: "table_color_1",
    name: "Grid Color 1",
    type: "color",
  },
  {
    id: "table_color_2",
    name: "Grid Color 2",
    type: "color",
  },
  {
    id: "bg_color",
    name: "BackGround Color",
    type: "color",
  },
  {
    id: "cell_color",
    name: "Cell Color",
    type: "color",
  },
  {
    id: "transition_speed",
    name: "Cell Transition Speed",
    type: "number",
    default: 1,
    options: {
      min: 0.1,
      max: 1,
      step: 0.1,
    },
  },
  {
    id: "frame_delay",
    name: "Grid Frame Delay",
    type: "number",
    default: 0,
    options: {
      min: 1,
      max: 10,
      step: 1,
    },
  },
  {
    id: "frame_strokeweight",
    name: "Grid Frame Width",
    type: "number",
    default: 5,
    options: {
      min: 1,
      max: 10,
      step: 1,
    },
  },
  {
    id: "bg_gradient_speed",
    name: "Background Gradient Speed",
    type: "number",
    default: 0.01,
    options: {
      min: 0.01,
      max: 0.1,
      step: 0.01,
    },
  },
  {
    id: "alive_cell_percentage",
    name: "Alive Cell Percentage",
    type: "number",
    default: 0.4,
    options: {
      min: 0.1,
      max: 1.0,
      step: 0.01,
    },
  }
])

// GAME OF LIFE CODE
let cellSize = 10;
let gridRows = 50;
let gridCols = 50;
let lerpAmount = 0;
let grid, nextGrid;
let unchangedCells = new Set();
let gradientColor1;
let gradientColor2;
let bgColor;
let cellColor;
let transitionSpeed;
let aliveCellPercentage;
let initialGrid, initialNextGrid;
let transitionState;
let minus = false;
let gradientSpeed;
let frameWidth;
let frameDelay;
let frame_strokeweight;

function copyGrid(source) {
  let copy = make2DArray(gridCols, gridRows);
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      copy[i][j] = source[i][j];
    }
  }
  return copy;
}

function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < cols; i++) {
    arr[i] = new Array(rows).fill(0);
  }
  return arr;
}

function restartGame() {
  grid = copyGrid(initialGrid);
  nextGrid = copyGrid(initialNextGrid);
  unchangedCells = new Set();
}

function keyTyped() {
  if (keyCode === ENTER) {
    restartGame();
  }
  if (keyCode === 83) {
    save(fxhash);
  }
  return false;
}

function countNeighbors(grid, x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let col = (x + i + gridCols) % gridCols;
      let row = (y + j + gridRows) % gridRows;
      count += grid[col][row];
    }
  }
  return count;
}

function initGrid() {  
  grid = make2DArray(gridCols, gridRows);
  nextGrid = make2DArray(gridCols, gridRows); 
  transitionState = make2DArray(gridCols, gridRows); 
  let percentageAlive = map(gridRows * gridCols, 0, 2500, 0.0, aliveCellPercentage);
  
  for(let i = 0; i < gridCols; i++) {
    for(let j = 0; j < gridRows; j++) {
      let distToCenter = dist(i, j, gridCols / 2, gridRows / 2);
      let adjustedProbability = map(distToCenter, 0, sqrt(sq(gridCols/2) + sq(gridRows/2)), percentageAlive, 0);
      grid[i][j] = random(1) < adjustedProbability ? 1 : 0;
      nextGrid[i][j] = grid[i][j];
    }
  }
  initialGrid = copyGrid(grid);
  initialNextGrid = copyGrid(nextGrid);
}


function setGradient(x, y, w, h, c1, c2) {
  for (let i = y; i <= y + h; i++) {
    let inter = map(i, y, y + h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x + w, i);
  }
}

function drawTable(frame_strokeweight) {
  push();

  let totalWidth = gridCols * cellSize;
  let totalHeight = gridRows * cellSize;
  let startX = -gridCols * cellSize / 2;
  let startY = -gridRows * cellSize / 2;

  let corners = [
    { x: startX - frame_strokeweight, y: startY - frame_strokeweight },  // Top-left
    { x: startX + totalWidth + frame_strokeweight, y: startY - frame_strokeweight },  // Top-right
    { x: startX + totalWidth + frame_strokeweight, y: startY + totalHeight + frame_strokeweight },  // Bottom-right
    { x: startX - frame_strokeweight, y: startY + totalHeight + frame_strokeweight }  // Bottom-left
  ];

  for (let i = 0; i < corners.length; i++) {
    let x1 = corners[i].x;
    let y1 = corners[i].y;
    let x2 = corners[(i + 1) % 4].x;
    let y2 = corners[(i + 1) % 4].y;
    strokeWeight(frame_strokeweight);
    stroke(0);
    fill(255, 0, 0);  // Frame color
    line(x1, y1, x2, y2);
  }
  noStroke();
  fill(getGradientColor());
  plane( -gridCols * cellSize, -gridRows * cellSize);
  pop();
}

function getGradientColor(){
  if (lerpAmount >= 1) {
    minus = true;
  } else if (lerpAmount <= 0) {
    minus = false;
  }
  
  if (minus) {
    lerpAmount -= gradientSpeed;
  } else {
    lerpAmount += gradientSpeed;
  }
  
  let currentColor = lerpColor(gradientColor1, gradientColor2, lerpAmount);
  return currentColor;
}

function drawGridLines(){
  push();
  stroke(0);
  strokeWeight(1);
  for (let i = 0; i <= gridCols; i++) {
    let x = i * cellSize - gridCols * cellSize / 2;
    line(x, -gridRows * cellSize / 2, 0, x, gridRows * cellSize / 2, 0);
    line(x, -gridRows * cellSize / 2, 0, x, gridRows * cellSize / 2, 0);

  }
  for (let j = 0; j <= gridRows; j++) {
    let y = j * cellSize - gridRows * cellSize / 2;
    line(-gridCols * cellSize / 2, y, 0, gridCols * cellSize / 2, y, 0);
    line(-gridCols * cellSize / 2, y, 0, gridCols * cellSize / 2, y, 0);
  }
  pop();
}

function updateGrid() {
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      let neighbors = countNeighbors(grid, i, j);
      let alive = grid[i][j] === 1;
      nextGrid[i][j] = (alive && (neighbors === 2 || neighbors === 3 ) || (!alive && neighbors === 3)) ? 1 : 0;
      if (nextGrid[i][j] === 1 && grid[i][j] === 0) {
        transitionState[i][j] = 0;
      } else if (nextGrid[i][j] === 0 && grid[i][j] === 1) {
        transitionState[i][j] = 1;
      }
    }
  }
  let temp = grid;
  grid = nextGrid;
  nextGrid = temp;
}

function drawGrid(){
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      let x = i * cellSize - gridCols * cellSize / 2 + cellSize / 2;
      let y = j * cellSize - gridRows * cellSize / 2 + cellSize / 2;
      if (grid[i][j] === 1 || transitionState[i][j] > 0) {
        push();
        stroke(0);
        strokeWeight(1);
        fill(cellColor);
        translate(x, y, 0);
        box(cellSize * transitionState[i][j]);
        pop();
      }
      if (transitionState[i][j] > 0 && grid[i][j] === 0) {
        transitionState[i][j] = max(0, transitionState[i][j] - transitionSpeed);
      } else if (transitionState[i][j] < 1 && grid[i][j] === 1) {
        transitionState[i][j] = min(1, transitionState[i][j] + transitionSpeed);
      }
    }
  }
}

function windowResized() {
  randomSeed(globalSeed);
  noiseSeed(globalSeed);
  (isMob) ? pixelDensity(1): pixelDensity(min(window.devicePixelRatio), 2);
  createCanvas(windowWidth, windowHeight, WEBGL);
  perspective(PI / 3.0, windowWidth / windowHeight, 0.1, 10000);
  frameRate(60);
}

function setup(){
  randomSeed(globalSeed);
  noiseSeed(globalSeed);
  (isMob) ? pixelDensity(1): pixelDensity(min(window.devicePixelRatio), 2);
  createCanvas(windowWidth, windowHeight, WEBGL);
  perspective(PI / 3.0, windowWidth / windowHeight, 0.1, 10000);
  frameRate(60);
  gradientColor1 = color($fx.getParam("table_color_1").arr.rgb);
  gradientColor2 = color($fx.getParam("table_color_2").arr.rgb);
  bgColor = color($fx.getParam("bg_color").arr.rgb);
  cellColor = color($fx.getParam("cell_color").arr.rgba);
  transitionSpeed = $fx.getRawParam("transition_speed");
  gradientSpeed = $fx.getRawParam("bg_gradient_speed");
  frameDelay = $fx.getRawParam("frame_delay");
  aliveCellPercentage = $fx.getRawParam("alive_cell_percentage");
  frame_strokeweight = $fx.getRawParam("frame_strokeweight");
  initGrid();
  console.log('fxhash:', fxhash);
}

function draw(){
  background(bgColor);
  orbitControl();
  drawTable(frame_strokeweight);
  drawGridLines();
  if (frameCount % (frameDelay + 1) === 0) {
    updateGrid();
  }
  drawGrid();
  if (frameCount === 1) fxpreview();
}