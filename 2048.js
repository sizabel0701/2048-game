const SIZE = 4;
const boardElement = document.querySelector("#gameBoard");
const tileLayer = document.querySelector("#tileLayer");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#bestScore");
const scoreGainElement = document.querySelector("#scoreGain");
const undoButton = document.querySelector("#undoButton");
const gameMessage = document.querySelector("#gameMessage");
const keepPlayingButton = document.querySelector("#keepPlayingButton");

let board;
let score;
let bestScore = Number(localStorage.getItem("workshop-2048-best")) || 0;
let previousState = null;
let won = false;
let keepPlaying = false;
let gameOver = false;
let newTilePosition = null;
let mergedPositions = [];
let touchStart = null;

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(source) {
  return source.map((row) => [...row]);
}

function availableCells() {
  const cells = [];
  board.forEach((row, y) => row.forEach((value, x) => {
    if (value === 0) cells.push({ x, y });
  }));
  return cells;
}

function addRandomTile() {
  const cells = availableCells();
  if (!cells.length) return;
  const position = cells[Math.floor(Math.random() * cells.length)];
  board[position.y][position.x] = Math.random() < 0.9 ? 2 : 4;
  newTilePosition = position;
}

function startGame() {
  board = emptyBoard();
  score = 0;
  previousState = null;
  won = false;
  keepPlaying = false;
  gameOver = false;
  mergedPositions = [];
  addRandomTile();
  addRandomTile();
  hideMessage();
  render();
  boardElement.focus();
}

function compressAndMerge(line) {
  const numbers = line.filter(Boolean);
  const result = [];
  const mergedIndices = [];
  let gained = 0;

  for (let index = 0; index < numbers.length; index += 1) {
    if (numbers[index] === numbers[index + 1]) {
      const value = numbers[index] * 2;
      result.push(value);
      mergedIndices.push(result.length - 1);
      gained += value;
      index += 1;
    } else {
      result.push(numbers[index]);
    }
  }

  while (result.length < SIZE) result.push(0);
  return { line: result, gained, mergedIndices };
}

function readLine(index, direction) {
  if (direction === "left") return [...board[index]];
  if (direction === "right") return [...board[index]].reverse();
  if (direction === "up") return board.map((row) => row[index]);
  return board.map((row) => row[index]).reverse();
}

function writeLine(index, direction, line) {
  if (direction === "left") board[index] = line;
  if (direction === "right") board[index] = [...line].reverse();
  if (direction === "up") line.forEach((value, y) => { board[y][index] = value; });
  if (direction === "down") [...line].reverse().forEach((value, y) => { board[y][index] = value; });
}

function mergeCoordinate(lineIndex, itemIndex, direction) {
  if (direction === "left") return { x: itemIndex, y: lineIndex };
  if (direction === "right") return { x: SIZE - 1 - itemIndex, y: lineIndex };
  if (direction === "up") return { x: lineIndex, y: itemIndex };
  return { x: lineIndex, y: SIZE - 1 - itemIndex };
}

function boardsEqual(a, b) {
  return a.every((row, y) => row.every((value, x) => value === b[y][x]));
}

function move(direction) {
  if (gameOver || (!gameMessage.hidden && !keepPlaying)) return;

  const before = cloneBoard(board);
  const scoreBefore = score;
  let gained = 0;
  mergedPositions = [];

  for (let index = 0; index < SIZE; index += 1) {
    const result = compressAndMerge(readLine(index, direction));
    writeLine(index, direction, result.line);
    gained += result.gained;
    result.mergedIndices.forEach((itemIndex) => {
      mergedPositions.push(mergeCoordinate(index, itemIndex, direction));
    });
  }

  if (boardsEqual(before, board)) return;

  previousState = { board: before, score: scoreBefore };
  score += gained;
  addRandomTile();
  render(gained);

  if (!won && board.some((row) => row.includes(2048))) {
    won = true;
    showMessage("YOU WIN", "抵达 2048", "了不起！你可以继续合成更高数字。", true);
  } else if (!movesAvailable()) {
    gameOver = true;
    showMessage("GAME OVER", "棋盘已满", "再试一次，打破你的纪录。", false);
  }
}

function movesAvailable() {
  if (availableCells().length) return true;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (x < SIZE - 1 && board[y][x] === board[y][x + 1]) return true;
      if (y < SIZE - 1 && board[y][x] === board[y + 1][x]) return true;
    }
  }
  return false;
}

function undo() {
  if (!previousState) return;
  board = cloneBoard(previousState.board);
  score = previousState.score;
  previousState = null;
  gameOver = false;
  newTilePosition = null;
  mergedPositions = [];
  hideMessage();
  render();
}

function render(gained = 0) {
  tileLayer.innerHTML = "";
  board.forEach((row, y) => row.forEach((value, x) => {
    if (!value) return;
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.value = value;
    tile.style.setProperty("--x", x);
    tile.style.setProperty("--y", y);
    tile.textContent = value;
    if (value > 2048) tile.classList.add("super");
    if (newTilePosition?.x === x && newTilePosition?.y === y) tile.classList.add("new");
    if (mergedPositions.some((position) => position.x === x && position.y === y)) tile.classList.add("merged");
    tileLayer.appendChild(tile);
  }));

  scoreElement.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("workshop-2048-best", String(bestScore));
  }
  bestScoreElement.textContent = bestScore;
  undoButton.disabled = !previousState;

  if (gained) {
    scoreGainElement.textContent = `+${gained}`;
    scoreGainElement.classList.remove("pop");
    void scoreGainElement.offsetWidth;
    scoreGainElement.classList.add("pop");
  } else {
    scoreGainElement.textContent = "";
  }
  newTilePosition = null;
}

function showMessage(eyebrow, title, text, canContinue) {
  document.querySelector("#messageEyebrow").textContent = eyebrow;
  document.querySelector("#messageTitle").textContent = title;
  document.querySelector("#messageText").textContent = text;
  keepPlayingButton.hidden = !canContinue;
  gameMessage.hidden = false;
}

function hideMessage() {
  gameMessage.hidden = true;
}

function directionFromKey(key) {
  return { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[key];
}

document.addEventListener("keydown", (event) => {
  const direction = directionFromKey(event.key);
  if (direction) {
    event.preventDefault();
    move(direction);
  }
});

boardElement.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
  boardElement.setPointerCapture(event.pointerId);
});

boardElement.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
});

boardElement.addEventListener("pointercancel", () => { touchStart = null; });
document.querySelector("#newGameButton").addEventListener("click", startGame);
document.querySelector("#retryButton").addEventListener("click", startGame);
undoButton.addEventListener("click", undo);
keepPlayingButton.addEventListener("click", () => {
  keepPlaying = true;
  hideMessage();
  boardElement.focus();
});

bestScoreElement.textContent = bestScore;
startGame();
