import {
  AI,
  BOARD_SIZE,
  EMPTY,
  PLAYER,
  checkWin,
  createBoard,
  isBoardFull,
  placeStone,
} from "./game-engine.js";
import { chooseAIMove } from "./ai.js";

const STORAGE_KEY = "pixelGomoku.stats.v1";
const AUDIO_KEY = "pixelGomoku.audio.v1";

const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#game-status");
const statusDot = document.querySelector(".status-dot");
const restartButton = document.querySelector("#restart-button");
const audioButton = document.querySelector("#audio-button");
const winsElement = document.querySelector("#wins");
const lossesElement = document.querySelector("#losses");
const drawsElement = document.querySelector("#draws");
const mascot = document.querySelector("#mascot");
const mascotBubble = document.querySelector("#mascot-bubble");
const resultOverlay = document.querySelector("#result-overlay");
const resultTitle = document.querySelector("#result-title");
const resultCopy = document.querySelector("#result-copy");
const resultButton = document.querySelector("#result-button");

let board = createBoard();
let gameOver = false;
let aiThinking = false;
let lastMove = null;
let focusedIndex = Math.floor(BOARD_SIZE / 2) * BOARD_SIZE + Math.floor(BOARD_SIZE / 2);
let audioEnabled = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? "true");
let stats = loadStats();
let mercyGame = stats.mercyPending;

function loadStats() {
  const defaults = {
    wins: 0,
    losses: 0,
    draws: 0,
    consecutiveLosses: 0,
    mercyPending: false,
  };

  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return defaults;
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function setMascotMood(mood, message) {
  mascot.dataset.mood = mood;
  mascotBubble.textContent = message;
}

function setStatus(message, state = "ready") {
  statusElement.textContent = message;
  statusDot.dataset.state = state;
}

function updateStats() {
  winsElement.textContent = stats.wins;
  lossesElement.textContent = stats.losses;
  drawsElement.textContent = stats.draws;
}

function updateAudioButton() {
  audioButton.setAttribute("aria-pressed", String(audioEnabled));
  audioButton.querySelector(".audio-label").textContent = audioEnabled ? "音效 ON" : "音效 OFF";
  audioButton.querySelector(".audio-icon").textContent = audioEnabled ? "♪" : "×";
}

function playTone(frequency, duration = 0.08, type = "square", volume = 0.04) {
  if (!audioEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.addEventListener("ended", () => context.close());
}

function renderBoard() {
  const cells = boardElement.children;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const index = row * BOARD_SIZE + col;
      const cell = cells[index];
      const value = board[row][col];
      cell.dataset.stone =
        value === PLAYER ? "black" : value === AI ? "white" : "empty";
      cell.classList.toggle(
        "is-last",
        lastMove?.row === row && lastMove?.col === col,
      );
      cell.disabled = value !== EMPTY || gameOver || aiThinking;
      cell.setAttribute(
        "aria-label",
        `${row + 1} 行 ${col + 1} 列${
          value === PLAYER ? "，黑子" : value === AI ? "，白子" : "，空位"
        }`,
      );
      cell.tabIndex = index === focusedIndex ? 0 : -1;
    }
  }
}

function createCells() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "board-cell";
      button.dataset.row = row;
      button.dataset.col = col;
      button.addEventListener("click", onPlayerMove);
      fragment.append(button);
    }
  }
  boardElement.append(fragment);
}

function finishGame(result) {
  gameOver = true;
  aiThinking = false;

  if (result === "player") {
    stats.wins += 1;
    stats.consecutiveLosses = 0;
    stats.mercyPending = false;
    setStatus("胜利！这一手漂亮。", "win");
    setMascotMood("surprised", "欸？！这条线是什么时候连起来的！");
    resultTitle.textContent = "YOU WIN!";
    resultCopy.textContent = "五颗黑子连成一线。棋盘记住了你的名字。";
    playTone(784, 0.16, "square", 0.05);
    window.setTimeout(() => playTone(1046, 0.22, "square", 0.045), 90);
  } else if (result === "ai") {
    stats.losses += 1;
    stats.consecutiveLosses += 1;
    if (stats.consecutiveLosses >= 2) stats.mercyPending = true;
    setStatus("本局惜败，再来一次？", "lose");
    setMascotMood("smug", "承让啦。再下一局，我可不会大意……");
    resultTitle.textContent = "TRY AGAIN";
    resultCopy.textContent = "白子先连成五颗。观察交叉点，再挑战一次吧。";
    playTone(196, 0.25, "sawtooth", 0.035);
  } else {
    stats.draws += 1;
    setStatus("棋盘已满，平局！", "draw");
    setMascotMood("happy", "能下满整张棋盘，也是一种默契。");
    resultTitle.textContent = "DRAW";
    resultCopy.textContent = "没有空位了。这是一场势均力敌的对局。";
    playTone(440, 0.18, "triangle", 0.04);
  }

  saveStats();
  updateStats();
  renderBoard();
  window.setTimeout(() => resultOverlay.showModal(), 380);
}

function onPlayerMove(event) {
  if (gameOver || aiThinking) return;
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  if (!placeStone(board, row, col, PLAYER)) return;

  focusedIndex = row * BOARD_SIZE + col;
  lastMove = { row, col, player: PLAYER };
  playTone(150, 0.055, "square", 0.035);
  renderBoard();

  if (checkWin(board, row, col, PLAYER)) {
    finishGame("player");
    return;
  }
  if (isBoardFull(board)) {
    finishGame("draw");
    return;
  }

  aiThinking = true;
  setStatus("AI 正在计算落点…", "thinking");
  setMascotMood("thinking", "嗯……这条线有点危险。");
  renderBoard();
  window.setTimeout(runAI, 380 + Math.random() * 420);
}

function runAI() {
  if (gameOver) return;
  const move = chooseAIMove(board, { mercy: mercyGame });
  if (!move) {
    finishGame("draw");
    return;
  }

  placeStone(board, move.row, move.col, AI);
  lastMove = { ...move, player: AI };
  aiThinking = false;
  playTone(310, 0.065, "triangle", 0.045);

  if (checkWin(board, move.row, move.col, AI)) {
    finishGame("ai");
    return;
  }
  if (isBoardFull(board)) {
    finishGame("draw");
    return;
  }

  setStatus("轮到你了 · 黑子", "ready");
  setMascotMood("happy", "轮到你。别只盯着一条线哦！");
  renderBoard();
}

function newGame() {
  board = createBoard();
  gameOver = false;
  aiThinking = false;
  lastMove = null;
  mercyGame = stats.mercyPending;
  focusedIndex = Math.floor(BOARD_SIZE / 2) * BOARD_SIZE + Math.floor(BOARD_SIZE / 2);
  resultOverlay.close();
  setStatus("轮到你了 · 黑子", "ready");
  setMascotMood("happy", "五颗连成线就赢。你先来！");
  renderBoard();
}

function moveFocus(deltaRow, deltaCol) {
  const currentRow = Math.floor(focusedIndex / BOARD_SIZE);
  const currentCol = focusedIndex % BOARD_SIZE;
  const row = Math.max(0, Math.min(BOARD_SIZE - 1, currentRow + deltaRow));
  const col = Math.max(0, Math.min(BOARD_SIZE - 1, currentCol + deltaCol));
  focusedIndex = row * BOARD_SIZE + col;
  renderBoard();
  boardElement.children[focusedIndex].focus();
}

boardElement.addEventListener("keydown", (event) => {
  const moves = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  if (moves[event.key]) {
    event.preventDefault();
    moveFocus(...moves[event.key]);
  }
});

restartButton.addEventListener("click", newGame);
resultButton.addEventListener("click", newGame);
audioButton.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  localStorage.setItem(AUDIO_KEY, JSON.stringify(audioEnabled));
  updateAudioButton();
  playTone(660);
});

createCells();
updateStats();
updateAudioButton();
newGame();
