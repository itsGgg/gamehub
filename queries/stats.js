const db = require("../db");

async function forUser(userId) {
    const result = await db.query(
        `SELECT 'connect4' AS game_name,
                COUNT(*) AS finished,
                COUNT(*) FILTER (WHERE winner_id = $1) AS won
         FROM connect4_games
         WHERE status <> 'in_progress' AND (player1_id = $1 OR player2_id = $1)
         UNION ALL
         SELECT 'tic-tac-toe' AS game_name,
                COUNT(*) AS finished,
                COUNT(*) FILTER (WHERE winner_id = $1) AS won
         FROM tictactoe_games
         WHERE status <> 'in_progress' AND (player1_id = $1 OR player2_id = $1)`,
        [userId],
    );
    return result.rows;
}

module.exports = { forUser };
