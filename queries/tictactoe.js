const db = require("../db");

async function createFromInvitation(invitationId, player1Id, player2Id, board) {
    const result = await db.query(
        `insert into tictactoe_games (invitation_id, player1_id, player2_id, board)
         values ($1, $2, $3, $4)
         returning id`,
        [invitationId, player1Id, player2Id, board],
    );
    return result.rows[0];
}

async function getGameById(gameId) {
    const result = await db.query(
        `select g.id, g.player1_id, g.player2_id, g.board, g.current_turn,
                g.status, g.winner_id,
                u1.username as player1_name, u2.username as player2_name
         from tictactoe_games g
         join users u1 on u1.id = g.player1_id
         join users u2 on u2.id = g.player2_id
         where g.id = $1`,
        [gameId],
    );
    return result.rows[0];
}

async function getMessagesSince(gameId, since) {
    const result = await db.query(
        `select c.id, c.user_id, u.username, c.message, c.created_at
         from tictactoe_chat c
         join users u on u.id = c.user_id
         where c.game_id = $1 and c.id > $2
         order by c.id asc`,
        [gameId, since],
    );
    return result.rows;
}

async function setWon(gameId, board, winnerId) {
    await db.query(
        `update tictactoe_games
         set board = $1, status = 'won', winner_id = $2,
             finished_at = current_timestamp
         where id = $3`,
        [board, winnerId, gameId],
    );
}

async function setDraw(gameId, board) {
    await db.query(
        `update tictactoe_games
         set board = $1, status = 'draw', finished_at = current_timestamp
         where id = $2`,
        [board, gameId],
    );
}

async function setTurn(gameId, board, turn) {
    await db.query(
        `update tictactoe_games set board = $1, current_turn = $2 where id = $3`,
        [board, turn, gameId],
    );
}

async function setAbandoned(gameId, winnerId) {
    await db.query(
        `update tictactoe_games
         set status = 'abandoned', winner_id = $1, finished_at = current_timestamp
         where id = $2`,
        [winnerId, gameId],
    );
}

async function restart(gameId, board) {
    await db.query(
        `update tictactoe_games
         set board = $1, current_turn = 1, status = 'in_progress',
             winner_id = null, finished_at = null
         where id = $2`,
        [board, gameId],
    );
}

async function insertChat(gameId, userId, message) {
    const result = await db.query(
        `insert into tictactoe_chat (game_id, user_id, message)
         values ($1, $2, $3)
         returning id`,
        [gameId, userId, message],
    );
    return result.rows[0];
}

module.exports = {
    createFromInvitation,
    getGameById,
    getMessagesSince,
    setWon,
    setDraw,
    setTurn,
    setAbandoned,
    restart,
    insertChat,
};
