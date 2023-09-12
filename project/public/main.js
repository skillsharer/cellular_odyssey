// useful test to determine if code is running on a mobile device. You can use this to e.g. de-activate shaders 
// or grain so the code is more light-weight and runs more smoothly on mobile devices 
const sp = new URLSearchParams(window.location.search);
let globalSeed; // Declare the seed as a global variable
//console.log(globalSeed);
//console.log(sp);
const isMob = /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent);

function preload() {
    // seed random and perlin noise functions with fxrand() - needed to make your script deterministic
    // you can now use random() and noise() in the script 
    let seedKey = $fx.getParam("seedInput");
    console.log(seedKey);
    globalSeed = int($fx.randminter() * seedKey);
}

// FXHASH PARAMS
$fx.params([
  {
    id: "table_color_1",
    name: "Table Color 1",
    type: "color",
  },
  {
    id: "table_color_2",
    name: "Table Color 2",
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
    name: "Frame Delay",
    type: "number",
    default: 0,
    options: {
      min: 1,
      max: 60,
      step: 1,
    },
  },
  {
    id: "bg_gradient_speed",
    name: "Background Gradient Speed",
    type: "number",
    default: 0.1,
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
    default: 0.12,
    options: {
      min: 0.1,
      max: 0.16,
      step: 0.01,
    },
  }
])

// GAME OF LIFE CODE

let cellSize = 10;
let gridRows = 50;
let gridCols = 50;
let lerpAmount = 0;
let grid, nextGrid, transitionGrid, transitionState;
let unchangedCells = new Set(); // New data structure to keep track of unchanged cells
let gradientColor1;
let gradientColor2;
let bgColor;
let cellColor;
let transitionSpeed; // 0.1 - 1
let aliveCellPercentage;
let initialGrid, initialNextGrid, initialTransitionGrid, initialTransitionState;
let minus = false;
let gradientSpeed;
let frameWidth = 5;
let frameDelay;

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
  transitionGrid = copyGrid(initialTransitionGrid);
  transitionState = copyGrid(initialTransitionState);
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
  let sum = 0;
  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      let col = (x + i + gridCols) % gridCols;
      let row = (y + j + gridRows) % gridRows;
      sum += grid[col][row];
    }
  }
  sum -= grid[x][y];
  return sum;
}

function initGrid() {
  randomSeed(globalSeed); // Use the globalSeed to seed the random number generator
  
  grid = make2DArray(gridCols, gridRows);
  nextGrid = make2DArray(gridCols, gridRows);
  transitionGrid = make2DArray(gridCols, gridRows);
  transitionState = make2DArray(gridCols, gridRows);
  
  unchangedCells = new Set();  // Resetting the set of unchanged cells
  
  let percentageAlive = map(gridRows * gridCols, 0, 1600, 0.0, aliveCellPercentage);
  
  // Leave the borders as dead cells
  for(let i = 1; i < gridCols - 1; i++) {
    for(let j = 1; j < gridRows - 1; j++) {
      
      // Focused around the center
      let distToCenter = dist(i, j, gridCols / 2, gridRows / 2);
      let adjustedProbability = map(distToCenter, 0, sqrt(sq(gridCols/2) + sq(gridRows/2)), percentageAlive, 0);
      
      // Set the cell value
      grid[i][j] = random(1) < adjustedProbability ? 1 : 0;
      nextGrid[i][j] = grid[i][j];
      transitionGrid[i][j] = grid[i][j];
      transitionState[i][j] = 'stable';
    }
  }

  // Add a glider at the top left corner
  grid[1][0] = 1;
  grid[2][1] = 1;
  grid[0][2] = grid[1][2] = grid[2][2] = 1;

  // Save initial state
  initialGrid = copyGrid(grid);
  initialNextGrid = copyGrid(nextGrid);
  initialTransitionGrid = copyGrid(transitionGrid);
  initialTransitionState = copyGrid(transitionState);
}


function setGradient(x, y, w, h, c1, c2) {
  for (let i = y; i <= y + h; i++) {
    let inter = map(i, y, y + h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x + w, i);
  }
}

function drawFrame() {
  push();
  strokeWeight(5);
  stroke(0);
  fill(255, 0, 0);  // Frame color

  let bevelLength = 15; // Length of the bevel (tilted lines)

  let totalWidth = gridCols * cellSize;
  let totalHeight = gridRows * cellSize;
  let startX = -gridCols * cellSize / 2;
  let startY = -gridRows * cellSize / 2;

  let corners = [
    { x: startX - frameWidth, y: startY - frameWidth },  // Top-left
    { x: startX + totalWidth + frameWidth, y: startY - frameWidth },  // Top-right
    { x: startX + totalWidth + frameWidth, y: startY + totalHeight + frameWidth },  // Bottom-right
    { x: startX - frameWidth, y: startY + totalHeight + frameWidth }  // Bottom-left
  ];

  for (let i = 0; i < corners.length; i++) {
    let x1 = corners[i].x;
    let y1 = corners[i].y;
    let x2 = corners[(i + 1) % 4].x;
    let y2 = corners[(i + 1) % 4].y;

    // Draw trapezoid
    beginShape();
    vertex(x1, y1);
    vertex(x1 + bevelLength * cos(HALF_PI * i), y1 + bevelLength * sin(HALF_PI * i));
    vertex(x2 - bevelLength * cos(HALF_PI * i), y2 - bevelLength * sin(HALF_PI * i));
    vertex(x2, y2);
    vertex(x2 - frameWidth * cos(HALF_PI * i), y2 - frameWidth * sin(HALF_PI * i));
    vertex(x1 + frameWidth * cos(HALF_PI * i), y1 + frameWidth * sin(HALF_PI * i));
    endShape(CLOSE);
  }
  pop();
}

function setup(){
  randomSeed(globalSeed);
  noiseSeed(globalSeed);
  (isMob) ? pixelDensity(1): pixelDensity(min(window.devicePixelRatio), 2);
  createCanvas(gridCols * cellSize, gridRows * cellSize, WEBGL);
  perspective(PI / 3.0, width / height, 0.1, 10000);
  frameRate(60);
  gradientColor1 = color($fx.getParam("table_color_1").arr.rgb);
  gradientColor2 = color($fx.getParam("table_color_2").arr.rgb);
  bgColor = color($fx.getParam("bg_color").arr.rgb);
  cellColor = color($fx.getParam("cell_color").arr.rgba);
  transitionSpeed = $fx.getRawParam("transition_speed");
  gradientSpeed = $fx.getRawParam("bg_gradient_speed");
  frameDelay = $fx.getRawParam("frame_delay");
  aliveCellPercentage = $fx.getRawParam("alive_cell_percentage");
  initGrid();
  console.log('fxhash:', fxhash);
}


function draw(){
  background(bgColor);
  orbitControl();
  drawFrame();
  // Gradient background
  // Handle gradient
  if (lerpAmount >= 1) {
    minus = true;
  } else if (lerpAmount <= 0) {
    minus = false;
  }
  if (minus){
    lerpAmount -= gradientSpeed;
  } else {
    lerpAmount += gradientSpeed;
  }
  let currentColor = lerpColor(gradientColor1, gradientColor2, lerpAmount);

  push();
  translate(-width / 2, -height / 2, 0);
  setGradient(0, 0, width, height, gradientColor1, currentColor);
  pop();
  
  // Grid lines
  push();
  stroke(0);
  strokeWeight(1);
  for (let i = 0; i <= gridCols; i++) {
    let x = i * cellSize - gridCols * cellSize / 2;
    line(x, -gridRows * cellSize / 2, 2, x, gridRows * cellSize / 2, 0);
    line(x, -gridRows * cellSize / 2, -2, x, gridRows * cellSize / 2, 0);

  }
  for (let j = 0; j <= gridRows; j++) {
    let y = j * cellSize - gridRows * cellSize / 2;
    line(-gridCols * cellSize / 2, y, 2, gridCols * cellSize / 2, y, 0);
    line(-gridCols * cellSize / 2, y, -2, gridCols * cellSize / 2, y, 0);
  }
  pop();
  
  let newUnchangedCells = new Set();

  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      if (unchangedCells.has(i + "," + j)) {
        nextGrid[i][j] = grid[i][j];
      } else {
        let neighbors = countNeighbors(grid, i, j);
        let alive = grid[i][j] === 1;
        nextGrid[i][j] = (alive && (neighbors === 2 || neighbors === 3 )) || (!alive && neighbors === 3) ? 1 : 0;
        
        if (nextGrid[i][j] === grid[i][j]) {
          newUnchangedCells.add(i + "," + j);
        }
      }

      let x = i * cellSize - gridCols * cellSize / 2 + cellSize / 2;
      let y = j * cellSize - gridRows * cellSize / 2 + cellSize / 2;

      if (transitionState[i][j] === 'stable') {
        if (nextGrid[i][j] !== grid[i][j]) {
          transitionState[i][j] = nextGrid[i][j] ? 'growing' : 'shrinking';
        }
      } else if (transitionState[i][j] === 'growing') {
        transitionGrid[i][j] = min(transitionGrid[i][j] + transitionSpeed, 1);
        if (transitionGrid[i][j] === 1) {
          transitionState[i][j] = 'stable';
          nextGrid[i][j] = 1;  // We should set nextGrid, not grid.
        }
      } else if (transitionState[i][j] === 'shrinking') {
        transitionGrid[i][j] = max(transitionGrid[i][j] - transitionSpeed, 0);
        if (transitionGrid[i][j] === 0) {
          transitionState[i][j] = 'stable';
          nextGrid[i][j] = 0;  // We should set nextGrid, not grid.
        }
      }

      push();
      stroke(0);
      strokeWeight(1);
      fill(cellColor);
      translate(x, y, 0);
      box(cellSize * transitionGrid[i][j]);
      pop();
    }
    if (frameCount === 1) fxpreview();
  }
  
  // Swap grid and nextGrid at the end of the draw
  let temp = grid;
  grid = nextGrid;
  nextGrid = temp;
  
  // Set the new unchanged cells
  unchangedCells = newUnchangedCells;
}