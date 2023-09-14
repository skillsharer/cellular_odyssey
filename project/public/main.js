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
    globalSeed = Math.round(fxrand() * 2e9);
    console.log(globalSeed);
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
      max: 10,
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
  },
  {
    id: "frame_strokeweight",
    name: "Frame Width",
    type: "number",
    default: 5,
    options: {
      min: 1,
      max: 10,
      step: 1,
    },
  }
])

// GAME OF LIFE CODE

let cellSize = 10;
let gridRows = 50;
let gridCols = 50;
let lerpAmount = 0;
let grid, nextGrid;
let unchangedCells = new Set(); // New data structure to keep track of unchanged cells
let gradientColor1;
let gradientColor2;
let bgColor;
let cellColor;
let transitionSpeed; // 0.1 - 1
let aliveCellPercentage;
let initialGrid, initialNextGrid;
let minus = false;
let gradientSpeed;
let frameWidth = 5;
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

function initGridDebugMode(patternFlag) {
  grid = make2DArray(gridCols, gridRows);
  nextGrid = make2DArray(gridCols, gridRows);
  unchangedCells = new Set();  // Resetting the set of unchanged cells

  const midX = Math.floor(gridCols / 2);
  const midY = Math.floor(gridRows / 2);
  let pattern = [];

  switch (patternFlag) {
    case 'glider':
      pattern = [
        [0, 0], [1, 0], [2, 0],
        [0, 1], [1, 2]
      ];
      break;
    case 'lwss':
      pattern = [
        [1, -1],  // First row
        [-1, 0], [2, 0],  // Second row
        [-2, 1],  // Third row
        [-2, 2], [-1, 2], [0, 2], [1, 2]  // Fourth row
      ];            
      break;
      case 'pulsar':
        pattern = [
          // First quadrant
          [-2,-1],[-3,-1],[-4,-1],
          [-6,-2],[-6,-3],[-6,-4],
          [-2,-6],[-3,-6],[-4,-6],
          [-1,-2],[-1,-3],[-1,-4],
        
          // Second quadrant (mirror first quadrant across the Y-axis)
          [2,-1],[3,-1],[4,-1],
          [6,-2],[6,-3],[6,-4],
          [2,-6],[3,-6],[4,-6],
          [1,-2],[1,-3],[1,-4],
        
          // Third quadrant (mirror first quadrant across the X-axis)
          [-2,1],[-3,1],[-4,1],
          [-6,2],[-6,3],[-6,4],
          [-2,6],[-3,6],[-4,6],
          [-1,2],[-1,3],[-1,4],
        
          // Fourth quadrant (mirror first quadrant across both X and Y axes)
          [2,1],[3,1],[4,1],
          [6,2],[6,3],[6,4],
          [2,6],[3,6],[4,6],
          [1,2],[1,3],[1,4]
        ];
        
        break;
      case 'pentadecathlon':
        pattern = [
          [0, 0],[-1, 0],
          [-2, -1],[-2, 1],
          [-3, 0],[-4, 0],
          [1,0],[2,0],
          [3,1],[3,-1],
          [4,0],[5,0]
        ];
        break;
      case 'block':
        pattern = [
          [0, 0], [1, 0],
          [0, 1], [1, 1]
        ];
        break;
      case 'blinker':
        pattern = [
          [0, 0], [1, 0], [2, 0]
        ];
        break;
      case 'toad':
        pattern = [
          [0, 0], [1, 0], [2, 0],
          [-1, 1], [0, 1], [1, 1]
        ];
        break;
      case 'beacon':
        pattern = [
          [0, 0], [1, 0],
          [0, 1], [1, 1],
          [2, 2], [3, 2],
          [2, 3], [3, 3]
        ];
        break;
      default:
        console.log("Invalid optionFlag. No pattern chosen.");
        return;
  }

  for (let [dx, dy] of pattern) {
    grid[midX + dx][midY + dy] = 1;
    nextGrid[midX + dx][midY + dy] = 1;
    transitionGrid[midX + dx][midY + dy] = 1;
    transitionState[midX + dx][midY + dy] = 'stable';
  }

  // Save initial state
  initialGrid = copyGrid(grid);
  initialNextGrid = copyGrid(nextGrid);
  initialTransitionGrid = copyGrid(transitionGrid);
  initialTransitionState = copyGrid(transitionState);
}


function initGrid() {  
  grid = make2DArray(gridCols, gridRows);
  nextGrid = make2DArray(gridCols, gridRows);  
  let percentageAlive = map(gridRows * gridCols, 0, 1600, 0.0, aliveCellPercentage);
  
  for(let i = 0; i < gridCols; i++) {
    for(let j = 0; j < gridRows; j++) {
      
      // Focused around the center
      let distToCenter = dist(i, j, gridCols / 2, gridRows / 2);
      let adjustedProbability = map(distToCenter, 0, sqrt(sq(gridCols/2) + sq(gridRows/2)), percentageAlive, 0);
      
      // Set the cell value
      grid[i][j] = random(1) < adjustedProbability ? 1 : 0;
      nextGrid[i][j] = grid[i][j];
    }
  }
  // Save initial state
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

function drawFrame(frame_strokeweight) {
  push();
  strokeWeight(frame_strokeweight);
  stroke(0);
  fill(255, 0, 0);  // Frame color

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
    vertex(x2, y2);
    endShape(CLOSE);
  }
  pop();
}

function drawGradientBackGround(){
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
}

function drawGridLines(){
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
}

function updateGrid() {
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      // Get number of alive neighbors
      let neighbors = countNeighbors(grid, i, j);
      let alive = grid[i][j] === 1;
      nextGrid[i][j] = (alive && (neighbors === 2 || neighbors === 3 ) || (!alive && neighbors === 3)) ? 1 : 0;
      // Add additional code here if you want to handle the 'unchangedCells' set and 'transitionState'
    }
  }
  // Now that we've computed nextGrid, let's swap it with the current grid for the next frame
  let temp = grid;
  grid = nextGrid;
  nextGrid = temp;
}

function drawGrid(){
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      let x = i * cellSize - gridCols * cellSize / 2 + cellSize / 2;
      let y = j * cellSize - gridRows * cellSize / 2 + cellSize / 2;
      push();
      stroke(0);
      strokeWeight(1);
      fill(cellColor);
      translate(x, y, 0);
      box(cellSize * nextGrid[i][j]);
      pop();
    }
  }
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
  frame_strokeweight = $fx.getRawParam("frame_strokeweight");
  //initGridDebugMode('pentadecathlon');
  initGrid();
  console.log('fxhash:', fxhash);
}

function draw(){
  background(bgColor);
  orbitControl();
  drawFrame(frame_strokeweight);
  drawGradientBackGround();
  drawGridLines();
  if (frameCount % (frameDelay + 1) === 0) {
    updateGrid();
  }
  drawGrid();
  if (frameCount === 1) fxpreview();
}