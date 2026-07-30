import {
  AI,
  DIRECTIONS,
  EMPTY,
  PLAYER,
  cloneBoard,
  getEmptyCells,
  inBounds,
  placeStone,
  checkWin,
} from "./game-engine.js";

const WIN_SCORE = 10_000_000;

function lineShape(board, row, col, player, rowStep, colStep) {
  let stones = 1;
  let openEnds = 0;

  for (const direction of [1, -1]) {
    let nextRow = row + rowStep * direction;
    let nextCol = col + colStep * direction;

    while (
      inBounds(board, nextRow, nextCol) &&
      board[nextRow][nextCol] === player
    ) {
      stones += 1;
      nextRow += rowStep * direction;
      nextCol += colStep * direction;
    }

    if (
      inBounds(board, nextRow, nextCol) &&
      board[nextRow][nextCol] === EMPTY
    ) {
      openEnds += 1;
    }
  }

  return { stones, openEnds };
}

function shapeScore(stones, openEnds) {
  if (stones >= 5) return WIN_SCORE;
  if (stones === 4 && openEnds === 2) return 1_200_000;
  if (stones === 4 && openEnds === 1) return 180_000;
  if (stones === 3 && openEnds === 2) return 35_000;
  if (stones === 3 && openEnds === 1) return 4_500;
  if (stones === 2 && openEnds === 2) return 1_200;
  if (stones === 2 && openEnds === 1) return 180;
  if (stones === 1 && openEnds === 2) return 35;
  return 4;
}

export function scoreMove(board, row, col, player) {
  if (!inBounds(board, row, col) || board[row][col] !== EMPTY) return -Infinity;

  board[row][col] = player;
  const score = DIRECTIONS.reduce((total, [rowStep, colStep]) => {
    const shape = lineShape(board, row, col, player, rowStep, colStep);
    return total + shapeScore(shape.stones, shape.openEnds);
  }, 0);
  board[row][col] = EMPTY;
  return score;
}

export function getCandidateMoves(board, radius = 2) {
  const occupied = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] !== EMPTY) occupied.push({ row, col });
    }
  }

  if (occupied.length === 0) {
    const center = Math.floor(board.length / 2);
    return [{ row: center, col: center }];
  }

  const candidates = new Map();
  occupied.forEach(({ row, col }) => {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (
          inBounds(board, nextRow, nextCol) &&
          board[nextRow][nextCol] === EMPTY
        ) {
          candidates.set(`${nextRow}:${nextCol}`, {
            row: nextRow,
            col: nextCol,
          });
        }
      }
    }
  });

  return [...candidates.values()];
}

function immediateMoves(board, candidates, player) {
  return candidates.filter(({ row, col }) => {
    board[row][col] = player;
    const wins = checkWin(board, row, col, player);
    board[row][col] = EMPTY;
    return wins;
  });
}

function centerPreference(board, row, col) {
  const center = (board.length - 1) / 2;
  return Math.max(0, board.length - Math.abs(row - center) - Math.abs(col - center));
}

function normalMove(board, candidates, rng) {
  const winningMoves = immediateMoves(board, candidates, AI);
  if (winningMoves.length) return winningMoves[0];

  const blockingMoves = immediateMoves(board, candidates, PLAYER);
  if (blockingMoves.length) return blockingMoves[0];

  const ranked = candidates
    .map((move) => {
      const attack = scoreMove(board, move.row, move.col, AI);
      const defense = scoreMove(board, move.row, move.col, PLAYER);
      const simulated = cloneBoard(board);
      placeStone(simulated, move.row, move.col, AI);

      const replyThreat = getCandidateMoves(simulated, 1)
        .map((reply) => scoreMove(simulated, reply.row, reply.col, PLAYER))
        .sort((a, b) => b - a)[0] ?? 0;

      return {
        ...move,
        score:
          attack * 1.05 +
          defense * 1.16 -
          replyThreat * 0.24 +
          centerPreference(board, move.row, move.col) * 3 +
          rng() * 18,
      };
    })
    .sort((a, b) => b.score - a.score);

  const pool = ranked.slice(0, Math.min(3, ranked.length));
  return pool[Math.floor(rng() * pool.length)] ?? ranked[0];
}

function mercyMove(board, candidates, rng) {
  const playerWinningMoves = new Set(
    immediateMoves(board, candidates, PLAYER).map(({ row, col }) => `${row}:${col}`),
  );

  let safeToLose = candidates.filter(({ row, col }) => {
    board[row][col] = AI;
    const wouldWin = checkWin(board, row, col, AI);
    board[row][col] = EMPTY;
    return !wouldWin && !playerWinningMoves.has(`${row}:${col}`);
  });

  if (!safeToLose.length) {
    safeToLose = candidates.filter(({ row, col }) => {
      board[row][col] = AI;
      const wouldWin = checkWin(board, row, col, AI);
      board[row][col] = EMPTY;
      return !wouldWin;
    });
  }

  if (!safeToLose.length) safeToLose = getEmptyCells(board);

  const ranked = safeToLose
    .map((move) => ({
      ...move,
      score:
        scoreMove(board, move.row, move.col, AI) * 0.15 -
        scoreMove(board, move.row, move.col, PLAYER) * 0.55 +
        rng() * 900,
    }))
    .sort((a, b) => a.score - b.score);

  const poolStart = Math.floor(ranked.length * 0.15);
  const poolEnd = Math.max(poolStart + 1, Math.ceil(ranked.length * 0.55));
  const pool = ranked.slice(poolStart, poolEnd);
  return pool[Math.floor(rng() * pool.length)] ?? ranked[0];
}

export function chooseAIMove(board, { mercy = false, rng = Math.random } = {}) {
  const candidates = getCandidateMoves(board);
  if (!candidates.length) return null;
  return mercy
    ? mercyMove(board, candidates, rng)
    : normalMove(board, candidates, rng);
}
