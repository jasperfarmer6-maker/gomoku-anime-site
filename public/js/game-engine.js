export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const PLAYER = 1;
export const AI = 2;

export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function createBoard(size = BOARD_SIZE) {
  return Array.from({ length: size }, () => Array(size).fill(EMPTY));
}

export function inBounds(board, row, col) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    col >= 0 &&
    row < board.length &&
    col < board.length
  );
}

export function placeStone(board, row, col, player) {
  if (
    !inBounds(board, row, col) ||
    board[row][col] !== EMPTY ||
    ![PLAYER, AI].includes(player)
  ) {
    return false;
  }

  board[row][col] = player;
  return true;
}

export function countDirection(board, row, col, player, rowStep, colStep) {
  let count = 0;
  let nextRow = row + rowStep;
  let nextCol = col + colStep;

  while (
    inBounds(board, nextRow, nextCol) &&
    board[nextRow][nextCol] === player
  ) {
    count += 1;
    nextRow += rowStep;
    nextCol += colStep;
  }

  return count;
}

export function checkWin(board, row, col, player) {
  if (!inBounds(board, row, col) || board[row][col] !== player) {
    return false;
  }

  return DIRECTIONS.some(([rowStep, colStep]) => {
    const total =
      1 +
      countDirection(board, row, col, player, rowStep, colStep) +
      countDirection(board, row, col, player, -rowStep, -colStep);
    return total >= 5;
  });
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function getEmptyCells(board) {
  const cells = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] === EMPTY) cells.push({ row, col });
    }
  }
  return cells;
}
