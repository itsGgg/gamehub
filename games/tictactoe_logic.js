const SIZE = 3;
const CELLS = SIZE * SIZE;

const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function newBoard() {
    return "0".repeat(CELLS);
}

function setCell(board, index, value) {
    return board.slice(0, index) + value + board.slice(index + 1);
}

function placeMove(board, index, player) {
    if (!Number.isInteger(index) || index < 0 || index >= CELLS) return null;
    if (board[index] !== "0") return null;
    return { index, board: setCell(board, index, String(player)) };
}

function checkWin(board) {
    for (const line of LINES) {
        const a = board[line[0]];
        if (a === "0") continue;
        if (a === board[line[1]] && a === board[line[2]]) {
            return { player: Number(a), line };
        }
    }
    return null;
}

function isFull(board) {
    return !board.includes("0");
}

module.exports = { SIZE, CELLS, LINES, newBoard, placeMove, checkWin, isFull };
