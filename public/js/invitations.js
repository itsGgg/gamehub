$(function () {
  const isLoggedIn = $("nav.gh-navbar").data("logged-in") === true;

  const $inviteModal = $("#inviteModal");
  const $playerIdInput = $("#invite_player_id");
  const $playerNameInput = $("#invite_player_name");
  const $gameSelect = $("#invite_game");
  const $playersList = $("#playersList");
  const $playersCount = $("#playersCount");
  const $playersSidebar = $("#playersSidebar");
  const $filtreCommun = $("#filtreCommun");
  let playersRefreshInterval = null;
  let preferredGameId = null;
  let modeHorsLigne = false;

  if (isLoggedIn) $("#filtreWrap").show();

  // refresh de la barre users tous les 10s
  function startPlayersRefresh() {
    stopPlayersRefresh();
    playersRefreshInterval = setInterval(function () {
      const q = $("#playersSearchInput").val() || "";
      loadPlayers(q.trim());
    }, 10000);
  }
  // arreter le refresh sur la barre lorsque elle est fermé
  function stopPlayersRefresh() {
    if (playersRefreshInterval) {
      clearInterval(playersRefreshInterval);
      playersRefreshInterval = null;
    }
  }

  $(document).on("click", "#togglePlayersBtn", function (e) {
    e.preventDefault();
    const isOpen = $playersSidebar.hasClass("is-open");
    if (isOpen) {
      $playersSidebar.removeClass("is-open");
      stopPlayersRefresh();
      return;
    }

    $("#playersSearchInput").val("");
    loadPlayers();
    $playersSidebar.addClass("is-open");
    startPlayersRefresh();
  });

  $(document).on("click", "#closePlayersSidebarBtn", function () {
    $playersSidebar.removeClass("is-open");
    stopPlayersRefresh();
  });

  function statusBadge(p) {
    if (!p.is_online) {
      return '<span class="badge badge-secondary">Hors ligne</span>';
    }
    if (p.busy_game) {
      return (
        '<span class="badge badge-info">En partie · ' +
        p.busy_game +
        " contre " +
        p.busy_opponent +
        "</span>"
      );
    }
    if (p.is_available) {
      return '<span class="badge badge-success">Disponible</span>';
    }
    return '<span class="badge badge-warning">Indisponible</span>';
  }

  function afficherUsers(players) {
    const idsVus = [];
    players = (players || []).filter(function (p) {
      if (idsVus.includes(p.id)) return false;
      idsVus.push(p.id);
      return true;
    });
    $playersCount.text(players.length + " joueur(s)");

    if (!players.length) {
      $playersList.html('<div class="text-muted small">Aucun joueur.</div>');
      return;
    }

    let html = "";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];

      const inviteBtn = isLoggedIn
        ? '<button class="btn btn-sm btn-outline-primary invite-player-btn mt-2"' +
          ' data-user-id="' + p.id + '"' +
          ' data-username="' + p.username + '"' +
          ' data-available="' + !!p.is_online + '"' +
          ">Inviter</button>"
        : "";

      html +=
        '<div class="gh-player-card" data-user-id="' +
        p.id +
        '">' +
        '<div class="gh-player-title">' +
        p.username +
        "</div>" +
        '<div class="gh-player-status mb-1">' +
        statusBadge(p) +
        "</div>" +
        '<div class="gh-player-prefs-placeholder" id="player-prefs-' +
        p.id +
        '"></div>' +
        inviteBtn +
        "</div>";
    }
    $playersList.html(html);

    players.forEach(function (r) {
      $.get("/invitations/players/" + r.id + "/preferences")
        .done(function (prefs) {
          const $card = $playersList.find(
            '.gh-player-card[data-user-id="' + r.id + '"]'
          );
          if (!$card.length) return;
          let prefHtml = '<div class="gh-player-games mt-2">';
          if ((prefs || []).length) {
            prefs.forEach(function (g) {
              prefHtml +=
                '<div class="gh-game-row">' +
                '<span class="gh-game-name text-capitalize">' +
                g.name +
                "</span>" +
                '<span class="gh-game-stat">' +
                (g.finished || 0) +
                " jouées · " +
                (g.won || 0) +
                " gagnées</span>" +
                "</div>";
            });
          } else {
            prefHtml +=
              '<span class="text-muted small">Aucun jeu accepté</span>';
          }
          prefHtml += "</div>";
          $card.find(".gh-player-prefs-placeholder").html(prefHtml);
        })
        .fail(function () {});
    });
  }

  function loadPlayers(query) {
    const params = { q: query || "", communs: $filtreCommun.is(":checked") };
    $.get("/invitations/players", params)
      .done(afficherUsers)
      .fail(function () {
        $playersList.html('<div class="text-danger small">Impossible de charger les joueurs.</div>');
      });
  }

  $filtreCommun.on("change", function () {
    loadPlayers($("#playersSearchInput").val().trim());
  });

  loadPlayers();

  $(document).on("click", "#playersSearchBtn", function () {
    const q = $("#playersSearchInput").val() || "";
    loadPlayers(q.trim());
  });

  $(document).on("keypress", "#playersSearchInput", function (e) {
    if (e.which === 13) {
      e.preventDefault();
      $("#playersSearchBtn").click();
    }
  });

  function loadGamesForPlayer(playerId) {
    $gameSelect.empty().append('<option value="">— Choisir —</option>');
    if (!playerId) return;
    $.get("/invitations/players/" + playerId + "/jeux-communs")
      .done(function (prefs) {
        (prefs || []).forEach(function (g) {
          $gameSelect.append($("<option>").val(g.id).text(g.name));
        });
        if (preferredGameId) {
          $gameSelect.val(String(preferredGameId));
        }
      })
      .fail(function () {});
  }

  $(document).on("click", ".js-open-players", function (e) {
    e.preventDefault();
    preferredGameId = Number($(this).data("gameId")) || null;
    if (!$playersSidebar.hasClass("is-open")) {
      $("#playersSearchInput").val("");
      loadPlayers();
      $playersSidebar.addClass("is-open");
      startPlayersRefresh();
    }
  });

  $(document).on("click", ".invite-player-btn", function () {
    const playerId = Number($(this).data("userId")) || null;
    const username = $(this).data("username") || "";
    const disponible = $(this).data("available") === true;

    modeHorsLigne = !disponible;
    $playerIdInput.val(playerId);
    $playerNameInput.text(username);
    loadGamesForPlayer(playerId);

    if (modeHorsLigne) {
      const maintenant = new Date();
      maintenant.setMinutes(maintenant.getMinutes() - maintenant.getTimezoneOffset());
      $("#inviteDatetime").attr("min", maintenant.toISOString().slice(0, 16)).val("");
      $("#inviteDatetimeWrap").show();
      $("#inviteModalTitre").text("Proposer une partie");
      $("#inviteSubmitBtn").text("Envoyer par email");
    } else {
      $("#inviteDatetimeWrap").hide();
      $("#inviteModalTitre").text("Inviter un joueur");
      $("#inviteSubmitBtn").text("Envoyer");
    }

    $inviteModal.modal("show");
  });

  $("#inviteForm").on("submit", function (e) {
    e.preventDefault();
    const receiverId = Number($playerIdInput.val());
    const gameId = Number($gameSelect.val());

    if (!receiverId || !gameId) {
      alert("Veuillez choisir un jeu");
      return;
    }

    if (modeHorsLigne) {
      const scheduledAt = $("#inviteDatetime").val();
      if (!scheduledAt) {
        alert("Veuillez choisir une date et une heure");
        return;
      }
      $.ajax({
        url: "/invitations/hors-ligne",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ receiver_id: receiverId, game_id: gameId, scheduled_at: scheduledAt }),
      })
        .done(function () {
          $inviteModal.modal("hide");
          alert("Invitation envoyée par email");
        })
        .fail(function (xhr) {
          alert((xhr.responseJSON && xhr.responseJSON.message) || "Erreur");
        });
    } else {
      $.ajax({
        url: "/invitations",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ receiver_id: receiverId, game_id: gameId }),
      })
        .done(function () {
          $inviteModal.modal("hide");
          alert("Invitation envoyée");
        })
        .fail(function (xhr) {
          alert((xhr.responseJSON && xhr.responseJSON.message) || "Erreur");
        });
    }
  });
});
