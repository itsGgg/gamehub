const db = require("../db");

async function findByIdentifier(identifier) {
    const result = await db.query(
        `SELECT id, username, email, password_hash, date_naissance, is_available
         FROM users
         WHERE username = $1 OR email = $1`,
        [identifier],
    );
    return result.rows[0];
}

async function findById(id) {
    const result = await db.query(
        `SELECT id, username, email,
                to_char(date_naissance, 'YYYY-MM-DD') AS date_naissance,
                is_available
         FROM users
         WHERE id = $1`,
        [id],
    );
    return result.rows[0];
}

async function findBasicById(id) {
    const result = await db.query(
        `SELECT id, username, email,
                to_char(date_naissance, 'YYYY-MM-DD') AS date_naissance
         FROM users WHERE id = $1`,
        [id],
    );
    return result.rows[0];
}

async function existsByUsernameOrEmail(username, email) {
    const result = await db.query(
        "SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1",
        [username, email],
    );
    return result.rows[0];
}

async function create(username, email, dateNaissance, passwordHash) {
    const result = await db.query(
        `INSERT INTO users (username, email, date_naissance, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, is_available`,
        [username, email, dateNaissance, passwordHash],
    );
    return result.rows[0];
}

async function setOnline(id, value) {
    await db.query("UPDATE users SET is_online = $2 WHERE id = $1", [id, value]);
}

async function setAvailability(id, value) {
    await db.query("UPDATE users SET is_available = $2 WHERE id = $1", [id, value]);
}

async function toggleAvailability(id) {
    const result = await db.query(
        `UPDATE users SET is_available = NOT is_available
         WHERE id = $1
         RETURNING is_available`,
        [id],
    );
    return result.rows[0];
}

async function updatePassword(id, passwordHash) {
    const result = await db.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id",
        [passwordHash, id],
    );
    return result.rows[0];
}

// `field` must be a whitelisted column name (validated by the caller).
async function updateField(field, value, id) {
    const result = await db.query(
        `UPDATE users SET ${field} = $1 WHERE id = $2
         RETURNING id, username, email,
                   to_char(date_naissance, 'YYYY-MM-DD') AS date_naissance,
                   is_available`,
        [value, id],
    );
    return result.rows[0];
}

module.exports = {
    findByIdentifier,
    findById,
    findBasicById,
    existsByUsernameOrEmail,
    create,
    setOnline,
    setAvailability,
    toggleAvailability,
    updatePassword,
    updateField,
};
