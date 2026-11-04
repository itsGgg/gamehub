function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num) return false;
        if (grid[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[br + i][bc + j] === num) return false;
        }
    }
    return true;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function fillGrid(grid) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (grid[i][j] === 0) {
                const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (const n of nums) {
                    if (isValid(grid, i, j, n)) {
                        grid[i][j] = n;
                        if (fillGrid(grid)) return true;
                        grid[i][j] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function solve(grid) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (grid[i][j] === 0) {
                for (let n = 1; n <= 9; n++) {
                    if (isValid(grid, i, j, n)) {
                        grid[i][j] = n;
                        if (solve(grid)) return true;
                        grid[i][j] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function emptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function generatePuzzle(holes = 45) {
    const solution = emptyGrid();
    fillGrid(solution);
    const puzzle = solution.map((row) => row.slice());
    let removed = 0;
    while (removed < holes) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            removed++;
        }
    }
    return { puzzle, solution };
}

function gridToString(grid) {
    return grid.flat().join("");
}

function stringToGrid(s) {
    const g = [];
    for (let i = 0; i < 9; i++) {
        g.push(s.slice(i * 9, i * 9 + 9).split("").map(Number));
    }
    return g;
}

function isCompleteAndValid(state) {
    if (!/^[1-9]{81}$/.test(state)) return false;
    const grid = stringToGrid(state);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const v = grid[i][j];
            grid[i][j] = 0;
            if (!isValid(grid, i, j, v)) {
                grid[i][j] = v;
                return false;
            }
            grid[i][j] = v;
        }
    }
    return true;
}

module.exports = {
    generatePuzzle,
    gridToString,
    stringToGrid,
    solve,
    isCompleteAndValid,
};
