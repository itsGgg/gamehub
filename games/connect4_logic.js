const ROWS = 6;
const COLS = 7;

function idx(row, col) {
    return row * COLS + col;
}

function newBoard() {
    return "0".repeat(ROWS * COLS);
}

function setCell(board, row, col, value) {
    const i = idx(row, col);
    return board.slice(0, i) + value + board.slice(i + 1);
}

function dropToken(board, col, player) {
    if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[idx(row, col)] === "0") {
            return { row, board: setCell(board, row, col, String(player)) };
        }
    }
    return null;
}

function checkWin(board, row, col) {
    const player = board[idx(row, col)];
    if (player === "0") return false;
    const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
    ];
    for (const [dr, dc] of dirs) {
        let count = 1;
        for (let k = 1; k < 4; k++) {
            const r = row + dr * k;
            const c = col + dc * k;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
            if (board[idx(r, c)] !== player) break;
            count++;
        }
        for (let k = 1; k < 4; k++) {
            const r = row - dr * k;
            const c = col - dc * k;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
            if (board[idx(r, c)] !== player) break;
            count++;
        }
        if (count >= 4) return true;
    }
    return false;
}

function isFull(board) {
    for (let c = 0; c < COLS; c++) {
        if (board[idx(0, c)] === "0") return false;
    }
    return true;
}

module.exports = { ROWS, COLS, newBoard, dropToken, checkWin, isFull };
