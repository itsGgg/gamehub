$(function () {
    const gameId = window.GAME_ID;
    const myUserId = window.USER_ID;
    const ROWS = 6;
    const COLS = 7;
    const POLL_MS = 500;

    const $status = $("#c4-status");
    const $players = $("#c4-players");
    const $board = $("#c4-board");
    const $columns = $("#c4-columns");
    const $messages = $("#c4-messages");
    const $restart = $("#c4-restart");
    const $resign = $("#c4-resign");

    let lastBoard = null;
    let lastMessageId = 0;
    let status = "in_progress";
    let myTurn = false;
    let me = null;
    let opponent = null;

    function buildBoard() {
        $columns.empty();
        for (let c = 0; c < COLS; c++) {
            $columns.append(
                "<button type=\"button\" class=\"c4-col-btn\" data-col=\""
                    + c
                    + "\" aria-label=\"Colonne " + (c + 1) + "\">&#9660;</button>"
            );
        }
        $board.empty();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                $board.append(
                    "<div class=\"c4-cell\" data-row=\""
                        + r + "\" data-col=\"" + c + "\"></div>"
                );
            }
        }
    }

    function renderBoard(board) {
        if (board === lastBoard) return;
        lastBoard = board;
        const $cells = $board.children();
        for (let i = 0; i < ROWS * COLS; i++) {
            const ch = board[i];
            const $cell = $cells.eq(i);
            $cell.removeClass("c4-p1 c4-p2");
            if (ch === "1") $cell.addClass("c4-p1");
            else if (ch === "2") $cell.addClass("c4-p2");
        }
    }

    function renderMessages(msgs) {
        if (!msgs || !msgs.length) return;
        let html = "";
        msgs.forEach(function (m) {
            lastMessageId = Math.max(lastMessageId, m.id);
            const mine = m.user_id === myUserId;
            html +=
                "<div class=\"c4-msg " + (mine ? "c4-msg-mine" : "c4-msg-other") + "\">"
                + "<span class=\"c4-msg-author\">" + m.username + ":</span> "
                + m.message
                + "</div>";
        });
        $messages.append(html);
        $messages.scrollTop($messages[0].scrollHeight);
    }

    function updateUi(data) {
        me = data.you;
        opponent = data.opponent;
        status = data.status;
        myTurn = data.current_turn === me;

        $players.text(
            "Vous (jeton " + (me === 1 ? "rouge" : "jaune") + ")  -  "
                + opponent.username + " (jeton " + (me === 1 ? "jaune" : "rouge") + ")"
        );

        let text;
        if (status === "in_progress") {
            text = myTurn ? "A vous de jouer." : "Tour de " + opponent.username + "...";
        } else if (status === "won") {
            text = data.winner_id === opponent.id
                ? opponent.username + " a gagne."
                : "Vous avez gagne !";
        } else if (status === "draw") {
            text = "Match nul.";
        } else if (status === "abandoned") {
            text = data.winner_id === opponent.id
                ? "Vous avez abandonne."
                : opponent.username + " a abandonne. Vous gagnez.";
        } else {
            text = "";
        }
        $status.text(text);

        $columns.toggleClass(
            "c4-disabled",
            status !== "in_progress" || !myTurn
        );
        $restart.prop("disabled", status === "in_progress");
        $resign.prop("disabled", status !== "in_progress");
    }

    function poll() {
        $.get("/jeux/connect4/" + gameId + "/state", { since: lastMessageId })
            .done(function (data) {
                updateUi(data);
                renderBoard(data.board);
                renderMessages(data.messages);
            })
            .fail(function () {});
    }

    $(document).on("click", ".c4-col-btn", function () {
        if (status !== "in_progress" || !myTurn) return;
        const col = Number($(this).data("col"));
        $.ajax({
            url: "/jeux/connect4/" + gameId + "/move",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ column: col }),
        })
            .done(poll)
            .fail(function () {});
    });

    $resign.on("click", function () {
        if (status !== "in_progress") return;
        if (!confirm("Abandonner la partie ?")) return;
        $.post("/jeux/connect4/" + gameId + "/resign").done(poll);
    });

    $restart.on("click", function () {
        if (status === "in_progress") return;
        $.post("/jeux/connect4/" + gameId + "/restart").done(function () {
            lastBoard = null;
            poll();
        });
    });

    $("#c4-chat-form").on("submit", function (e) {
        e.preventDefault();
        const $input = $("#c4-chat-input");
        const msg = $input.val().trim();
        if (!msg) return;
        $.ajax({
            url: "/jeux/connect4/" + gameId + "/chat",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ message: msg }),
        }).done(function () {
            $input.val("");
            poll();
        });
    });

    buildBoard();
    poll();
    setInterval(poll, POLL_MS);
});
