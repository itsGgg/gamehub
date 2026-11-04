const db = require("../db");

async function createGame(userId, puzzle, solution) {
    const result = await db.query(
        `insert into sudoku_games (user_id, puzzle, solution, state)
         values ($1, $2, $3, $2)
         returning id`,
        [userId, puzzle, solution],
    );
    return result.rows[0];
}

async function getGameForUser(gameId, userId) {
    const result = await db.query(
        `select puzzle, solution, finished
         from sudoku_games
         where id = $1 and user_id = $2`,
        [gameId, userId],
    );
    return result.rows[0];
}

async function getSolutionForUser(gameId, userId) {
    const result = await db.query(
        `select solution from sudoku_games
         where id = $1 and user_id = $2`,
        [gameId, userId],
    );
    return result.rows[0];
}

async function markWon(gameId, state) {
    await db.query(
        `update sudoku_games
         set state = $1, finished = true, won = true,
             finished_at = current_timestamp
         where id = $2`,
        [state, gameId],
    );
}

async function saveState(gameId, state) {
    await db.query(
        `update sudoku_games set state = $1 where id = $2`,
        [state, gameId],
    );
}

async function markFinished(gameId, userId) {
    await db.query(
        `update sudoku_games
         set finished = true, finished_at = current_timestamp
         where id = $1 and user_id = $2 and not finished`,
        [gameId, userId],
    );
}

module.exports = {
    createGame,
    getGameForUser,
    getSolutionForUser,
    markWon,
    saveState,
    markFinished,
};
