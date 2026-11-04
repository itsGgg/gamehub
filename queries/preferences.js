const db = require("../db");

async function getGameIds(userId) {
    const result = await db.query(
        "SELECT game_id FROM user_preferences WHERE user_id = $1",
        [userId],
    );
    return result.rows.map((row) => row.game_id);
}

async function clear(userId) {
    await db.query("DELETE FROM user_preferences WHERE user_id = $1", [userId]);
}

async function add(userId, gameId) {
    await db.query(
        `INSERT INTO user_preferences (user_id, game_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, game_id) DO NOTHING`,
        [userId, gameId],
    );
}

module.exports = { getGameIds, clear, add };
