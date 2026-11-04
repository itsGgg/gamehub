const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { parametresChamps } = require("../config/appConfig");
const users = require("../queries/users");
const games = require("../queries/games");
const preferences = require("../queries/preferences");

function champsAutorises() {
  return parametresChamps.map((c) => c.key);
}

router.get("/", async (req, res) => {
  try {
    const liste = await games.listAll();
    res.status(200).render("main_page", { user: req.session.user, games: liste });
  } catch (error) {
    console.error(error);
    res.status(200).render("main_page", { user: req.session.user, games: [] });
  }
});

router.get("/inscription", async (req, res) => {
  try {
    const liste = await games.listAll();
    res.status(200).render("auth", { initialMode: "register", games: liste });
  } catch (error) {
    console.error(error);
    res.status(200).render("auth", { initialMode: "register", games: [] });
  }
});

router.get("/connexion", (req, res) => {
  res.status(200).render("auth", { initialMode: "login", games: [] });
});

router.get("/parametres", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/connexion");
    }

    const user =
      (await users.findById(req.session.user.id)) || req.session.user;
    const gamesList = await games.listMultiplayer();
    const selectedPreferences = await preferences.getGameIds(
      req.session.user.id
    );

    req.session.user = user;

    return res.status(200).render("parametres", {
      user,
      champs: parametresChamps,
      games: gamesList,
      selectedPreferences,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Impossible de charger les paramètres");
  }
});

router.post("/parametres/preferences", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).redirect("/connexion");
    }

    const userId = parseInt(req.session.user.id, 10);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(400).send("Utilisateur invalide");
    }

    const rawPreferences = req.body.preferences || req.body["preferences[]"];
    const selected = [].concat(rawPreferences || []);

    await preferences.clear(userId);

    for (let i = 0; i < selected.length; i++) {
      const gameId = parseInt(selected[i], 10);
      if (Number.isNaN(gameId) || gameId <= 0) continue;
      await preferences.add(userId, gameId);
    }

    return res.redirect("/parametres");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Impossible de mettre à jour les préférences");
  }
});

router.post("/inscription", async (req, res) => {
  try {
    const {
      username,
      email,
      date_naissance,
      mot_de_passe,
      mot_de_passe_confirm,
    } = req.body;

    if (
      !username ||
      !email ||
      !date_naissance ||
      !mot_de_passe ||
      !mot_de_passe_confirm
    ) {
      return res
        .status(400)
        .json({ message: "Tous les champs sont obligatoires" });
    }

    if (mot_de_passe !== mot_de_passe_confirm) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas" });
    }

    if (await users.existsByUsernameOrEmail(username, email)) {
      return res
        .status(409)
        .json({ message: "Cet identifiant ou email existe déjà" });
    }

    const passwordHash = await bcrypt.hash(mot_de_passe, 10);
    const createdUser = await users.create(
      username,
      email,
      date_naissance,
      passwordHash
    );

    const rawPreferences = req.body.preferences || req.body["preferences[]"];
    const prefs = [].concat(rawPreferences || []);
    for (let i = 0; i < prefs.length; i++) {
      const gameId = parseInt(prefs[i], 10);
      if (Number.isNaN(gameId) || gameId <= 0) continue;
      await preferences.add(createdUser.id, gameId);
    }

    req.session.user = createdUser;

    return res
      .status(201)
      .json({ message: "Votre compte a été créé", redirectTo: "/" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de créer le compte" });
  }
});

router.post("/connexion", async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;

    if (!identifiant || !mot_de_passe) {
      return res
        .status(400)
        .json({ message: "Identifiant et mot de passe obligatoires" });
    }

    const user = await users.findByIdentifier(identifiant);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Identifiant ou mot de passe incorrect" });
    }

    const passwordMatches = await bcrypt.compare(
      mot_de_passe,
      user.password_hash
    );

    if (!passwordMatches) {
      return res
        .status(401)
        .json({ message: "Identifiant ou mot de passe incorrect" });
    }

    await users.setOnline(user.id, true);

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_available: user.is_available,
    };

    return res
      .status(200)
      .json({ message: "Connexion réussie", redirectTo: "/" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de se connecter" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    if (req.session.user && req.session.user.id) {
      await users.setOnline(req.session.user.id, false);
    }

    req.session.destroy((error) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Impossible de se déconnecter" });
      }

      if (req.xhr) {
        return res.json({ redirectTo: "/" });
      }

      return res.redirect("/");
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Impossible de se déconnecter" });
  }
});

router.post("/offline", async (req, res) => {
  if (req.session.user) {
    await users.setOnline(req.session.user.id, false).catch(console.error);
  }
  res.sendStatus(200);
});

router.post("/online", async (req, res) => {
  if (req.session.user) {
    await users.setOnline(req.session.user.id, true).catch(console.error);
  }
  res.sendStatus(200);
});

router.post("/disponibilite", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Vous devez être connecté" });
    }

    const updated = await users.toggleAvailability(req.session.user.id);

    if (!updated) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const { is_available } = updated;

    req.session.user = { ...req.session.user, is_available };

    return req.session.save((saveError) => {
      if (saveError) {
        console.error(saveError);
        return res
          .status(500)
          .json({ message: "Impossible de sauvegarder la session" });
      }

      if (req.xhr) {
        return res.status(200).json({
          message: "Statut mis à jour",
          isAvailable: is_available,
        });
      }

      return res.redirect("/parametres");
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de mettre à jour la disponibilité" });
  }
});

router.get("/parametres/edit", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/connexion");

    const champSelectionne = req.query.champ;
    if (!champSelectionne || champsAutorises().indexOf(champSelectionne) === -1) {
      return res.status(400).send("Champ invalide");
    }

    const utilisateur =
      (await users.findBasicById(req.session.user.id)) || req.session.user;

    const configChamp = parametresChamps.find(
      (c) => c.key === champSelectionne
    );

    return res.status(200).render("parametres_edit", {
      champ: champSelectionne,
      label: configChamp ? configChamp.label : champSelectionne,
      value: utilisateur[champSelectionne],
      user: utilisateur,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Impossible de charger le champ");
  }
});

router.post("/parametres/update", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).redirect("/connexion");

    const { champ } = req.body;

    if (!champ || champsAutorises().indexOf(champ) === -1) {
      return res.status(400).send("Champ invalide");
    }

    let updated;

    if (champ === "mot_de_passe") {
      const { mot_de_passe, mot_de_passe_confirm } = req.body;

      if (!mot_de_passe) {
        return res.redirect("/parametres");
      }

      if (mot_de_passe !== mot_de_passe_confirm) {
        return res.status(400).send("Les mots de passe ne correspondent pas");
      }

      const hash = await bcrypt.hash(mot_de_passe, 10);
      updated = await users.updatePassword(req.session.user.id, hash);
    } else {
      const valeur = req.body.value;
      if (valeur === undefined) return res.redirect("/parametres");

      updated = await users.updateField(champ, valeur, req.session.user.id);
    }

    if (!updated) {
      return res.status(404).send("Utilisateur introuvable");
    }

    if (champ !== "mot_de_passe") {
      req.session.user = updated;
    }

    return req.session.save((error) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Impossible de sauvegarder la session");
      }

      return res.redirect("/parametres");
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Impossible de mettre à jour les parametres demandés" });
  }
});

module.exports = router;
