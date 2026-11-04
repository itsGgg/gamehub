const express = require("express");
const router = express.Router();
const { newBoard: c4NewBoard } = require("../games/connect4_logic");
const { newBoard: tttNewBoard } = require("../games/tictactoe_logic");
const { envoyerEmail } = require("../mailer");
const { requireLoginApi: requireAuth } = require("../middleware/auth");
const q = require("../queries/invitations");
const c4 = require("../queries/connect4");
const ttt = require("../queries/tictactoe");
const stats = require("../queries/stats");

router.post("/hors-ligne", requireAuth, async (req, res) => {
  try {
    const senderId = Number(req.session.user.id);
    const receiverId = Number(req.body.receiver_id);
    const gameId = Number(req.body.game_id);
    const scheduledAt = req.body.scheduled_at;

    if (!receiverId || !gameId || !scheduledAt) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const date = new Date(scheduledAt);
    const annee = date.getFullYear();
    if (isNaN(date.getTime()) || annee < 2025 || annee > 2099) {
      return res.status(400).json({ message: "Date invalide" });
    }

    const receiver = await q.getUserContact(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Joueur introuvable" });
    }

    const game = await q.getGameName(gameId);
    if (!game) {
      return res.status(404).json({ message: "Jeu introuvable" });
    }

    await q.createScheduled(senderId, receiverId, gameId, scheduledAt);

    await envoyerEmail({
      to: receiver.email,
      subject: `${req.session.user.username} vous invite à jouer sur GameHub`,
      text: `Bonjour ${receiver.username},\n\n${req.session.user.username} vous propose de jouer à ${game.name} le ${date.toLocaleString("fr-FR")}.\n\nConnectez-vous sur GameHub à l'heure prévue pour accepter : http://localhost:8080`,
    });

    return res.status(201).json({ message: "Invitation envoyée par email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible d'envoyer l'invitation" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const senderId = Number(req.session.user.id);
    const receiverId = Number(req.body.receiver_id);
    const gameId = Number(req.body.game_id);

    if (!Number.isInteger(receiverId) || !Number.isInteger(gameId)) {
      return res
        .status(400)
        .json({ message: "receiver_id and game_id required" });
    }

    if (receiverId === senderId) {
      return res.status(400).json({ message: "Cannot invite yourself" });
    }

    if (!(await q.userExists(receiverId))) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    if (!(await q.gameExists(gameId))) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (!(await q.sharedPreference(senderId, receiverId, gameId))) {
      return res.status(400).json({
        message: "Le joueur n'a pas ce jeu dans ses preferences",
      });
    }

    if (await q.findPendingDuplicate(senderId, receiverId, gameId)) {
      return res.status(409).json({
        message: "Une invitation en attente existe deja",
      });
    }

    const inserted = await q.create(senderId, receiverId, gameId);
    return res.status(201).json(inserted);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de creer l invitation" });
  }
});

router.get("/players", async (req, res) => {
  try {
    const userId = req.session.user ? Number(req.session.user.id) : null;
    const query = (req.query.q || "").trim() || null;
    const communs = req.query.communs === "true" && userId !== null;
    const pattern = query ? `%${query}%` : null;

    const rows = communs
      ? await q.listPlayersWithCommonGames(userId, pattern)
      : await q.listPlayers(userId, pattern);

    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de recuperer les joueurs" });
  }
});

router.get("/players/:id/jeux-communs", requireAuth, async (req, res) => {
  try {
    const joueurId = Number(req.params.id);
    const moiId = Number(req.session.user.id);
    if (!Number.isInteger(joueurId)) {
      return res.status(400).json({ message: "Invalid player id" });
    }

    const rows = await q.commonGames(joueurId, moiId);
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de recuperer les jeux communs" });
  }
});

router.get("/players/:id/preferences", async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    if (!Number.isInteger(playerId)) {
      return res.status(400).json({ message: "Invalid player id" });
    }

    const prefs = await q.playerPreferences(playerId);
    const statRows = await stats.forUser(playerId);

    const statMap = {};
    statRows.forEach((s) => {
      statMap[s.game_name] = {
        finished: Number(s.finished),
        won: Number(s.won),
      };
    });

    const rows = prefs.map((g) => {
      const s = statMap[g.name] || { finished: 0, won: 0 };
      return { id: g.id, name: g.name, finished: s.finished, won: s.won };
    });

    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de recuperer les preferences" });
  }
});

router.get("/pending", requireAuth, async (req, res) => {
  try {
    const rows = await q.incomingForUser(Number(req.session.user.id));
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de recuperer les invitations" });
  }
});

router.get("/sent", requireAuth, async (req, res) => {
  try {
    const rows = await q.sentByUser(Number(req.session.user.id));
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de recuperer les invitations envoyees" });
  }
});

// B répond à l'invitation (accepted / rejected / ignored)
router.post("/:id/respond", requireAuth, async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.session.user.id);
    const response = req.body.response;

    if (!invitationId) {
      return res.status(400).json({ message: "Invalid invitation id" });
    }

    if (!["accepted", "rejected", "ignored"].includes(response)) {
      return res.status(400).json({ message: "Invalid response" });
    }

    const row = await q.getWithGameName(invitationId);
    if (!row) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (row.receiver_id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to respond to this invitation" });
    }

    if (row.status !== "pending" && row.status !== "scheduled") {
      return res.status(400).json({ message: "Invitation already answered" });
    }

    let redirectTo = null;

    if (response === "accepted" && row.game_name === "connect4") {
      const game = await c4.createFromInvitation(
        invitationId, row.sender_id, row.receiver_id, c4NewBoard()
      );
      redirectTo = "/jeux/connect4/" + game.id;
    } else if (response === "accepted" && row.game_name === "tic-tac-toe") {
      const game = await ttt.createFromInvitation(
        invitationId, row.sender_id, row.receiver_id, tttNewBoard()
      );
      redirectTo = "/jeux/tictactoe/" + game.id;
    }

    // destinataire_confirme sera mis à true uniquement quand user clique "Rejoindre"
    const updated = await q.setStatus(invitationId, response);

    const payload = {
      message: "Invitation " + response,
      invitation: updated,
    };
    if (redirectTo) payload.redirectTo = redirectTo;

    return res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de traiter la reponse" });
  }
});

// Un joueur confirme qu'il veut rejoindre la salle de jeu
router.post("/:id/confirmer", requireAuth, async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.session.user.id);
    if (!invitationId)
      return res.status(400).json({ message: "Invalid invitation id" });

    const row = await q.getParticipants(invitationId);
    if (!row)
      return res.status(404).json({ message: "Invitation not found" });
    if (row.sender_id !== userId && row.receiver_id !== userId)
      return res.status(403).json({ message: "Not authorized" });

    if (row.sender_id === userId) {
      await q.confirmSender(invitationId);
    } else {
      await q.confirmReceiver(invitationId);
    }

    const flags = (await q.getConfirmFlags(invitationId)) || {};
    const lesDeux =
      !!flags.expediteur_confirme && !!flags.destinataire_confirme;
    return res.json({ ok: true, lesDeuxConfirment: lesDeux });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de confirmer" });
  }
});

// Un joueur annule depuis le popup de confirmation
router.post("/:id/annuler-confirmation", requireAuth, async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.session.user.id);
    if (!invitationId)
      return res.status(400).json({ message: "Invalid invitation id" });

    const row = await q.getParticipants(invitationId);
    if (!row)
      return res.status(404).json({ message: "Invitation not found" });
    if (row.sender_id !== userId && row.receiver_id !== userId)
      return res.status(403).json({ message: "Not authorized" });

    await q.cancelConfirmation(invitationId);

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible d annuler la confirmation" });
  }
});

// État de la confirmation
router.get("/:id/etat", requireAuth, async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.session.user.id);
    if (!invitationId)
      return res.status(400).json({ message: "Invalid invitation id" });

    const r = await q.getConfirmationState(invitationId);
    if (!r)
      return res.status(404).json({ message: "Invitation not found" });

    const invRow = await q.getParticipants(invitationId);
    if (invRow.sender_id !== userId && invRow.receiver_id !== userId)
      return res.status(403).json({ message: "Not authorized" });

    return res.json({
      expediteur_confirme: !!r.expediteur_confirme,
      destinataire_confirme: !!r.destinataire_confirme,
      confirmation_annulee: !!r.confirmation_annulee,
      status: r.status,
      connect4_game_id: r.connect4_game_id || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de recuperer l etat" });
  }
});

module.exports = router;
