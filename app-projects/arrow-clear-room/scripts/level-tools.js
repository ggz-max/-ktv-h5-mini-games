function clonePoint(point) {
  return [point[0], point[1]];
}

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

function resolveLevelData(levelData) {
  if (Array.isArray(levelData)) return levelData;
  const templates = levelData.templates || {};
  return (levelData.levels || []).map((level, levelIndex) => {
    const template = templates[level.template];
    if (!template) {
      throw new Error(`${level.name || `level ${levelIndex + 1}`}: template ${level.template} not found`);
    }
    const rows = level.rows || template.rows;
    const cols = level.cols || template.cols;
    const templatePaths = template.generated === "reference-maze"
      ? generateReferenceMaze(rows, cols, level.targetClears || template.targetPaths).map(path => path.points)
      : template.paths;
    const paths = templatePaths.map((points, pathIndex) => {
      const transformed = points.map(point => {
        const next = clonePoint(point);
        if (level.flipX) next[0] = cols - 1 - next[0];
        if (level.flipY) next[1] = rows - 1 - next[1];
        return next;
      });
      return {
        id: `${levelIndex + 1}-${pathIndex + 1}`,
        points: transformed
      };
    });
    return {
      ...level,
      rows,
      cols,
      paths
    };
  });
}

function directionOf(path) {
  const points = path.points;
  const head = points[points.length - 1];
  const previous = points[points.length - 2];
  const dx = Math.sign(head[0] - previous[0]);
  const dy = Math.sign(head[1] - previous[1]);
  if (dx && dy) throw new Error(`${path.id}: diagonal final segment is not supported`);
  if (!dx && !dy) throw new Error(`${path.id}: zero-length final segment`);
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
    if (dx && dy) throw new Error(`${path.id}: diagonal segment ${index}`);
    if (!dx && !dy) throw new Error(`${path.id}: zero-length segment ${index}`);
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

function normalizeLevel(rawLevel, levelIndex = 0) {
  if (!Number.isInteger(rawLevel.rows) || rawLevel.rows <= 0) {
    throw new Error(`${rawLevel.name || `level ${levelIndex + 1}`}: invalid rows`);
  }
  if (!Number.isInteger(rawLevel.cols) || rawLevel.cols <= 0) {
    throw new Error(`${rawLevel.name || `level ${levelIndex + 1}`}: invalid cols`);
  }
  if (!Array.isArray(rawLevel.paths) || rawLevel.paths.length === 0) {
    throw new Error(`${rawLevel.name || `level ${levelIndex + 1}`}: paths required`);
  }

  return {
    ...rawLevel,
    paths: rawLevel.paths.map((path, pathIndex) => ({
      id: path.id || `path-${pathIndex + 1}`,
      points: path.points || path
    }))
  };
}

function validateLevel(rawLevel, levelIndex = 0) {
  const level = normalizeLevel(rawLevel, levelIndex);
  const seenIds = new Set();
  const occupied = new Map();

  level.paths.forEach(path => {
    const label = `${level.name}: ${path.id}`;
    if (seenIds.has(path.id)) throw new Error(`${level.name}: duplicate id ${path.id}`);
    seenIds.add(path.id);
    if (!Array.isArray(path.points) || path.points.length < 2) {
      throw new Error(`${label} needs at least two points`);
    }
    path.points.forEach(point => {
      if (!Array.isArray(point) || point.length !== 2) throw new Error(`${label} has invalid point`);
      if (!Number.isInteger(point[0]) || !Number.isInteger(point[1])) throw new Error(`${label} point must be integer`);
      if (point[0] < 0 || point[1] < 0 || point[0] >= level.cols || point[1] >= level.rows) {
        throw new Error(`${label} point ${point.join(",")} is out of bounds`);
      }
    });
    directionOf(path);
    pathCells(path).forEach(cellKey => {
      if (occupied.has(cellKey)) {
        throw new Error(`${label} overlaps ${occupied.get(cellKey)} at ${cellKey}`);
      }
      occupied.set(cellKey, path.id);
    });
  });

  return level;
}

function buildOccupancy(remaining, excludeId) {
  const occupied = new Map();
  const values = remaining instanceof Map ? remaining.values() : remaining;
  for (const path of values) {
    if (path.id === excludeId) continue;
    pathCells(path).forEach(cellKey => {
      occupied.set(cellKey, path.id);
    });
  }
  return occupied;
}

function canExit(level, path, remaining) {
  const occupied = buildOccupancy(remaining, path.id);
  const direction = directionOf(path);
  const head = path.points[path.points.length - 1];
  let x = head[0] + direction.dx;
  let y = head[1] + direction.dy;

  while (x >= 0 && y >= 0 && x < level.cols && y < level.rows) {
    if (occupied.has(`${x},${y}`)) return false;
    x += direction.dx;
    y += direction.dy;
  }
  return true;
}

function solveLevel(rawLevel, levelIndex = 0) {
  const level = validateLevel(rawLevel, levelIndex);
  const remaining = new Map(level.paths.map(path => [path.id, path]));
  const sequence = [];
  let progressed = true;

  while (remaining.size && progressed) {
    progressed = false;
    for (const [id, path] of [...remaining.entries()]) {
      if (canExit(level, path, remaining)) {
        remaining.delete(id);
        sequence.push(id);
        progressed = true;
      }
    }
  }

  if (remaining.size) {
    const stuck = [...remaining.values()].map(path => `${path.id}${directionOf(path).arrow}`).join(", ");
    throw new Error(`${level.name}: unsolved path(s): ${stuck}; cleared sequence: ${sequence.join(" -> ")}`);
  }

  if (sequence.length > level.moves) {
    throw new Error(`${level.name}: solution needs ${sequence.length} moves, configured moves ${level.moves}`);
  }

  return { level, sequence };
}

module.exports = {
  canExit,
  directionOf,
  generateReferenceMaze,
  pathCells,
  resolveLevelData,
  solveLevel,
  validateLevel
};
