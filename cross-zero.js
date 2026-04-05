// cross-zero.js — GOMOKU (Five-in-a-Row) Strategic Brain Game
// A real strategy game with minimax AI + alpha-beta pruning.
// Board scales 9×9 → 11×11 → 13×13 → 15×15 as levels increase.
// AI difficulty ramps from random to near-unbeatable.

document.addEventListener("DOMContentLoaded", () => {
    // ─── UI Elements ─────────────────────────────────────────────
    const czCard = document.getElementById("card-cross-zero");
    const czView = document.getElementById("cross-zero-game-view");
    const hubView = document.getElementById("games-hub-view");
    const backBtn = document.getElementById("back-to-hub-cz");
    const statusText = document.getElementById("cz-status-text");
    const boardEl = document.getElementById("cz-board");

    const endModal = document.getElementById("cz-end-modal");
    const modalTitle = document.getElementById("cz-modal-title");
    const modalMsg = document.getElementById("cz-modal-msg");
    const playAgainBtn = document.getElementById("cz-play-again");
    const exitBtn = document.getElementById("cz-exit-btn");

    const levelNumEl = document.getElementById("cz-level-num");
    const hsEl = document.getElementById("cz-hs");
    const levelEl = document.getElementById("cz-level");
    const navBar = document.querySelector(".nav-bar");

    // ─── Game Constants ──────────────────────────────────────────
    const EMPTY = 0, PLAYER = 1, AI = 2;
    const WIN_LENGTH = 5;

    // ─── Game State ──────────────────────────────────────────────
    let board = [];
    let boardSize = 9;
    let cells = [];
    let isGameOver = false;
    let currentTurn = PLAYER;
    let aiTimeout = null;
    let autoAdvanceTimeout = null;
    let moveHistory = [];
    let lastMove = -1;

    // Progression
    let currentLevel = 1;
    let highLevel = 1;
    let levelName = "Beginner 🟢";

    // Load High Score
    if (typeof appStorage !== "undefined") {
        highLevel = parseInt(appStorage.getItem("czHighLevel") || "1", 10);
        if (hsEl) hsEl.textContent = highLevel;
    }

    // ─── Navbar Visibility ───────────────────────────────────────
    function hideNavBar() {
        if (navBar) navBar.style.display = "none";
        document.body.classList.add("game-active");
    }
    function showNavBar() {
        if (navBar) navBar.style.display = "";
        document.body.classList.remove("game-active");
    }

    // ─── Board Configuration by Level ────────────────────────────
    function getBoardConfig(level) {
        if (level <= 3) return { size: 9, levelName: "Beginner 🟢", depth: 1, smartness: 0.3 + level * 0.1 };
        if (level <= 6) return { size: 11, levelName: "Easy 🟡", depth: 2, smartness: 0.6 + (level - 4) * 0.08 };
        if (level <= 9) return { size: 13, levelName: "Medium 🟠", depth: 2, smartness: 0.85 + (level - 7) * 0.03 };
        if (level <= 12) return { size: 13, levelName: "Hard 🔴", depth: 3, smartness: 0.94 + (level - 10) * 0.015 };
        if (level <= 15) return { size: 15, levelName: "Expert 💀", depth: 3, smartness: 0.98 };
        return { size: 15, levelName: "Impossible ☠️", depth: 4, smartness: 1.0 };
    }

    // ─── Board Creation ──────────────────────────────────────────
    function createBoard(size) {
        boardEl.innerHTML = "";
        boardEl.className = "cz-board gomoku-board";
        boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        // Responsive sizing
        const vw = window.innerWidth;
        const maxBoardPx = Math.min(vw - 24, 420);
        boardEl.style.width = maxBoardPx + "px";
        boardEl.style.height = maxBoardPx + "px";

        cells = [];
        for (let i = 0; i < size * size; i++) {
            const cell = document.createElement("div");
            cell.className = "cz-cell gomoku-cell";
            cell.dataset.index = i;

            // Grid line classes for Go-board aesthetic
            const row = Math.floor(i / size), col = i % size;
            if (row === 0) cell.classList.add("gm-top");
            if (row === size - 1) cell.classList.add("gm-bottom");
            if (col === 0) cell.classList.add("gm-left");
            if (col === size - 1) cell.classList.add("gm-right");

            // Star points (hoshi) for reference
            if (size >= 13) {
                const starPoints = getStarPoints(size);
                if (starPoints.some(([sr, sc]) => sr === row && sc === col)) {
                    cell.classList.add("gm-star");
                }
            }

            cell.addEventListener("click", () => handleCellClick(i));
            boardEl.appendChild(cell);
            cells.push(cell);
        }
    }

    function getStarPoints(size) {
        const pts = [];
        const mid = Math.floor(size / 2);
        const edge = size >= 15 ? 3 : 2;
        pts.push([mid, mid]); // center
        pts.push([edge, edge], [edge, size - 1 - edge], [size - 1 - edge, edge], [size - 1 - edge, size - 1 - edge]);
        if (size >= 15) {
            pts.push([mid, edge], [mid, size - 1 - edge], [edge, mid], [size - 1 - edge, mid]);
        }
        return pts;
    }

    // ─── Cell Click Handler ──────────────────────────────────────
    function handleCellClick(index) {
        if (isGameOver || board[index] !== EMPTY || currentTurn !== PLAYER) return;
        makeMove(index, PLAYER);
        if (!isGameOver) {
            currentTurn = AI;
            updateStatusText();
            if (aiTimeout) clearTimeout(aiTimeout);
            aiTimeout = setTimeout(aiMove, 300 + Math.random() * 400);
        }
    }

    // ─── NAVIGATION ──────────────────────────────────────────────
    if (czCard) {
        czCard.addEventListener("click", () => {
            hubView.classList.add("hidden");
            czView.classList.remove("hidden");
            hideNavBar();
            initGame();
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            if (aiTimeout) clearTimeout(aiTimeout);
            if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);
            czView.classList.add("hidden");
            hubView.classList.remove("hidden");
            showNavBar();
        });
    }

    // ─── GAME LOGIC ──────────────────────────────────────────────
    function initGame() {
        if (aiTimeout) clearTimeout(aiTimeout);
        if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);

        const config = getBoardConfig(currentLevel);
        boardSize = config.size;
        levelName = config.levelName;

        board = new Array(boardSize * boardSize).fill(EMPTY);
        moveHistory = [];
        lastMove = -1;
        isGameOver = false;
        currentTurn = PLAYER;

        createBoard(boardSize);
        updateUI();
        updateStatusText();
    }

    function updateUI() {
        if (levelNumEl) levelNumEl.textContent = currentLevel;
        if (hsEl) hsEl.textContent = highLevel;
        if (levelEl) levelEl.textContent = levelName;
    }

    function updateStatusText() {
        if (isGameOver) return;
        if (currentTurn === PLAYER) {
            statusText.innerHTML = `Your Turn (⚫)<br><span style="font-size: 0.8em; color: rgba(255,255,255,0.6);">Get ${WIN_LENGTH} in a row on ${boardSize}×${boardSize}</span>`;
            statusText.style.color = "#00f2fe";
        } else {
            statusText.innerHTML = `AI is thinking...<br><span style="font-size: 0.8em; color: rgba(255,255,255,0.6);">${boardSize}×${boardSize} board</span>`;
            statusText.style.color = "#aaa";
        }
    }

    function makeMove(index, who) {
        board[index] = who;
        moveHistory.push(index);
        lastMove = index;

        const cell = cells[index];
        const stone = document.createElement("div");
        stone.className = who === PLAYER ? "gm-stone gm-black" : "gm-stone gm-white";
        cell.appendChild(stone);

        // Last move indicator
        cells.forEach(c => c.classList.remove("gm-last-move"));
        cell.classList.add("gm-last-move");

        // Move number overlay
        const num = document.createElement("span");
        num.className = "gm-move-num";
        num.textContent = moveHistory.length;
        stone.appendChild(num);

        // Check win
        const winLine = checkWin(index, who);
        if (winLine) {
            highlightWin(winLine);
            endGame(who === PLAYER ? "player" : "ai");
        } else if (board.every(c => c !== EMPTY)) {
            endGame("draw");
        }
    }

    // ─── Win Detection ───────────────────────────────────────────
    function checkWin(index, who) {
        const row = Math.floor(index / boardSize);
        const col = index % boardSize;
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]; // horizontal, vertical, diag-down-right, diag-down-left

        for (const [dr, dc] of dirs) {
            let line = [index];
            // Extend forward
            for (let k = 1; k < WIN_LENGTH; k++) {
                const r = row + dr * k, c = col + dc * k;
                if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) break;
                const idx = r * boardSize + c;
                if (board[idx] !== who) break;
                line.push(idx);
            }
            // Extend backward
            for (let k = 1; k < WIN_LENGTH; k++) {
                const r = row - dr * k, c = col - dc * k;
                if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) break;
                const idx = r * boardSize + c;
                if (board[idx] !== who) break;
                line.push(idx);
            }
            if (line.length >= WIN_LENGTH) return line;
        }
        return null;
    }

    function highlightWin(line) {
        line.forEach(i => cells[i].classList.add("gm-win-cell"));
    }

    // ═══════════════════════════════════════════════════════════
    //  AI ENGINE — Minimax with Alpha-Beta Pruning
    // ═══════════════════════════════════════════════════════════

    function aiMove() {
        if (isGameOver) return;
        const config = getBoardConfig(currentLevel);

        let moveIndex;
        if (Math.random() < config.smartness) {
            moveIndex = findBestMove(config.depth);
        } else {
            // Dumb move: pick a random cell near existing pieces
            moveIndex = findRandomNearMove();
        }

        if (moveIndex === -1) {
            // Fallback — center or random
            const center = Math.floor(boardSize * boardSize / 2);
            moveIndex = board[center] === EMPTY ? center : board.findIndex(v => v === EMPTY);
        }

        makeMove(moveIndex, AI);
        if (!isGameOver) {
            currentTurn = PLAYER;
            updateStatusText();
        }
    }

    function findRandomNearMove() {
        const candidates = getNearMoves(2);
        if (candidates.length === 0) return Math.floor(boardSize * boardSize / 2);
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Get empty cells within `radius` of any placed stone
    function getNearMoves(radius) {
        const moves = new Set();
        for (let i = 0; i < board.length; i++) {
            if (board[i] === EMPTY) continue;
            const r = Math.floor(i / boardSize), c = i % boardSize;
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
                    const idx = nr * boardSize + nc;
                    if (board[idx] === EMPTY) moves.add(idx);
                }
            }
        }
        return Array.from(moves);
    }

    // ─── Minimax with Alpha-Beta ─────────────────────────────────
    function findBestMove(maxDepth) {
        // If board is empty, play center
        if (board.every(v => v === EMPTY)) {
            return Math.floor(boardSize * boardSize / 2);
        }

        // First check for immediate win or block
        const immediateWin = findImmediateThreat(AI);
        if (immediateWin !== -1) return immediateWin;
        const immediateBlock = findImmediateThreat(PLAYER);
        if (immediateBlock !== -1) return immediateBlock;

        const candidates = getNearMoves(2);
        if (candidates.length === 0) return -1;

        // Score and sort candidates for better pruning
        const scored = candidates.map(idx => {
            board[idx] = AI;
            const s = evaluateBoard(AI) - evaluateBoard(PLAYER);
            board[idx] = EMPTY;
            return { idx, s };
        });
        scored.sort((a, b) => b.s - a.s);

        // Limit candidates for performance
        const topMoves = scored.slice(0, Math.min(scored.length, maxDepth >= 4 ? 12 : maxDepth >= 3 ? 15 : 20));

        let bestScore = -Infinity;
        let bestMove = topMoves[0].idx;

        for (const { idx } of topMoves) {
            board[idx] = AI;
            const score = minimax(maxDepth - 1, false, -Infinity, Infinity);
            board[idx] = EMPTY;
            if (score > bestScore) {
                bestScore = score;
                bestMove = idx;
            }
        }
        return bestMove;
    }

    function minimax(depth, isMaximizing, alpha, beta) {
        // Terminal checks
        const aiWin = hasAnyWin(AI);
        if (aiWin) return 100000 + depth;
        const playerWin = hasAnyWin(PLAYER);
        if (playerWin) return -100000 - depth;
        if (depth === 0) return evaluateBoard(AI) - evaluateBoard(PLAYER);

        const candidates = getNearMoves(1);
        if (candidates.length === 0) return 0;

        // Limit search breadth
        const limit = depth >= 3 ? 8 : depth >= 2 ? 10 : 12;
        const subset = candidates.slice(0, Math.min(candidates.length, limit));

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const idx of subset) {
                board[idx] = AI;
                const eval_ = minimax(depth - 1, false, alpha, beta);
                board[idx] = EMPTY;
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const idx of subset) {
                board[idx] = PLAYER;
                const eval_ = minimax(depth - 1, true, alpha, beta);
                board[idx] = EMPTY;
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // ─── Fast Win Check ──────────────────────────────────────────
    function hasAnyWin(who) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r * boardSize + c] !== who) continue;
                // Check right, down, down-right, down-left
                const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
                for (const [dr, dc] of dirs) {
                    let count = 1;
                    for (let k = 1; k < WIN_LENGTH; k++) {
                        const nr = r + dr * k, nc = c + dc * k;
                        if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) break;
                        if (board[nr * boardSize + nc] !== who) break;
                        count++;
                    }
                    if (count >= WIN_LENGTH) return true;
                }
            }
        }
        return false;
    }

    // ─── Find immediate winning/blocking move ────────────────────
    function findImmediateThreat(who) {
        const candidates = getNearMoves(1);
        for (const idx of candidates) {
            board[idx] = who;
            if (hasAnyWin(who)) { board[idx] = EMPTY; return idx; }
            board[idx] = EMPTY;
        }
        return -1;
    }

    // ─── Board Evaluation (Pattern Scoring) ──────────────────────
    // Counts open lines of length 2, 3, 4 (both open-ended and half-open)
    function evaluateBoard(who) {
        let score = 0;
        const opp = who === AI ? PLAYER : AI;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r * boardSize + c] !== who) continue;
                const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
                for (const [dr, dc] of dirs) {
                    const result = countLine(r, c, dr, dc, who, opp);
                    score += result;
                }
            }
        }
        return score;
    }

    function countLine(r, c, dr, dc, who, opp) {
        let count = 1;
        let openEnds = 0;

        // Forward
        let fr = r + dr, fc = c + dc;
        while (fr >= 0 && fr < boardSize && fc >= 0 && fc < boardSize && board[fr * boardSize + fc] === who) {
            count++;
            fr += dr;
            fc += dc;
        }
        if (fr >= 0 && fr < boardSize && fc >= 0 && fc < boardSize && board[fr * boardSize + fc] === EMPTY) openEnds++;

        // Backward
        let br = r - dr, bc = c - dc;
        while (br >= 0 && br < boardSize && bc >= 0 && bc < boardSize && board[br * boardSize + bc] === who) {
            count++;
            br -= dr;
            bc -= dc;
        }
        if (br >= 0 && br < boardSize && bc >= 0 && bc < boardSize && board[br * boardSize + bc] === EMPTY) openEnds++;

        // Only count from the start of the line to avoid double-counting
        // (Only score if this cell is the "first" cell in the line)
        if (br >= 0 && br < boardSize && bc >= 0 && bc < boardSize && board[br * boardSize + bc] === who) {
            return 0; // Not the start — will be counted from the actual start
        }

        if (count >= 5) return 100000;
        if (count === 4 && openEnds === 2) return 10000;  // Open four — almost unstoppable
        if (count === 4 && openEnds === 1) return 1000;   // Half-open four
        if (count === 3 && openEnds === 2) return 1000;   // Open three — very dangerous
        if (count === 3 && openEnds === 1) return 100;    // Half-open three
        if (count === 2 && openEnds === 2) return 100;    // Open two
        if (count === 2 && openEnds === 1) return 10;     // Half-open two
        return 1;
    }

    // ─── TOAST ───────────────────────────────────────────────────
    function showToast(text, color) {
        const old = document.getElementById("cz-toast");
        if (old) old.remove();
        const toast = document.createElement("div");
        toast.id = "cz-toast";
        toast.textContent = text;
        toast.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0);
            z-index: 200; font-size: 1.8rem; font-weight: 900;
            color: ${color}; text-shadow: 0 0 20px ${color}, 0 0 40px ${color};
            text-align: center; pointer-events: none;
            animation: czToastPop 1.8s ease-out forwards;
            font-family: 'Outfit', 'Inter', sans-serif; white-space: nowrap;
        `;
        czView.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // ─── GAME END ────────────────────────────────────────────────
    function endGame(result) {
        isGameOver = true;

        if (result === "draw") {
            statusText.textContent = "Draw!";
            statusText.style.color = "#fff";
            currentLevel++;
            saveHighLevel();
            updateUI();
            const nextConfig = getBoardConfig(currentLevel);
            const msg = nextConfig.size > boardSize
                ? `Draw → Level ${currentLevel} (${nextConfig.size}×${nextConfig.size}!)`
                : `Draw → Level ${currentLevel}`;
            showToast(msg, "#ffffff");
            autoAdvanceTimeout = setTimeout(() => initGame(), 2000);

        } else if (result === "player") {
            statusText.textContent = "Victory!";
            statusText.style.color = "#34d399";
            currentLevel++;
            saveHighLevel();
            updateUI();
            const nextConfig = getBoardConfig(currentLevel);
            const msg = nextConfig.size > boardSize
                ? `🔥 Level ${currentLevel} — ${nextConfig.size}×${nextConfig.size}!`
                : `Victory! → Level ${currentLevel}`;
            showToast(msg, "#34d399");
            autoAdvanceTimeout = setTimeout(() => initGame(), 2200);

        } else {
            statusText.textContent = "Defeat!";
            statusText.style.color = "#ef4444";
            const lostLevel = currentLevel;
            currentLevel = 1;
            saveHighLevel();
            updateUI();
            setTimeout(() => {
                modalTitle.textContent = "Defeated 😔";
                modalTitle.style.color = "#f472b6";
                modalMsg.textContent = `The AI outsmarted you at Level ${lostLevel} on the ${boardSize}×${boardSize} board. Study the patterns and try again.`;
                if (playAgainBtn) playAgainBtn.textContent = "Try Again";
                endModal.classList.remove("hidden");
            }, 1200);
        }
    }

    function saveHighLevel() {
        if (currentLevel > highLevel) {
            highLevel = currentLevel;
            if (typeof appStorage !== "undefined") appStorage.setItem("czHighLevel", highLevel);
        }
    }

    // ─── MODAL BUTTONS ──────────────────────────────────────────
    if (playAgainBtn) {
        playAgainBtn.addEventListener("click", () => {
            endModal.classList.add("hidden");
            initGame();
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener("click", () => {
            endModal.classList.add("hidden");
            czView.classList.add("hidden");
            hubView.classList.remove("hidden");
            showNavBar();
            if (aiTimeout) clearTimeout(aiTimeout);
            if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);
        });
    }
});
