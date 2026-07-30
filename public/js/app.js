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
import { OPPONENTS, getWinProgress, normalizeLevel } from "./campaign.js";

const STORAGE_KEY = "animeGomoku.stats.v1";
const AUDIO_KEY = "animeGomoku.audio.v1";

const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#game-status");
const statusDot = document.querySelector(".status-dot");
const restartButton = document.querySelector("#restart-button");
const audioButton = document.querySelector("#audio-button");
const winsElement = document.querySelector("#wins");
const lossesElement = document.querySelector("#losses");
const drawsElement = document.querySelector("#draws");
const mascot = document.querySelector("#mascot");
const mascotStage = document.querySelector(".mascot-stage");
const mascotBubble = document.querySelector("#mascot-bubble");
const levelLabel = document.querySelector("#level-label");
const opponentName = document.querySelector("#opponent-name");
const opponentTitle = document.querySelector("#opponent-title");
const opponentRank = document.querySelector("#opponent-rank");
const boardOpponentName = document.querySelector("#board-opponent-name");
const campaignProgress = document.querySelector("#campaign-progress");
const eyebrowLevel = document.querySelector("#eyebrow-level");
const resultOverlay = document.querySelector("#result-overlay");
const resultKicker = document.querySelector("#result-kicker");
const resultTitle = document.querySelector("#result-title");
const resultCopy = document.querySelector("#result-copy");
const resultButton = document.querySelector("#result-button");
const saveRestButton = document.querySelector("#save-rest-button");

let board = createBoard();
let gameOver = false;
let aiThinking = false;
let lastMove = null;
let focusedIndex = Math.floor(BOARD_SIZE / 2) * BOARD_SIZE + Math.floor(BOARD_SIZE / 2);
let audioEnabled = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? "true");
let stats = loadStats();
let currentLevel = normalizeLevel(stats.currentLevel);
let currentOpponent = OPPONENTS[currentLevel];
let mercyGame = stats.mercyPending;
let aiTimer = null;
let resultAction = "retry";

function loadStats() {
  const defaults = {
    wins: 0,
    losses: 0,
    draws: 0,
    consecutiveLosses: 0,
    mercyPending: false,
    currentLevel: 0,
    completedLevels: [],
    campaignComplete: false,
  };

  try {
    const saved = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    saved.currentLevel = normalizeLevel(saved.currentLevel);
    saved.completedLevels = Array.isArray(saved.completedLevels)
      ? saved.completedLevels
          .map(normalizeLevel)
          .filter((level, index, levels) => levels.indexOf(level) === index)
      : [];
    return saved;
  } catch {
    return defaults;
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function setMascotMood(mood, message) {
  if (mascot) mascot.dataset.mood = mood;
  mascotBubble.textContent = message;
}

function renderCampaignProgress() {
  campaignProgress.replaceChildren();
  OPPONENTS.forEach((opponent, index) => {
    const item = document.createElement("span");
    item.className = "campaign-step";
    item.dataset.state =
      index === currentLevel
        ? "current"
        : stats.completedLevels.includes(index)
          ? "complete"
          : "locked";
    item.textContent = String(index + 1);
    item.title = `第 ${index + 1} 关 · ${opponent.name}`;
    item.setAttribute(
      "aria-label",
      `${item.title}，${
        item.dataset.state === "complete"
          ? "已通过"
          : item.dataset.state === "current"
            ? "当前关卡"
            : "尚未解锁"
      }`,
    );
    campaignProgress.append(item);
  });
}

function updateOpponent() {
  currentLevel = normalizeLevel(currentLevel);
  currentOpponent = OPPONENTS[currentLevel];

  levelLabel.textContent = `第 ${currentLevel + 1} / ${OPPONENTS.length} 关`;
  eyebrowLevel.textContent = `GAME ${String(currentLevel + 1).padStart(2, "0")}`;
  opponentName.innerHTML = `${currentOpponent.name} <span>${currentOpponent.roman}</span>`;
  opponentTitle.textContent = currentOpponent.title;
  opponentRank.textContent = currentOpponent.rank;
  boardOpponentName.textContent = currentOpponent.name;
  if (mascot) {
    mascot.dataset.opponent = currentOpponent.id;
    mascot.setAttribute("aria-label", `原创女性动漫棋手 ${currentOpponent.name}`);
  }
  if (mascotStage) mascotStage.dataset.opponent = currentOpponent.id;
  renderCampaignProgress();
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

  try {
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
  } catch (error) {
    console.warn("音效播放失败，游戏将继续运行。", error);
  }
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
    const progress = getWinProgress(currentLevel);
    stats.wins += 1;
    stats.consecutiveLosses = 0;
    stats.mercyPending = false;
    if (!stats.completedLevels.includes(currentLevel)) {
      stats.completedLevels.push(currentLevel);
    }
    setStatus("胜利！这一手漂亮。", "win");
    setMascotMood("surprised", currentOpponent.surprised);
    resultKicker.textContent = `STAGE ${currentLevel + 1} CLEAR`;
    saveRestButton.hidden = false;

    if (progress.isFinal) {
      stats.campaignComplete = true;
      stats.currentLevel = currentLevel;
      resultAction = "restart-campaign";
      resultTitle.textContent = "五关通关！";
      resultCopy.textContent = "你击败了阿福，完成棋境少女的全部五关。要重新挑战，还是存档休息？";
      resultButton.innerHTML = '重新挑战五关 <span aria-hidden="true">→</span>';
    } else {
      stats.currentLevel = progress.nextLevel;
      resultAction = "next-level";
      const nextOpponent = OPPONENTS[progress.nextLevel];
      resultTitle.textContent = `${currentOpponent.name} · 突破`;
      resultCopy.textContent = `第 ${currentLevel + 1} 关完成。下一位对手是 ${nextOpponent.name}，现在继续还是存档休息？`;
      resultButton.innerHTML = `进入第 ${progress.nextLevel + 1} 关 <span aria-hidden="true">→</span>`;
    }
    playTone(784, 0.16, "square", 0.05);
    window.setTimeout(() => playTone(1046, 0.22, "square", 0.045), 90);
  } else if (result === "ai") {
    stats.losses += 1;
    stats.consecutiveLosses += 1;
    if (stats.consecutiveLosses >= 2) stats.mercyPending = true;
    setStatus("本局惜败，再来一次？", "lose");
    setMascotMood("smug", currentOpponent.smug);
    resultKicker.textContent = `STAGE ${currentLevel + 1}`;
    resultTitle.textContent = "TRY AGAIN";
    resultCopy.textContent = `${currentOpponent.name} 的白子先连成五颗。观察交叉点，再挑战本关吧。`;
    resultAction = "retry";
    resultButton.innerHTML = '重试本关 <span aria-hidden="true">→</span>';
    saveRestButton.hidden = true;
    playTone(196, 0.25, "sawtooth", 0.035);
  } else {
    stats.draws += 1;
    setStatus("棋盘已满，平局！", "draw");
    setMascotMood("happy", "能下满整张棋盘，也是一种默契。");
    resultKicker.textContent = `STAGE ${currentLevel + 1}`;
    resultTitle.textContent = "DRAW";
    resultCopy.textContent = "没有空位了。这是一场势均力敌的对局。";
    resultAction = "retry";
    resultButton.innerHTML = '重试本关 <span aria-hidden="true">→</span>';
    saveRestButton.hidden = true;
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
  setMascotMood("thinking", currentOpponent.thinking);
  renderBoard();
  aiTimer = window.setTimeout(runAI, 260 + Math.random() * 240);
}

function runAI() {
  aiTimer = null;
  if (gameOver || !aiThinking) return;

  let move = null;
  try {
    move = chooseAIMove(board, {
      mercy: mercyGame,
      skill: currentOpponent.skill,
    });
  } catch (error) {
    console.error("AI 落子计算失败，将使用备用落点。", error);
  }

  if (!move) {
    const center = Math.floor(BOARD_SIZE / 2);
    const legalMoves = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] === EMPTY) {
          legalMoves.push({
            row,
            col,
            distance: Math.abs(row - center) + Math.abs(col - center),
          });
        }
      }
    }
    legalMoves.sort((a, b) => a.distance - b.distance);
    move = legalMoves[0] ?? null;
  }

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
  setMascotMood("happy", currentOpponent.turn);
  renderBoard();
}

function newGame() {
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
  board = createBoard();
  gameOver = false;
  aiThinking = false;
  lastMove = null;
  mercyGame = stats.mercyPending;
  focusedIndex = Math.floor(BOARD_SIZE / 2) * BOARD_SIZE + Math.floor(BOARD_SIZE / 2);
  if (resultOverlay.open) resultOverlay.close();
  updateOpponent();
  setStatus("轮到你了 · 黑子", "ready");
  setMascotMood("happy", currentOpponent.intro);
  renderBoard();
}

function handleResultAction() {
  if (resultAction === "next-level") {
    currentLevel = normalizeLevel(stats.currentLevel);
    newGame();
    return;
  }

  if (resultAction === "restart-campaign") {
    currentLevel = 0;
    stats.currentLevel = 0;
    stats.completedLevels = [];
    stats.campaignComplete = false;
    saveStats();
    newGame();
    return;
  }

  newGame();
}

function saveAndRest() {
  saveStats();

  if (stats.campaignComplete) {
    if (resultOverlay.open) resultOverlay.close();
    setStatus("五关已通关，进度已存档。", "win");
    setMascotMood("happy", "随时回来，我会在最终关等你。");
    return;
  }

  currentLevel = normalizeLevel(stats.currentLevel);
  newGame();
  setStatus(`已存档 · 第 ${currentLevel + 1} 关等待挑战`, "ready");
  setMascotMood("happy", `${currentOpponent.name} 已在棋盘前等你回来。`);
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
resultButton.addEventListener("click", handleResultAction);
saveRestButton.addEventListener("click", saveAndRest);
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
