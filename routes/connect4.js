const express = require("express");
const router = express.Router();
const {
    newBoard,
    dropToken,
    checkWin,
    isFull,
    COLS,
} = require("../games/connect4_logic");
const { requireLoginPage, requireLoginApi } = require("../middleware/auth");
const c4 = require("../queries/connect4");

async function loadGame(gameId, userId) {
    const game = await c4.getGameById(gameId);
    if (!game) return null;
    if (game.player1_id !== userId && game.player2_id !== userId) return null;

    // If the game was created from an invitation, require both confirmations
    // (expediteur_confirme && destinataire_confirme) before allowing access.
    if (game.invitation_id) {
        if (!(game.expediteur_confirme && game.destinataire_confirme)) {
            return null;
        }
    }
    return game;
}

router.get("/:id", requireLoginPage, async (req, res) => {
    try {
        const gameId = Number(req.params.id);
        if (!Number.isInteger(gameId)) {
            return res.status(400).send("Partie invalide");
        }
        const game = await loadGame(gameId, Number(req.session.user.id));
        if (!game) return res.status(404).send("Partie introuvable");
        res.render("connect4", { user: req.session.user, gameId: game.id });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur serveur");
    }
});

router.get("/:id/state", requireLoginApi, async (req, res) => {
    try {
        const userId = Number(req.session.user.id);
        const gameId = Number(req.params.id);
        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });

        const you = game.player1_id === userId ? 1 : 2;
        const opponent =
            you === 1
                ? { id: game.player2_id, username: game.player2_name }
                : { id: game.player1_id, username: game.player1_name };

        const since = Number(req.query.since) || 0;
        const messages = await c4.getMessagesSince(gameId, since);

        return res.json({
            board: game.board,
            current_turn: game.current_turn,
            you,
            status: game.status,
            winner_id: game.winner_id,
            opponent,
            messages,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

router.post("/:id/move", requireLoginApi, async (req, res) => {
    try {
        const userId = Number(req.session.user.id);
        const gameId = Number(req.params.id);
        const col = Number(req.body.column);

        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });
        if (game.status !== "in_progress") {
            return res.status(400).json({ message: "Partie terminee" });
        }

        const you = game.player1_id === userId ? 1 : 2;
        if (game.current_turn !== you) {
            return res.status(400).json({ message: "Ce n'est pas votre tour" });
        }
        if (!Number.isInteger(col) || col < 0 || col >= COLS) {
            return res.status(400).json({ message: "Colonne invalide" });
        }

        const drop = dropToken(game.board, col, you);
        if (!drop) return res.status(400).json({ message: "Colonne pleine" });

        const won = checkWin(drop.board, drop.row, col);
        const draw = !won && isFull(drop.board);

        if (won) {
            await c4.setWon(gameId, drop.board, userId);
        } else if (draw) {
            await c4.setDraw(gameId, drop.board);
        } else {
            await c4.setTurn(gameId, drop.board, you === 1 ? 2 : 1);
        }

        return res.json({ ok: true, row: drop.row });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

router.post("/:id/resign", requireLoginApi, async (req, res) => {
    try {
        const userId = Number(req.session.user.id);
        const gameId = Number(req.params.id);
        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });
        if (game.status !== "in_progress") return res.json({ ok: true });

        const opponentId =
            game.player1_id === userId ? game.player2_id : game.player1_id;
        await c4.setAbandoned(gameId, opponentId);
        return res.json({ ok: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

router.post("/:id/restart", requireLoginApi, async (req, res) => {
    try {
        const userId = Number(req.session.user.id);
        const gameId = Number(req.params.id);
        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });
        if (game.status === "in_progress") {
            return res.status(400).json({ message: "Partie en cours" });
        }
        await c4.restart(gameId, newBoard());
        return res.json({ ok: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

router.post("/:id/chat", requireLoginApi, async (req, res) => {
    try {
        const userId = Number(req.session.user.id);
        const gameId = Number(req.params.id);
        const message = String(req.body.message || "").trim();
        if (!message) return res.status(400).json({ message: "Message vide" });
        if (message.length > 500) {
            return res.status(400).json({ message: "Message trop long" });
        }

        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });

        const row = await c4.insertChat(gameId, userId, message);
        return res.json({ id: row.id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

module.exports = router;
