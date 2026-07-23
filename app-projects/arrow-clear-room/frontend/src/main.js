import "./styles.css";
import levelData from "./levels.json";

const app = document.querySelector("#app");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateReferenceMaze(rows, cols, targetCount = 130) {
  const candidates = [];
  const random = createRandom(5);
  const occupied = new Set();
  const blockWidth = 8;
  const blockHeight = 8;

  const tryAdd = points => {
    const cleaned = cleanPoints(points);
    if (cleaned.length < 2) return false;
    const path = { id: `g-${candidates.length + 1}`, points: cleaned };
    const cells = pathCells(path);
    if (cells.some(cellKey => occupied.has(cellKey))) return false;
    cells.forEach(cellKey => occupied.add(cellKey));
    candidates.push(path);
    return true;
  };

  for (let y = 0; y <= rows - blockHeight; y += blockHeight) {
    for (let x = 0; x <= cols - blockWidth; x += blockWidth) {
      const centerX = x + blockWidth / 2;
      const centerY = y + blockHeight / 2;
      const directionName = chooseOutwardDirection(centerX, centerY, rows, cols, random);
      tryAdd(buildBlockPath(x, y, blockWidth, blockHeight, directionName, random));
    }
  }

  const solvable = pruneToSolvable(candidates, rows, cols);
  const selected = selectEvenly(solvable, Math.min(targetCount, solvable.length));

  return selected.map((path, index) => ({ id: `g-${index + 1}`, points: path.points }));
}

function cleanPoints(points) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return point[0] !== previous[0] || point[1] !== previous[1];
  });
}

function buildLanePath(x0, x1, y, directionName, turn, pattern) {
  const midLeft = clamp(x0 + 2, x0 + 1, x1 - 2);
  const midRight = clamp(x1 - 2, x0 + 2, x1 - 1);
  const y2 = y + turn;

  if (directionName === "right") {
    if (pattern === 0 || x1 - x0 < 7) return [[x0, y], [x1, y]];
    if (pattern === 1) return [[x0, y2], [x0, y], [x1, y]];
    if (pattern === 2) return [[x0, y], [midLeft, y], [midLeft, y2], [midRight, y2], [midRight, y], [x1, y]];
    return [[x0, y2], [midLeft, y2], [midLeft, y], [x1, y]];
  }

  if (pattern === 0 || x1 - x0 < 7) return [[x1, y], [x0, y]];
  if (pattern === 1) return [[x1, y2], [x1, y], [x0, y]];
  if (pattern === 2) return [[x1, y], [midRight, y], [midRight, y2], [midLeft, y2], [midLeft, y], [x0, y]];
  return [[x1, y2], [midRight, y2], [midRight, y], [x0, y]];
}

function chooseOutwardDirection(centerX, centerY, rows, cols, random) {
  const distances = [
    { key: "left", value: centerX },
    { key: "right", value: cols - 1 - centerX },
    { key: "up", value: centerY },
    { key: "down", value: rows - 1 - centerY }
  ].sort((a, b) => a.value - b.value);

  if (random() < 0.78) return distances[0].key;
  return distances[1].key;
}

function buildBlockPath(x, y, width, height, directionName, random) {
  const x0 = x;
  const y0 = y;
  const x1 = x + width - 1;
  const y1 = y + height - 1;
  const top = y0 + 1;
  const upper = y0 + 3;
  const lower = y1 - 3;
  const bottom = y1 - 1;
  const left = x0 + 1;
  const innerLeft = x0 + 3;
  const innerRight = x1 - 3;
  const right = x1 - 1;
  const variant = Math.floor(random() * 3);

  if (directionName === "left") {
    if (variant === 0) return [[right, top], [left, top], [left, bottom], [right, bottom], [right, upper], [x0, upper]];
    if (variant === 1) return [[right, bottom], [innerLeft, bottom], [innerLeft, top], [right, top], [right, lower], [x0, lower]];
    return [[right, upper], [innerLeft, upper], [innerLeft, bottom], [innerRight, bottom], [innerRight, top], [x0, top]];
  }

  if (directionName === "right") {
    if (variant === 0) return [[left, top], [right, top], [right, bottom], [left, bottom], [left, upper], [x1, upper]];
    if (variant === 1) return [[left, bottom], [innerRight, bottom], [innerRight, top], [left, top], [left, lower], [x1, lower]];
    return [[left, upper], [innerRight, upper], [innerRight, bottom], [innerLeft, bottom], [innerLeft, top], [x1, top]];
  }

  if (directionName === "up") {
    if (variant === 0) return [[left, bottom], [left, top], [right, top], [right, bottom], [innerLeft, bottom], [innerLeft, y0]];
    if (variant === 1) return [[right, bottom], [right, upper], [left, upper], [left, bottom], [innerRight, bottom], [innerRight, y0]];
    return [[innerLeft, bottom], [innerLeft, top], [right, top], [right, lower], [left, lower], [left, y0]];
  }

  if (variant === 0) return [[left, top], [left, bottom], [right, bottom], [right, top], [innerLeft, top], [innerLeft, y1]];
  if (variant === 1) return [[right, top], [right, lower], [left, lower], [left, top], [innerRight, top], [innerRight, y1]];
  return [[innerLeft, top], [innerLeft, bottom], [right, bottom], [right, upper], [left, upper], [left, y1]];
}

function pruneToSolvable(paths, rows, cols) {
  let active = [...paths];
  for (let round = 0; round < 120; round += 1) {
    const result = solvePathList(active, rows, cols);
    if (!result.stuck.length) return active;
    const removeCount = Math.max(1, Math.ceil(result.stuck.length * 0.1));
    const remove = new Set(result.stuck.slice(0, removeCount));
    active = active.filter(path => !remove.has(path));
  }
  return active;
}

function solvePathList(paths, rows, cols) {
  const remaining = [...paths];
  const sequence = [];
  let progressed = true;

  while (remaining.length && progressed) {
    progressed = false;
    for (const path of [...remaining]) {
      if (canPathExit(path, remaining, rows, cols)) {
        remaining.splice(remaining.indexOf(path), 1);
        sequence.push(path);
        progressed = true;
      }
    }
  }

  return { sequence, stuck: remaining };
}

function canPathExit(path, paths, rows, cols) {
  const occupied = new Set();
  paths.forEach(otherPath => {
    if (otherPath === path) return;
    pathCells(otherPath).forEach(cellKey => occupied.add(cellKey));
  });
  const direction = directionOf(path);
  const head = path.points[path.points.length - 1];
  let x = head[0] + direction.dx;
  let y = head[1] + direction.dy;

  while (isInBounds(x, y, rows, cols)) {
    if (occupied.has(`${x},${y}`)) return false;
    x += direction.dx;
    y += direction.dy;
  }

  return true;
}

function buildColumnPath(y0, y1, x, directionName, turn, pattern) {
  const midTop = clamp(y0 + 2, y0 + 1, y1 - 2);
  const midBottom = clamp(y1 - 2, y0 + 2, y1 - 1);
  const x2 = x + turn;

  if (directionName === "down") {
    if (pattern === 0 || y1 - y0 < 7) return [[x, y0], [x, y1]];
    if (pattern === 1) return [[x2, y0], [x, y0], [x, y1]];
    if (pattern === 2) return [[x, y0], [x, midTop], [x2, midTop], [x2, midBottom], [x, midBottom], [x, y1]];
    return [[x2, y0], [x2, midTop], [x, midTop], [x, y1]];
  }

  if (pattern === 0 || y1 - y0 < 7) return [[x, y1], [x, y0]];
  if (pattern === 1) return [[x2, y1], [x, y1], [x, y0]];
  if (pattern === 2) return [[x, y1], [x, midBottom], [x2, midBottom], [x2, midTop], [x, midTop], [x, y0]];
  return [[x2, y1], [x2, midBottom], [x, midBottom], [x, y0]];
}

function selectEvenly(items, count) {
  if (count <= 0) return [];
  if (items.length <= count) return [...items];
  const selected = [];
  for (let index = 0; index < count; index += 1) {
    const itemIndex = Math.floor((index + 0.5) * items.length / count);
    selected.push(items[itemIndex]);
  }
  return selected;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function directionVector(directionName) {
  const map = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };
  return map[directionName];
}

function isInBounds(x, y, rows, cols) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function exitRayCells(head, directionName, rows, cols) {
  const direction = directionVector(directionName);
  const cells = [];
  let x = head[0] + direction.dx;
  let y = head[1] + direction.dy;
  while (isInBounds(x, y, rows, cols)) {
    cells.push(`${x},${y}`);
    x += direction.dx;
    y += direction.dy;
  }
  return cells;
}

function exitRayHitsOccupied(head, directionName, occupied, rows, cols) {
  return exitRayCells(head, directionName, rows, cols).some(cellKey => occupied.has(cellKey));
}

function compressHeadToTailCells(headToTailCells) {
  const cells = [...headToTailCells].reverse();
  const points = [cells[0]];
  let lastDx = null;
  let lastDy = null;
  for (let index = 1; index < cells.length; index += 1) {
    const previous = cells[index - 1];
    const current = cells[index];
    const dx = Math.sign(current[0] - previous[0]);
    const dy = Math.sign(current[1] - previous[1]);
    if (lastDx === null) {
      lastDx = dx;
      lastDy = dy;
    } else if (dx !== lastDx || dy !== lastDy) {
      points.push(previous);
      lastDx = dx;
      lastDy = dy;
    }
  }
  points.push(cells[cells.length - 1]);
  return points;
}

function createMazePath(head, directionName, occupied, protectedCells, rows, cols, random) {
  const direction = directionVector(directionName);
  let x = head[0] - direction.dx;
  let y = head[1] - direction.dy;
  const firstKey = `${x},${y}`;
  if (!isInBounds(x, y, rows, cols) || occupied.has(firstKey) || protectedCells.has(firstKey)) return null;

  const cells = [head, [x, y]];
  const local = new Set([`${head[0]},${head[1]}`, firstKey]);
  let current = { dx: -direction.dx, dy: -direction.dy };
  const targetLength = 5 + Math.floor(random() * 9);
  let attempts = 0;

  while (cells.length < targetLength && attempts < 140) {
    attempts += 1;
    const candidates = [
      current,
      { dx: current.dy, dy: -current.dx },
      { dx: -current.dy, dy: current.dx },
      { dx: -direction.dx, dy: -direction.dy }
    ];
    const options = [];
    candidates.forEach(candidate => {
      const length = 1 + Math.floor(random() * 4);
      let nextX = x;
      let nextY = y;
      const segment = [];
      let ok = true;
      for (let step = 0; step < length; step += 1) {
        nextX += candidate.dx;
        nextY += candidate.dy;
        const cellKey = `${nextX},${nextY}`;
        if (!isInBounds(nextX, nextY, rows, cols) || occupied.has(cellKey) || protectedCells.has(cellKey) || local.has(cellKey)) {
          ok = false;
          break;
        }
        segment.push([nextX, nextY]);
      }
      if (ok) options.push({ candidate, segment, score: segment.length + (candidate === current ? 1 : 0) });
    });
    if (!options.length) break;
    options.sort((a, b) => b.score - a.score);
    const choice = options[Math.floor(random() * Math.min(options.length, 3))];
    choice.segment.forEach(cell => {
      cells.push(cell);
      local.add(`${cell[0]},${cell[1]}`);
      x = cell[0];
      y = cell[1];
    });
    current = choice.candidate;
  }

  if (cells.length < 5) return null;
  return { points: compressHeadToTailCells(cells) };
}

function resolveLevels(data) {
  const templates = data.templates || {};
  return (data.levels || []).map((level, levelIndex) => {
    const template = templates[level.template];
    const rows = level.rows || template.rows;
    const cols = level.cols || template.cols;
    const templatePaths = template.generated === "reference-maze"
      ? generateReferenceMaze(rows, cols, level.targetClears || template.targetPaths).map(path => path.points)
      : template.paths;
    const paths = templatePaths.map((points, pathIndex) => {
      const transformed = points.map(point => {
        const next = [...point];
        if (level.flipX) next[0] = cols - 1 - next[0];
        if (level.flipY) next[1] = rows - 1 - next[1];
        return next;
      });
      return {
        id: `${levelIndex + 1}-${pathIndex + 1}`,
        points: transformed
      };
    });
    return { ...level, rows, cols, paths };
  });
}

const levels = resolveLevels(levelData);

let screen = "home";
let selectedLevel = 0;
let state = null;
let timerId = null;
let activeTimeouts = [];

function clearTimers() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  activeTimeouts = [];
}

function directionOf(path) {
  const points = path.points;
  const head = points[points.length - 1];
  const previous = points[points.length - 2];
  const dx = Math.sign(head[0] - previous[0]);
  const dy = Math.sign(head[1] - previous[1]);
  if (dx > 0) return { key: "right", arrow: "→", dx: 1, dy: 0 };
  if (dx < 0) return { key: "left", arrow: "←", dx: -1, dy: 0 };
  if (dy > 0) return { key: "down", arrow: "↓", dx: 0, dy: 1 };
  return { key: "up", arrow: "↑", dx: 0, dy: -1 };
}

function pathCells(path) {
  const cells = new Set();
  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];
    const dx = Math.sign(end[0] - start[0]);
    const dy = Math.sign(end[1] - start[1]);
    let x = start[0];
    let y = start[1];
    cells.add(`${x},${y}`);
    while (x !== end[0] || y !== end[1]) {
      x += dx;
      y += dy;
      cells.add(`${x},${y}`);
    }
  }
  return [...cells];
}

function createBoard(level) {
  return {
    rows: level.rows,
    cols: level.cols,
    paths: level.paths.map(path => ({
      ...path,
      cells: pathCells(path),
      cleared: false,
      exiting: false,
      blocked: false
    }))
  };
}

function remainingPaths() {
  return state.board.paths.filter(path => !path.cleared && !path.exiting);
}

function buildOccupancy(excludeId) {
  const occupied = new Map();
  remainingPaths().forEach(path => {
    if (path.id === excludeId) return;
    path.cells.forEach(cellKey => occupied.set(cellKey, path.id));
  });
  return occupied;
}

function blockerFor(path) {
  const occupied = buildOccupancy(path.id);
  const direction = directionOf(path);
  const head = path.points[path.points.length - 1];
  let x = head[0] + direction.dx;
  let y = head[1] + direction.dy;
  while (x >= 0 && y >= 0 && x < state.board.cols && y < state.board.rows) {
    const blockerId = occupied.get(`${x},${y}`);
    if (blockerId) return blockerId;
    x += direction.dx;
    y += direction.dy;
  }
  return null;
}

function canExit(path) {
  return blockerFor(path) === null;
}

function startLevel(index) {
  clearTimers();
  selectedLevel = index;
  const level = levels[index];
  state = {
    level,
    board: createBoard(level),
    secondsLeft: level.time,
    movesLeft: level.moves,
    cleared: 0,
    mistakes: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    feedback: "先找箭头前方没有线挡住的那几根，点它们飞出屏幕。",
    finished: false,
    result: null
  };
  screen = "game";
  render();
  timerId = setInterval(() => {
    if (!state || state.finished) return;
    state.secondsLeft -= 1;
    if (state.secondsLeft <= 0) {
      finish(false, "时间到了，迷宫还没清完。");
      return;
    }
    renderGameOnly();
  }, 1000);
}

function clickPath(pathId) {
  if (!state || state.finished) return "ignored";
  const path = state.board.paths.find(entry => entry.id === pathId);
  if (!path || path.cleared || path.exiting) return "ignored";

  state.movesLeft -= 1;

  if (!canExit(path)) {
    const direction = directionOf(path);
    path.blocked = true;
    state.mistakes += 1;
    state.combo = 0;
    state.score = Math.max(0, state.score - 12);
    state.feedback = `${direction.arrow} 前方被别的线挡住了，先清它外侧那一根。`;
    if (state.movesLeft <= 0) {
      finish(false, "步数用完了，还剩一些线没清掉。");
      return "failed";
    }
    renderGameOnly();
    const timeoutId = setTimeout(() => {
      path.blocked = false;
      renderGameOnly();
    }, 360);
    activeTimeouts.push(timeoutId);
    return "blocked";
  }

  path.exiting = true;
  state.cleared += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.score += 70 + state.combo * 4;
  state.feedback = `清掉 1 根，连清 ${state.combo}。`;
  renderGameOnly();

  const timeoutId = setTimeout(() => {
    path.cleared = true;
    path.exiting = false;
    if (isCleared()) {
      finish(true, "满屏箭头迷宫清完了。");
    } else if (state.movesLeft <= 0) {
      finish(false, "步数用完了，还剩一些线没清掉。");
    } else {
      renderGameOnly();
    }
  }, 280);
  activeTimeouts.push(timeoutId);
  return "cleared";
}

function isCleared() {
  return state.board.paths.every(path => path.cleared);
}

function progressPercent() {
  const total = state.board.paths.length;
  const cleared = state.board.paths.filter(path => path.cleared || path.exiting).length;
  return Math.round((cleared / total) * 100);
}

function finish(won, message) {
  if (!state || state.finished) return;
  clearTimers();
  state.finished = true;
  const timeBonus = Math.max(0, state.secondsLeft) * 2;
  const moveBonus = Math.max(0, state.movesLeft) * 3;
  const cleanBonus = won ? 420 : 0;
  state.score += timeBonus + moveBonus + cleanBonus;
  const clearRate = won ? 100 : progressPercent();
  state.result = {
    won,
    message,
    clearRate,
    grade: getGrade(won, clearRate, state.mistakes),
    shareText: `我在《箭头清场王》清掉了 ${clearRate}% 的箭头迷宫，分数 ${state.score}，你来试试能不能不撞线清屏。`
  };
  screen = "result";
  render();
}

function getGrade(won, clearRate, mistakes) {
  if (won && mistakes === 0) return "无误触清屏王";
  if (won) return "箭头迷宫清场王";
  if (clearRate >= 80) return "差一点就通了";
  if (clearRate >= 50) return "已经看懂一半";
  return "先别乱点";
}

function render() {
  if (screen === "home") renderHome();
  if (screen === "levels") renderLevels();
  if (screen === "game") renderGame();
  if (screen === "result") renderResult();
  if (screen === "share") renderShare();
}

function renderHome() {
  clearTimers();
  app.innerHTML = `
    <section class="shell home-screen">
      <div class="topline">Arrow Maze</div>
      <h1>箭头清场王</h1>
      <p class="lead">箭头会互相挡路。只能点前方没线挡住的箭头，一根根把迷宫拆开。</p>
      ${mazePreviewHtml()}
      <button class="primary" data-action="play">开始</button>
      <button class="ghost" data-action="levels">选关</button>
    </section>
  `;
}

function renderLevels() {
  clearTimers();
  app.innerHTML = `
    <section class="shell level-shell">
      <div class="nav-row">
        <button class="icon-button" data-action="home" aria-label="返回">‹</button>
        <div>
          <div class="eyebrow">Level Select</div>
          <h2>选一局</h2>
        </div>
      </div>
      <div class="level-grid">
        ${levels.map((level, index) => `
          <button class="level-card" data-level-index="${index}">
            <span class="level-index">${String(index + 1).padStart(2, "0")}</span>
            <strong>${level.name}</strong>
            <small>${level.paths.length} 根 · ${level.time}s · ${level.moves}步</small>
            <em>${level.tag}</em>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function mazePreviewHtml() {
  const previewLevel = levels[0];
  const previewBoard = {
    rows: previewLevel.rows,
    cols: previewLevel.cols,
    paths: previewLevel.paths.slice(0, 46).map(path => ({
      ...path,
      cleared: false,
      exiting: false,
      blocked: false
    }))
  };
  return `<div class="preview-frame">${mazeSvgHtml(previewBoard, "preview-svg")}</div>`;
}

function svgPoints(path, cellSize, offset) {
  return path.points
    .map(point => `${offset + point[0] * cellSize} ${offset + point[1] * cellSize}`)
    .join(" ");
}

const pathPalette = [
  "#ff6ccf",
  "#53d9ff",
  "#ffe24a",
  "#72f06a",
  "#ff9561",
  "#a88cff",
  "#ff7687",
  "#6ff2c8"
];

function pathColor(pathId) {
  const numeric = pathId
    .split("-")
    .map(part => Number(part.replace(/\D/g, "")) || 0)
    .reduce((total, value) => total * 31 + value, 7);
  return pathPalette[numeric % pathPalette.length];
}

function pathSvg(path, cellSize, offset) {
  if (path.cleared) return "";
  const direction = directionOf(path);
  const classes = ["arrow-path", `dir-${direction.key}`];
  if (path.exiting) classes.push("exiting");
  if (path.blocked) classes.push("blocked");
  return `
    <g class="${classes.join(" ")}" data-path-id="${path.id}" style="--path-color:${pathColor(path.id)}">
      <polyline class="path-hit" points="${svgPoints(path, cellSize, offset)}" />
      <polyline class="path-shadow" points="${svgPoints(path, cellSize, offset)}" />
      <polyline class="path-line" points="${svgPoints(path, cellSize, offset)}" />
    </g>
  `;
}

function mazeSvgHtml(board, className = "maze-svg") {
  const cellSize = 8;
  const offset = 10;
  const width = (board.cols - 1) * cellSize + offset * 2;
  const height = (board.rows - 1) * cellSize + offset * 2;
  return `
    <svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="箭头迷宫">
      <defs>
        <marker id="arrowHead" markerWidth="4.8" markerHeight="4.8" refX="4.05" refY="2.4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 4 2 L 0 4 z" fill="context-stroke"></path>
        </marker>
        <pattern id="dotGrid" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.15" fill="rgba(255,255,255,0.12)"></circle>
        </pattern>
      </defs>
      <rect class="maze-bg" width="${width}" height="${height}"></rect>
      <rect class="maze-dots" width="${width}" height="${height}"></rect>
      ${board.paths.map(path => pathSvg(path, cellSize, offset)).join("")}
    </svg>
  `;
}

function boardHtml() {
  const progress = progressPercent();
  const openCount = getOpenPathIds().length;
  return `
    <div class="hud">
      <span>${state.score}</span>
      <span>${state.secondsLeft}s</span>
      <span>${state.movesLeft}步</span>
      <span>${openCount}可走</span>
    </div>
    <div class="progress" aria-label="清线进度">
      <span style="width:${progress}%"></span>
    </div>
    <div class="maze-wrap">
      <div class="game-logo" aria-hidden="true"><span>箭又一箭</span></div>
      ${mazeSvgHtml(state.board)}
    </div>
    <div class="feedback">${state.feedback}</div>
  `;
}

function renderGame() {
  app.innerHTML = `
    <section class="game-screen">
      <div class="game-top">
        <button class="icon-button" data-action="levels" aria-label="返回">‹</button>
        <div>
          <div class="eyebrow">${state.level.tag}</div>
          <h2>${state.level.name}</h2>
        </div>
        <button class="small-button" data-action="restart">重开</button>
      </div>
      <div id="gameArea">${boardHtml()}</div>
    </section>
  `;
}

function renderGameOnly() {
  const gameArea = document.querySelector("#gameArea");
  if (gameArea) {
    gameArea.innerHTML = boardHtml();
  } else {
    renderGame();
  }
}

function renderResult() {
  const result = state.result;
  app.innerHTML = `
    <section class="shell result-screen">
      <div class="result-card">
        <div class="eyebrow">${result.won ? "Cleared" : "Almost"}</div>
        <h1>${result.grade}</h1>
        <p>${result.message}</p>
        <div class="score-big">${state.score}</div>
        <div class="result-grid">
          <div><strong>${result.clearRate}%</strong><span>清线率</span></div>
          <div><strong>${state.bestCombo}</strong><span>最高连清</span></div>
          <div><strong>${state.mistakes}</strong><span>误触次数</span></div>
          <div><strong>${state.movesLeft}</strong><span>剩余步数</span></div>
        </div>
      </div>
      <button class="primary" data-action="next">${result.won ? "下一局" : "再来一局"}</button>
      <button class="ghost" data-action="share">生成挑战文案</button>
      <button class="text-button" data-action="levels">换一局</button>
    </section>
  `;
}

function renderShare() {
  const result = state.result;
  app.innerHTML = `
    <section class="shell share-screen">
      <div class="poster">
        <span>箭头清场王</span>
        <h1>${result.grade}</h1>
        <p>${state.level.name} · ${state.score}分 · 清线率 ${result.clearRate}%</p>
        ${mazePreviewHtml()}
      </div>
      <div class="copy-box">
        <strong>挑战文案</strong>
        <p>${result.shareText}</p>
      </div>
      <button class="primary" data-action="copy">复制发群文案</button>
      <button class="ghost" data-action="restart">再清一局</button>
      <button class="text-button" data-action="result">返回结果</button>
    </section>
  `;
}

function getOpenPathIds() {
  if (!state) return [];
  return remainingPaths().filter(path => canExit(path)).map(path => path.id);
}

function getBlockedPathIds() {
  if (!state) return [];
  return remainingPaths().filter(path => !canExit(path)).map(path => path.id);
}

function clickFirstOpenPath() {
  const id = getOpenPathIds()[0];
  if (!id) return "none";
  return clickPath(id);
}

window.__arrowClearDebug = {
  clickPath,
  clickFirstOpenPath,
  getBlockedPathIds,
  getOpenPathIds,
  getState: () => state,
  getLevels: () => levels
};

app.addEventListener("click", async event => {
  const pathButton = event.target.closest("[data-path-id]");
  const levelButton = event.target.closest("[data-level-index]");
  const actionButton = event.target.closest("[data-action]");

  if (pathButton) {
    clickPath(pathButton.dataset.pathId);
    return;
  }

  if (levelButton) {
    startLevel(Number(levelButton.dataset.levelIndex));
    return;
  }

  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === "home") {
    screen = "home";
    render();
  }
  if (action === "levels") {
    screen = "levels";
    render();
  }
  if (action === "play") {
    startLevel(0);
  }
  if (action === "restart") {
    startLevel(selectedLevel);
  }
  if (action === "next") {
    const next = state?.result?.won ? (selectedLevel + 1) % levels.length : selectedLevel;
    startLevel(next);
  }
  if (action === "share") {
    screen = "share";
    render();
  }
  if (action === "result") {
    screen = "result";
    render();
  }
  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(state.result.shareText);
      actionButton.textContent = "已复制";
    } catch {
      actionButton.textContent = "长按文案复制";
    }
  }
});

renderHome();
