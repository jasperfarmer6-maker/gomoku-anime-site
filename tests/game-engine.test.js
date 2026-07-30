import test from "node:test";
import assert from "node:assert/strict";

import {
  AI,
  PLAYER,
  checkWin,
  createBoard,
  isBoardFull,
  placeStone,
} from "../public/js/game-engine.js";
import { chooseAIMove } from "../public/js/ai.js";

function placeLine(board, cells, player) {
  cells.forEach(([row, col]) => assert.equal(placeStone(board, row, col, player), true));
}

test("detects horizontal, vertical, and both diagonal wins", () => {
  const lines = [
    [[7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
    [[2, 9], [3, 9], [4, 9], [5, 9], [6, 9]],
    [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7]],
    [[3, 11], [4, 10], [5, 9], [6, 8], [7, 7]],
  ];

  lines.forEach((line) => {
    const board = createBoard();
    placeLine(board, line, PLAYER);
    const [row, col] = line.at(-1);
    assert.equal(checkWin(board, row, col, PLAYER), true);
  });
});

test("rejects duplicate, invalid, and out-of-bounds moves", () => {
  const board = createBoard();
  assert.equal(placeStone(board, 7, 7, PLAYER), true);
  assert.equal(placeStone(board, 7, 7, AI), false);
  assert.equal(placeStone(board, -1, 0, PLAYER), false);
  assert.equal(placeStone(board, 15, 0, PLAYER), false);
  assert.equal(placeStone(board, 0, 0, 9), false);
});

test("detects a full board", () => {
  const board = createBoard(3);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      placeStone(board, row, col, (row + col) % 2 ? PLAYER : AI);
    }
  }
  assert.equal(isBoardFull(board), true);
});

test("normal AI takes an immediate win", () => {
  const board = createBoard();
  placeLine(board, [[7, 4], [7, 5], [7, 6], [7, 7]], AI);
  const move = chooseAIMove(board, { rng: () => 0 });
  assert.ok(
    (move.row === 7 && move.col === 3) ||
      (move.row === 7 && move.col === 8),
  );
});

test("normal AI blocks an immediate player win", () => {
  const board = createBoard();
  placeLine(board, [[6, 4], [6, 5], [6, 6], [6, 7]], PLAYER);
  const move = chooseAIMove(board, { rng: () => 0 });
  assert.ok(
    (move.row === 6 && move.col === 3) ||
      (move.row === 6 && move.col === 8),
  );
});

test("mercy AI avoids completing its own five when alternatives exist", () => {
  const board = createBoard();
  placeLine(board, [[7, 4], [7, 5], [7, 6], [7, 7]], AI);
  placeStone(board, 5, 5, PLAYER);
  const move = chooseAIMove(board, { mercy: true, rng: () => 0.25 });
  assert.notDeepEqual(move, { row: 7, col: 3 });
  assert.notDeepEqual(move, { row: 7, col: 8 });
});

test("mercy AI leaves a player's immediate winning point open", () => {
  const board = createBoard();
  placeLine(board, [[8, 4], [8, 5], [8, 6], [8, 7]], PLAYER);
  placeStone(board, 5, 5, AI);
  const move = chooseAIMove(board, { mercy: true, rng: () => 0.4 });
  assert.notEqual(`${move.row}:${move.col}`, "8:3");
  assert.notEqual(`${move.row}:${move.col}`, "8:8");
});
