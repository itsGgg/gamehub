$(function () {
    const gameId = window.GAME_ID;
    const myUserId = window.USER_ID;
    const CELLS = 9;
    const POLL_MS = 500;

    const $status = $("#ttt-status");
    const $players = $("#ttt-players");
    const $board = $("#ttt-board");
    const $messages = $("#ttt-messages");
    const $restart = $("#ttt-restart");
    const $resign = $("#ttt-resign");

    let lastBoard = null;
    let lastWinningLine = null;
    let lastMessageId = 0;
    let status = "in_progress";
    let myTurn = false;
    let me = null;
    let opponent = null;

    function symbolFor(player) {
        return player === 1 ? "X" : player === 2 ? "O" : "";
    }

    function buildBoard() {
        $board.empty();
        for (let i = 0; i < CELLS; i++) {
            $board.append(
                "<button type=\"button\" class=\"ttt-cell\" data-index=\""
                    + i + "\" aria-label=\"Case " + (i + 1) + "\"></button>"
            );
        }
    }

    function renderBoard(board, winningLine) {
        const sameBoard = board === lastBoard;
        const sameLine =
            JSON.stringify(winningLine) === JSON.stringify(lastWinningLine);
        if (sameBoard && sameLine) return;
        lastBoard = board;
        lastWinningLine = winningLine;

        const $cells = $board.children();
        for (let i = 0; i < CELLS; i++) {
            const ch = board[i];
            const $cell = $cells.eq(i);
            $cell.text(ch === "0" ? "" : symbolFor(Number(ch)));
            $cell.toggleClass("ttt-p1", ch === "1");
            $cell.toggleClass("ttt-p2", ch === "2");
            $cell.toggleClass(
                "ttt-win",
                !!(winningLine && winningLine.indexOf(i) !== -1)
            );
        }
    }

    function renderMessages(msgs) {
        if (!msgs || !msgs.length) return;
        let html = "";
        msgs.forEach(function (m) {
            lastMessageId = Math.max(lastMessageId, m.id);
            const mine = m.user_id === myUserId;
            html +=
                "<div class=\"ttt-msg " + (mine ? "ttt-msg-mine" : "ttt-msg-other") + "\">"
                + "<span class=\"ttt-msg-author\">" + m.username + ":</span> "
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

        const mySym = symbolFor(me);
        const oppSym = symbolFor(me === 1 ? 2 : 1);
        $players.text(
            "Vous (" + mySym + ")  -  " + opponent.username + " (" + oppSym + ")"
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

        $board.toggleClass(
            "ttt-disabled",
            status !== "in_progress" || !myTurn
        );
        $restart.prop("disabled", status === "in_progress");
        $resign.prop("disabled", status !== "in_progress");
    }

    function poll() {
        $.get("/jeux/tictactoe/" + gameId + "/state", { since: lastMessageId })
            .done(function (data) {
                updateUi(data);
                renderBoard(data.board, data.winning_line);
                renderMessages(data.messages);
            })
            .fail(function () {});
    }

    $(document).on("click", ".ttt-cell", function () {
        if (status !== "in_progress" || !myTurn) return;
        const idx = Number($(this).data("index"));
        if (lastBoard && lastBoard[idx] !== "0") return;
        $.ajax({
            url: "/jeux/tictactoe/" + gameId + "/move",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ cell: idx }),
        })
            .done(poll)
            .fail(function () {});
    });

    $resign.on("click", function () {
        if (status !== "in_progress") return;
        if (!confirm("Abandonner la partie ?")) return;
        $.post("/jeux/tictactoe/" + gameId + "/resign").done(poll);
    });

    $restart.on("click", function () {
        if (status === "in_progress") return;
        $.post("/jeux/tictactoe/" + gameId + "/restart").done(function () {
            lastBoard = null;
            lastWinningLine = null;
            poll();
        });
    });

    $("#ttt-chat-form").on("submit", function (e) {
        e.preventDefault();
        const $input = $("#ttt-chat-input");
        const msg = $input.val().trim();
        if (!msg) return;
        $.ajax({
            url: "/jeux/tictactoe/" + gameId + "/chat",
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
