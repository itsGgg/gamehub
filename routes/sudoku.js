const express = require("express");
const router = express.Router();
const {
    generatePuzzle,
    gridToString,
    isCompleteAndValid,
} = require("../games/sudoku_logic");
const { requireLoginPage, requireLoginApi } = require("../middleware/auth");
const sudokuQueries = require("../queries/sudoku");

router.get("/", requireLoginPage, async (req, res) => {
    res.render("sudoku", { user: req.session.user });
});

router.post("/new", requireLoginApi, async (req, res) => {
    try {
        const { puzzle, solution } = generatePuzzle(45);
        const puzzleStr = gridToString(puzzle);
        const solutionStr = gridToString(solution);
        const game = await sudokuQueries.createGame(
            req.session.user.id,
            puzzleStr,
            solutionStr,
        );
        return res.json({ id: game.id, puzzle: puzzleStr });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Impossible de demarrer la partie" });
    }
});

router.post("/submit", requireLoginApi, async (req, res) => {
    try {
        const { id, state } = req.body;
        if (!id || typeof state !== "string" || state.length !== 81) {
            return res.status(400).json({ message: "Requete invalide" });
        }

        const game = await sudokuQueries.getGameForUser(id, req.session.user.id);
        if (!game) {
            return res.status(404).json({ message: "Partie introuvable" });
        }

        const { puzzle, solution, finished } = game;

        for (let i = 0; i < 81; i++) {
            if (puzzle[i] !== "0" && puzzle[i] !== state[i]) {
                return res.status(400).json({ message: "Cases initiales modifiees" });
            }
        }

        const win = state === solution || isCompleteAndValid(state);

        if (win && !finished) {
            await sudokuQueries.markWon(id, state);
        } else {
            await sudokuQueries.saveState(id, state);
        }

        return res.json({ win });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de la verification" });
    }
});

router.get("/solve/:id", requireLoginApi, async (req, res) => {
    try {
        const game = await sudokuQueries.getSolutionForUser(
            req.params.id,
            req.session.user.id,
        );
        if (!game) {
            return res.status(404).json({ message: "Partie introuvable" });
        }

        await sudokuQueries.markFinished(req.params.id, req.session.user.id);

        return res.json({ solution: game.solution });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Impossible de recuperer la solution" });
    }
});

module.exports = router;
