const db = require("../db");

async function listAll() {
    const result = await db.query(
        "select id, name, description from games order by name",
    );
    return result.rows;
}

async function listMultiplayer() {
    const result = await db.query(
        "SELECT id, name FROM games WHERE is_multiplayer = true ORDER BY name",
    );
    return result.rows;
}

module.exports = { listAll, listMultiplayer };
