const board = document.getElementById('board');
const minesLeft = document.getElementById('mines-left');
const status = document.getElementById('status');
const smiley = document.getElementById('smiley');
const timerDisplay = document.getElementById('timer');
const bestTimeDisplay = document.getElementById('best-time');
const levelSelect = document.getElementById('level');
const newGameButton = document.getElementById('new-game');
let size = 10;
let mineCount = 15;
let gameState = [];
let revealed = [];
let flags = [];
let gameActive = true;
let timer = 0;
let timerInterval = null;
let bestTimes = JSON.parse(localStorage.getItem('minesweeperBestTimes')) || { easy: Infinity, medium: Infinity, hard: Infinity };

// Web Audio API setup for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.1;
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function setDifficulty() {
  const level = levelSelect.value;
  if (level === 'easy') {
    size = 8;
    mineCount = 10;
  } else if (level === 'medium') {
    size = 10;
    mineCount = 15;
  } else {
    size = 12;
    mineCount = 20;
  }
  board.style.gridTemplateColumns = `repeat(${size}, 40px)`;
  resetGame();
}

function initializeGame() {
  gameState = Array(size).fill().map(() => Array(size).fill(0));
  revealed = Array(size).fill().map(() => Array(size).fill(false));
  flags = Array(size).fill().map(() => Array(size).fill(false));
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (gameState[r][c] !== -1) {
      gameState[r][c] = -1;
      minesPlaced++;
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (gameState[r][c] !== -1) {
        gameState[r][c] = countMines(r, c);
      }
    }
  }
  createBoard();
  updateMinesLeft();
  startTimer();
  updateBestTime();
}

function countMines(r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && gameState[nr][nc] === -1) {
        count++;
      }
    }
  }
  return count;
}

function createBoard() {
  board.innerHTML = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.setAttribute('data-row', r);
      cell.setAttribute('data-col', c);
      cell.addEventListener('click', handleCellClick);
      cell.addEventListener('contextmenu', handleRightClick);
      board.appendChild(cell);
    }
  }
}

function handleCellClick(e) {
  if (!gameActive) return;
  smiley.textContent = '😮';
  const r = parseInt(e.target.getAttribute('data-row'));
  const c = parseInt(e.target.getAttribute('data-col'));
  if (revealed[r][c] || flags[r][c]) return;
  revealCell(r, c);
  const value = gameState[r][c];
  playSound(500 + value * 50, 0.1);
  updateBoard();
  checkWin();
}

function handleRightClick(e) {
  e.preventDefault();
  if (!gameActive) return;
  const r = parseInt(e.target.getAttribute('data-row'));
  const c = parseInt(e.target.getAttribute('data-col'));
  if (revealed[r][c]) return;
  flags[r][c] = !flags[r][c];
  playSound(600, 0.1, 'triangle');
  updateBoard();
  updateMinesLeft();
}

function revealCell(r, c) {
  if (r < 0 || r >= size || c < 0 || c >= size || revealed[r][c] || flags[r][c]) return;
  revealed[r][c] = true;
  if (gameState[r][c] === -1) {
    gameActive = false;
    status.textContent = 'Game Over! You hit a mine.';
    status.classList.add('lose');
    smiley.textContent = '😵';
    playSound(200, 0.5, 'square');
    stopTimer();
    revealAllMines();
    return;
  }
  if (gameState[r][c] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        revealCell(r + dr, c + dc);
      }
    }
  }
}

function revealAllMines() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (gameState[r][c] === -1) revealed[r][c] = true;
    }
  }
  updateBoard();
}

function updateBoard() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = board.children[r * size + c];
      if (revealed[r][c]) {
        cell.classList.add('revealed');
        cell.textContent = gameState[r][c] === -1 ? '💣' : gameState[r][c] || '';
        cell.setAttribute('data-value', gameState[r][c]);
        if (gameState[r][c] === -1) cell.classList.add('mine');
      } else if (flags[r][c]) {
        cell.classList.add('flag');
        cell.textContent = '🚩';
      } else {
        cell.textContent = '';
        cell.classList.remove('flag');
      }
    }
  }
}

function updateMinesLeft() {
  const remainingMines = mineCount - flags.flat().filter(Boolean).length;
  minesLeft.textContent = `Mines Left: ${remainingMines}`;
}

function startTimer() {
  stopTimer();
  timer = 0;
  timerDisplay.textContent = `Time: ${timer}s`;
  timerInterval = setInterval(() => {
    timer++;
    timerDisplay.textContent = `Time: ${timer}s`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateBestTime() {
  const level = levelSelect.value;
  const bestTime = bestTimes[level] === Infinity ? 'Not set' : `${bestTimes[level]}s`;
  bestTimeDisplay.textContent = `Best Time: ${bestTime}`;
}

function checkWin() {
  let unrevealed = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!revealed[r][c] && gameState[r][c] !== -1) unrevealed++;
    }
  }
  if (unrevealed === 0) {
    gameActive = false;
    status.textContent = 'You Win! All mines cleared.';
    status.classList.add('win');
    smiley.textContent = '😎';
    playSound(800, 0.5, 'triangle');
    stopTimer();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    flashBoard();
    updateBestTimeOnWin();
  }
}

function updateBestTimeOnWin() {
  const level = levelSelect.value;
  if (timer < bestTimes[level]) {
    bestTimes[level] = timer;
    localStorage.setItem('minesweeperBestTimes', JSON.stringify(bestTimes));
    bestTimeDisplay.textContent = `Best Time: ${bestTimes[level]}s`;
  }
}

function flashBoard() {
  let flashes = 0;
  const interval = setInterval(() => {
    board.style.background = flashes % 2 === 0 ? '#38a169' : '#4a5568';
    flashes++;
    if (flashes > 5) clearInterval(interval);
  }, 300);
}

function resetGame() {
  gameActive = true;
  smiley.textContent = '😊';
  status.textContent = '';
  status.classList.remove('win', 'lose');
  playSound(400, 0.2);
  initializeGame();
}

newGameButton.addEventListener('click', resetGame);
levelSelect.addEventListener('change', setDifficulty);
setDifficulty();
