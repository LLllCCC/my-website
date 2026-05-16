const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");

context.scale(20, 20);
nextContext.scale(20, 20);

// 方块定义
const pieces = "ILJOTSZ";
const colors = [
  null,
  "#FF0D72",
  "#0DC2FF",
  "#0DFF72",
  "#F538FF",
  "#FF8E0D",
  "#FFE138",
  "#3877FF",
];

function createPiece(type) {
  if (type === "I")
    return [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ];
  if (type === "L")
    return [
      [0, 2, 0],
      [0, 2, 0],
      [0, 2, 2],
    ];
  if (type === "J")
    return [
      [0, 3, 0],
      [0, 3, 0],
      [3, 3, 0],
    ];
  if (type === "O")
    return [
      [4, 4],
      [4, 4],
    ];
  if (type === "Z")
    return [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ];
  if (type === "S")
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  if (type === "T")
    return [
      [0, 7, 0],
      [7, 7, 7],
      [0, 0, 0],
    ];
}

const arena = createMatrix(12, 20);
const player = { pos: { x: 0, y: 0 }, matrix: null, score: 0 };
let nextPieceMatrix = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;
let isGameOver = false;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function drawMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(x + offset.x + 0.1, y + offset.y + 0.8, 0.8, 0.1);
        ctx.fillRect(x + offset.x + 0.8, y + offset.y + 0.1, 0.1, 0.8);
      }
    });
  });
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, { x: 0, y: 0 }, context);
  drawMatrix(player.matrix, player.pos, context);

  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (nextPieceMatrix) {
    const offsetX = (4 - nextPieceMatrix[0].length) / 2;
    const offsetY = (4 - nextPieceMatrix.length) / 2;
    drawMatrix(nextPieceMatrix, { x: offsetX, y: offsetY }, nextContext);
  }
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach((row) => row.reverse());
  else matrix.reverse();
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) player.pos.x -= offset;
}

function playerReset() {
  if (!nextPieceMatrix)
    nextPieceMatrix = createPiece(
      pieces[(pieces.length * Math.random()) | 0],
    );
  player.matrix = nextPieceMatrix;
  nextPieceMatrix = createPiece(
    pieces[(pieces.length * Math.random()) | 0],
  );

  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    isGameOver = true;
    isPaused = true;
    document.getElementById("startBtn").innerText = "重来";
    document.getElementById("startBtn").style.background = "#FF3B30";
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    player.score += rowCount * 10;
    rowCount *= 2;
  }
}

function updateScore() {
  document.getElementById("score").innerText = player.score;
}

function update(time = 0) {
  if (isPaused) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

function toggleGame() {
  const btn = document.getElementById("startBtn");
  if (isGameOver) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    updateScore();
    isGameOver = false;
    playerReset();
    isPaused = false;
    btn.innerText = "暂停";
    btn.style.background = "#FF9500";
    update();
  } else if (isPaused) {
    isPaused = false;
    if (!player.matrix) playerReset();
    btn.innerText = "暂停";
    btn.style.background = "#FF9500";
    update();
  } else {
    isPaused = true;
    btn.innerText = "继续";
    btn.style.background = "#34C759";
  }
}

const startBtn = document.getElementById("startBtn");
if (startBtn) {
  startBtn.addEventListener("click", toggleGame);
}

document.addEventListener("keydown", function (event) {
  if (isPaused && event.key !== " ") return;
  if (event.key === "ArrowLeft") playerMove(-1);
  else if (event.key === "ArrowRight") playerMove(1);
  else if (event.key === "ArrowDown") playerDrop();
  else if (event.key === "ArrowUp") playerRotate(1);
  else if (event.key === " ") toggleGame();
});

const setupMobileBtn = (id, action) => {
  const btn = document.getElementById(id);
  let interval;

  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (isPaused) return;
      action();
      setTimeout(() => {
        if (interval) clearInterval(interval);
        if (btn.matches(":active")) {
          interval = setInterval(action, 100);
        }
      }, 200);
    },
    { passive: false },
  );

  const stop = (e) => {
    if (e) e.preventDefault();
    clearInterval(interval);
  };
  btn.addEventListener("touchend", stop);
  btn.addEventListener("touchcancel", stop);
};

setupMobileBtn("btn-left", () => playerMove(-1));
setupMobileBtn("btn-right", () => playerMove(1));
setupMobileBtn("btn-down", () => playerDrop());
setupMobileBtn("btn-up", () => playerRotate(1));

playerReset();
isPaused = true;
draw();
