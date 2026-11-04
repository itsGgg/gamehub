const express = require("express");
const router = express.Router();
const {
    newBoard,
    placeMove,
    checkWin,
    isFull,
    CELLS,
} = require("../games/tictactoe_logic");
const { requireLoginPage, requireLoginApi } = require("../middleware/auth");
const ttt = require("../queries/tictactoe");

async function loadGame(gameId, userId) {
    const game = await ttt.getGameById(gameId);
    if (!game) return null;
    if (game.player1_id !== userId && game.player2_id !== userId) return null;
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
        res.render("tictactoe", { user: req.session.user, gameId: game.id });
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
        const messages = await ttt.getMessagesSince(gameId, since);

        const win = checkWin(game.board);

        return res.json({
            board: game.board,
            current_turn: game.current_turn,
            you,
            status: game.status,
            winner_id: game.winner_id,
            winning_line: win ? win.line : null,
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
        const cell = Number(req.body.cell);

        const game = await loadGame(gameId, userId);
        if (!game) return res.status(404).json({ message: "Partie introuvable" });
        if (game.status !== "in_progress") {
            return res.status(400).json({ message: "Partie terminee" });
        }

        const you = game.player1_id === userId ? 1 : 2;
        if (game.current_turn !== you) {
            return res.status(400).json({ message: "Ce n'est pas votre tour" });
        }
        if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) {
            return res.status(400).json({ message: "Case invalide" });
        }

        const move = placeMove(game.board, cell, you);
        if (!move) return res.status(400).json({ message: "Case occupee" });

        const win = checkWin(move.board);
        const draw = !win && isFull(move.board);

        if (win) {
            await ttt.setWon(gameId, move.board, userId);
        } else if (draw) {
            await ttt.setDraw(gameId, move.board);
        } else {
            await ttt.setTurn(gameId, move.board, you === 1 ? 2 : 1);
        }

        return res.json({ ok: true, index: move.index });
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
        await ttt.setAbandoned(gameId, opponentId);
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
        await ttt.restart(gameId, newBoard());
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

        const row = await ttt.insertChat(gameId, userId, message);
        return res.json({ id: row.id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
});

module.exports = router;
