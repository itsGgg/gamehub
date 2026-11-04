const db = require("../db");

const BUSY_JOIN = `
  LEFT JOIN LATERAL (
    SELECT jeu, opponent_id FROM (
      SELECT 'Puissance 4' AS jeu,
             CASE WHEN g.player1_id = u.id THEN g.player2_id ELSE g.player1_id END AS opponent_id,
             g.id AS gid
      FROM connect4_games g
      WHERE g.status = 'in_progress' AND (g.player1_id = u.id OR g.player2_id = u.id)
      UNION ALL
      SELECT 'Tic-tac-toe',
             CASE WHEN g.player1_id = u.id THEN g.player2_id ELSE g.player1_id END,
             g.id
      FROM tictactoe_games g
      WHERE g.status = 'in_progress' AND (g.player1_id = u.id OR g.player2_id = u.id)
    ) parties
    ORDER BY gid DESC
    LIMIT 1
  ) busy ON true
  LEFT JOIN users opp ON opp.id = busy.opponent_id`;

async function getUserContact(userId) {
    const result = await db.query(
        "SELECT username, email FROM users WHERE id = $1",
        [userId],
    );
    return result.rows[0];
}

async function userExists(userId) {
    const result = await db.query("SELECT id FROM users WHERE id = $1", [userId]);
    return result.rows[0];
}

async function getGameName(gameId) {
    const result = await db.query("SELECT name FROM games WHERE id = $1", [
        gameId,
    ]);
    return result.rows[0];
}

async function gameExists(gameId) {
    const result = await db.query("SELECT id FROM games WHERE id = $1", [gameId]);
    return result.rows[0];
}

async function createScheduled(senderId, receiverId, gameId, scheduledAt) {
    await db.query(
        `INSERT INTO invitations (sender_id, receiver_id, game_id, scheduled_at, status)
         VALUES ($1, $2, $3, $4, 'scheduled')`,
        [senderId, receiverId, gameId, scheduledAt],
    );
}

async function sharedPreference(senderId, receiverId, gameId) {
    const result = await db.query(
        `SELECT 1
         FROM user_preferences sp
         JOIN user_preferences rp ON rp.game_id = sp.game_id
         WHERE sp.user_id = $1 AND rp.user_id = $2 AND sp.game_id = $3
         LIMIT 1`,
        [senderId, receiverId, gameId],
    );
    return result.rows[0];
}

async function findPendingDuplicate(senderId, receiverId, gameId) {
    const result = await db.query(
        `SELECT id
         FROM invitations
         WHERE sender_id = $1 AND receiver_id = $2 AND game_id = $3
           AND status = 'pending'
         LIMIT 1`,
        [senderId, receiverId, gameId],
    );
    return result.rows[0];
}

async function create(senderId, receiverId, gameId) {
    const result = await db.query(
        `INSERT INTO invitations (sender_id, receiver_id, game_id)
         VALUES ($1, $2, $3)
         RETURNING id, sender_id, receiver_id, game_id, status, created_at`,
        [senderId, receiverId, gameId],
    );
    return result.rows[0];
}

async function listPlayers(userId, query) {
    const result = await db.query(
        `SELECT u.id, u.username, u.is_online, u.is_available,
                busy.jeu AS busy_game, opp.username AS busy_opponent
         FROM users u${BUSY_JOIN}
         WHERE (u.id <> $1 OR $1 IS NULL)
           AND (u.username ILIKE $2 OR $2 IS NULL)
         ORDER BY u.is_online DESC, u.username`,
        [userId, query],
    );
    return result.rows;
}

async function listPlayersWithCommonGames(userId, query) {
    const result = await db.query(
        `SELECT DISTINCT u.id, u.username, u.is_online, u.is_available,
                busy.jeu AS busy_game, opp.username AS busy_opponent
         FROM users u
         JOIN user_preferences up ON up.user_id = u.id
         JOIN user_preferences moi ON moi.game_id = up.game_id AND moi.user_id = $1
         JOIN games g ON g.id = up.game_id AND g.is_multiplayer = true${BUSY_JOIN}
         WHERE u.id <> $1 AND (u.username ILIKE $2 OR $2 IS NULL)
         ORDER BY u.is_online DESC, u.username`,
        [userId, query],
    );
    return result.rows;
}

async function commonGames(playerId, myId) {
    const result = await db.query(
        `SELECT g.id, g.name
         FROM user_preferences up
         JOIN user_preferences moi ON moi.game_id = up.game_id AND moi.user_id = $2
         JOIN games g ON g.id = up.game_id AND g.is_multiplayer = true
         WHERE up.user_id = $1
         ORDER BY g.name`,
        [playerId, myId],
    );
    return result.rows;
}

async function playerPreferences(playerId) {
    const result = await db.query(
        `SELECT g.id, g.name
         FROM user_preferences up
         JOIN games g ON g.id = up.game_id
         WHERE up.user_id = $1 AND g.is_multiplayer = true
         ORDER BY g.name`,
        [playerId],
    );
    return result.rows;
}

async function incomingForUser(userId) {
    const result = await db.query(
        `SELECT i.id, u.username as sender_username, g.name as game_name,
                i.status, i.scheduled_at, i.created_at
         FROM invitations i
         JOIN users u ON u.id = i.sender_id
         JOIN games g ON g.id = i.game_id
         WHERE i.receiver_id = $1
           AND (
             i.status = 'pending'
             OR (i.status = 'scheduled' AND i.scheduled_at <= NOW())
           )
         ORDER BY i.created_at DESC`,
        [userId],
    );
    return result.rows;
}

async function sentByUser(userId) {
    const result = await db.query(
        `SELECT i.id, i.receiver_id, u.username AS receiver_username,
                i.game_id, g.name AS game_name,
                i.status, i.expediteur_confirme, i.confirmation_annulee,
                i.created_at, i.updated_at,
                c4.id AS connect4_game_id,
                ttt.id AS tictactoe_game_id
         FROM invitations i
         JOIN users u ON u.id = i.receiver_id
         JOIN games g ON g.id = i.game_id
         LEFT JOIN connect4_games c4 ON c4.invitation_id = i.id
         LEFT JOIN tictactoe_games ttt ON ttt.invitation_id = i.id
         WHERE i.sender_id = $1
         ORDER BY i.created_at DESC
         LIMIT 50`,
        [userId],
    );
    return result.rows;
}

async function getWithGameName(invitationId) {
    const result = await db.query(
        `SELECT i.id, i.sender_id, i.receiver_id, i.status, g.name AS game_name
         FROM invitations i
         JOIN games g ON g.id = i.game_id
         WHERE i.id = $1`,
        [invitationId],
    );
    return result.rows[0];
}

async function setStatus(invitationId, status) {
    const result = await db.query(
        `UPDATE invitations
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [status, invitationId],
    );
    return result.rows[0];
}

async function getParticipants(invitationId) {
    const result = await db.query(
        "SELECT id, sender_id, receiver_id FROM invitations WHERE id = $1",
        [invitationId],
    );
    return result.rows[0];
}

async function confirmSender(invitationId) {
    await db.query(
        "UPDATE invitations SET expediteur_confirme = true WHERE id = $1",
        [invitationId],
    );
}

async function confirmReceiver(invitationId) {
    await db.query(
        "UPDATE invitations SET destinataire_confirme = true WHERE id = $1",
        [invitationId],
    );
}

async function getConfirmFlags(invitationId) {
    const result = await db.query(
        "SELECT expediteur_confirme, destinataire_confirme FROM invitations WHERE id = $1",
        [invitationId],
    );
    return result.rows[0];
}

async function cancelConfirmation(invitationId) {
    await db.query(
        "UPDATE invitations SET confirmation_annulee = true, updated_at = NOW() WHERE id = $1",
        [invitationId],
    );
}

async function getConfirmationState(invitationId) {
    const result = await db.query(
        `SELECT i.expediteur_confirme, i.destinataire_confirme,
                i.confirmation_annulee, i.status,
                c4.id AS connect4_game_id
         FROM invitations i
         LEFT JOIN connect4_games c4 ON c4.invitation_id = i.id
         WHERE i.id = $1`,
        [invitationId],
    );
    return result.rows[0];
}

module.exports = {
    getUserContact,
    userExists,
    getGameName,
    gameExists,
    createScheduled,
    sharedPreference,
    findPendingDuplicate,
    create,
    listPlayers,
    listPlayersWithCommonGames,
    commonGames,
    playerPreferences,
    incomingForUser,
    sentByUser,
    getWithGameName,
    setStatus,
    getParticipants,
    confirmSender,
    confirmReceiver,
    getConfirmFlags,
    cancelConfirmation,
    getConfirmationState,
};
