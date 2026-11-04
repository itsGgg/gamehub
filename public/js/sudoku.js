$(function () {
    const $board = $("#board");
    const $status = $("#status");

    let gameId = null;
    let puzzle = "";

    function showStatus(message, type) {
        $status
            .removeClass("d-none alert-success alert-danger alert-warning alert-info")
            .addClass("alert-" + type)
            .text(message);
    }

    function hideStatus() {
        $status.addClass("d-none");
    }

    function isCellValid(state, index) {
        const value = state[index];
        if (value === "0") return true;
        const row = Math.floor(index / 9);
        const col = index % 9;
        for (let i = 0; i < 9; i++) {
            const rowIdx = row * 9 + i;
            const colIdx = i * 9 + col;
            if (i !== col && state[rowIdx] === value) return false;
            if (i !== row && state[colIdx] === value) return false;
        }
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = br + i;
                const c = bc + j;
                if (r === row && c === col) continue;
                if (state[r * 9 + c] === value) return false;
            }
        }
        return true;
    }

    function refreshValidity() {
        const state = getState();
        $(".sudoku-cell").each(function () {
            const idx = +$(this).attr("data-index");
            if (state[idx] !== "0" && !isCellValid(state, idx)) {
                $(this).addClass("invalid");
            } else {
                $(this).removeClass("invalid");
            }
        });
    }

    function renderBoard(state) {
        $board.empty();
        for (let i = 0; i < 81; i++) {
            const ch = state[i];
            const isGiven = puzzle[i] !== "0";
            const $cell = $("<input>")
                .addClass("sudoku-cell")
                .attr("type", "text")
                .attr("maxlength", 1)
                .attr("inputmode", "numeric")
                .attr("data-index", i)
                .val(ch === "0" ? "" : ch);
            if (isGiven) {
                $cell.addClass("given").prop("readonly", true);
            }
            $board.append($cell);
        }
        refreshValidity();
    }

    function getState() {
        const arr = new Array(81).fill("0");
        $(".sudoku-cell").each(function () {
            const idx = +$(this).attr("data-index");
            const v = $(this).val().trim();
            arr[idx] = /^[1-9]$/.test(v) ? v : "0";
        });
        return arr.join("");
    }

    function newGame() {
        hideStatus();
        $.post("/jeux/sudoku/new")
            .done(function (data) {
                gameId = data.id;
                puzzle = data.puzzle;
                renderBoard(puzzle);
            })
            .fail(function (xhr) {
                const msg = (xhr.responseJSON && xhr.responseJSON.message)
                    || "Impossible de demarrer la partie.";
                showStatus(msg, "danger");
            });
    }

    $("#btn-new").on("click", newGame);

    $("#btn-clear").on("click", function () {
        if (puzzle) renderBoard(puzzle);
        hideStatus();
    });

    $("#btn-submit").on("click", function () {
        if (!gameId) return;
        const state = getState();
        $.ajax({
            url: "/jeux/sudoku/submit",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ id: gameId, state: state }),
        })
            .done(function (data) {
                if (data.win) {
                    showStatus("Bravo, vous avez gagne !", "success");
                    $(".sudoku-cell").addClass("won").prop("readonly", true);
                } else {
                    showStatus(
                        "Pas encore... verifiez les cases en rouge.",
                        "warning"
                    );
                    refreshValidity();
                }
            })
            .fail(function (xhr) {
                const msg = (xhr.responseJSON && xhr.responseJSON.message)
                    || "Erreur lors de la verification.";
                showStatus(msg, "danger");
            });
    });

    $("#btn-solve").on("click", function () {
        if (!gameId) return;
        $.get("/jeux/sudoku/solve/" + gameId)
            .done(function (data) {
                puzzle = data.solution;
                renderBoard(data.solution);
                $(".sudoku-cell").prop("readonly", true);
                showStatus("Solution affichee.", "info");
            })
            .fail(function (xhr) {
                const msg = (xhr.responseJSON && xhr.responseJSON.message)
                    || "Impossible de recuperer la solution.";
                showStatus(msg, "danger");
            });
    });

    $(document).on("input", ".sudoku-cell", function () {
        const v = $(this).val();
        if (v && !/^[1-9]$/.test(v)) {
            $(this).val("");
        }
        refreshValidity();
    });

    $(document).on("keydown", ".sudoku-cell", function (e) {
        const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (keys.indexOf(e.key) === -1) return;
        e.preventDefault();
        const idx = +$(this).attr("data-index");
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        let nr = row;
        let nc = col;
        if (e.key === "ArrowUp") nr = (row + 8) % 9;
        if (e.key === "ArrowDown") nr = (row + 1) % 9;
        if (e.key === "ArrowLeft") nc = (col + 8) % 9;
        if (e.key === "ArrowRight") nc = (col + 1) % 9;
        $(`.sudoku-cell[data-index='${nr * 9 + nc}']`).focus();
    });

    newGame();
});
