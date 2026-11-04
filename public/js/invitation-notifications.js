$(function() {
  let currentInvitationId = null;
  let notificationTimer = null;
  let notificationCountdownInterval = null;
  let invitationHandled = false;

  let gameReadyInvitationId = null;
  let gameReadyPoll = null;
  let gameReadyCountdownInterval = null;
  let gameReadyConfirming = false;

  const TIMEOUT_SEC = 30;

  function showInfoMessage(msg) {
    $("#invitationInfoMessage").text(msg);
    const $t = $("#invitationInfoToast");
    $t.stop(true, true).fadeIn();
    setTimeout(function() {
      $t.fadeOut();
    }, 6000);
  }

  //  Countdown invitation
  function startInvitationCountdown() {
    let remaining = TIMEOUT_SEC;
    updateInvitationCountdown(remaining);

    if (notificationCountdownInterval)
      clearInterval(notificationCountdownInterval);

    notificationCountdownInterval = setInterval(function() {
      remaining -= 1;
      updateInvitationCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(notificationCountdownInterval);
        notificationCountdownInterval = null;
      }
    }, 1000);
  }

  function updateInvitationCountdown(sec) {
    $("#invitationCountdown").text(sec);
  }

  function stopInvitationCountdown() {
    if (notificationCountdownInterval) {
      clearInterval(notificationCountdownInterval);
      notificationCountdownInterval = null;
    }
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
  }

  // Popup d'invitation reçu
  function showInvitationPopup(
    nomExpediteur,
    nomJeu,
    invitationId,
    datePrevue,
  ) {
    currentInvitationId = invitationId;
    invitationHandled = false;

    $("#invitationSender").text(nomExpediteur + " vous invite");
    $("#invitationGame").text(
      "Jeu : " +
      nomJeu +
      (datePrevue
        ? "\nPrévu le : " +
        new Date(datePrevue).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        : ""),
    );

    stopInvitationCountdown();
    startInvitationCountdown();

    $("#invitationNotificationModal").modal({
      backdrop: "static",
      keyboard: false,
    });
    $("#invitationNotificationModal").modal("show");

    // Après 30 s sans rep
    notificationTimer = setTimeout(function() {
      if (!invitationHandled && currentInvitationId) {
        invitationHandled = true;
        respondToInvitation(currentInvitationId, "ignored");
      }
    }, TIMEOUT_SEC * 1000);
  }

  function closeInvitationPopup() {
    stopInvitationCountdown();
    $("#invitationNotificationModal").modal("hide");
    currentInvitationId = null;
    invitationHandled = false;
  }

  function respondToInvitation(invitationId, response) {
    invitationHandled = true;
    $.ajax({
      url: "/invitations/" + invitationId + "/respond",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ response: response }),
    })
      .done(function(result) {
        closeInvitationPopup();
        if (result && result.redirectTo) {
          const inv = result.invitation || {};
          showGameReadyModal(
            result.redirectTo,
            inv.id,
            "La partie est prête. Voulez-vous rejoindre le salon de jeu ?",
          );
        }
      })
      .fail(function(xhr) {
        console.error(
          (xhr.responseJSON && xhr.responseJSON.message) || "Erreur",
        );
        closeInvitationPopup();
      });
  }

  $(document).on("click", "#invitationConfirm", function() {
    if (currentInvitationId && !invitationHandled) {
      stopInvitationCountdown();
      respondToInvitation(currentInvitationId, "accepted");
    }
  });

  $(document).on("click", "#invitationReject", function() {
    if (currentInvitationId && !invitationHandled) {
      stopInvitationCountdown();
      respondToInvitation(currentInvitationId, "rejected");
    }
  });

  //  Countdown gameReadyModal
  function startGameReadyCountdown() {
    let remaining = TIMEOUT_SEC;
    updateGameReadyCountdown(remaining);

    if (gameReadyCountdownInterval) clearInterval(gameReadyCountdownInterval);

    gameReadyCountdownInterval = setInterval(function() {
      remaining -= 1;
      updateGameReadyCountdown(remaining);
      if (remaining <= 0) {
        stopGameReadyCountdown();
        // Temps écoulé sans cliquer Rejoindre => annulation automatique
        if (!gameReadyConfirming) {
          doGameReadyCancel(false);
        }
      }
    }, 1000);
  }

  function updateGameReadyCountdown(sec) {
    $("#gameReadyCountdown").text(sec);
  }

  function stopGameReadyCountdown() {
    if (gameReadyCountdownInterval) {
      clearInterval(gameReadyCountdownInterval);
      gameReadyCountdownInterval = null;
    }
  }

  //  Polling confirmation
  function startGameReadyPoll() {
    stopGameReadyPoll();
    gameReadyPoll = setInterval(function() {
      const invId = gameReadyInvitationId;
      if (!invId) return;
      $.ajax({ url: "/invitations/" + invId + "/etat", method: "GET" })
        .done(function(state) {
          if (state.confirmation_annulee) {
            // L'autre joueur a annulé
            stopGameReadyPoll();
            stopGameReadyCountdown();
            gameReadyInvitationId = null;
            gameReadyConfirming = false;
            $("#gameReadyModal").modal("hide");
            showInfoMessage("L'autre joueur a annulé la partie.");
            return;
          }
          if (
            gameReadyConfirming &&
            state.expediteur_confirme &&
            state.destinataire_confirme
          ) {
            stopGameReadyPoll();
            const url = $("#gameReadyModal").data("redirectUrl");
            if (url) window.location.href = url;
          }
        })
        .fail(function() { });
    }, 1500);
  }

  function stopGameReadyPoll() {
    if (gameReadyPoll) {
      clearInterval(gameReadyPoll);
      gameReadyPoll = null;
    }
  }

  //  Afficher le modal de confirmation
  function showGameReadyModal(url, invitationId, message) {
    gameReadyInvitationId = invitationId || null;
    gameReadyConfirming = false;

    $("#gameReadyMessage").text(
      message || "La partie est prête. Voulez-vous rejoindre le salon de jeu ?",
    );
    $("#gameReadyModal").data("redirectUrl", url);
    $("#joinGameConfirm").show();
    $("#joinGameCancel").show().prop("disabled", false);
    $("#gameReadyCountdownWrap").show();

    stopGameReadyCountdown();
    stopGameReadyPoll();

    startGameReadyCountdown();
    if (gameReadyInvitationId) startGameReadyPoll();

    $("#gameReadyModal").modal({ backdrop: "static", keyboard: false });
    $("#gameReadyModal").modal("show");
  }

  //  Annuler depuis le modal de confirmation
  function doGameReadyCancel(initiatedBySelf) {
    const invId = gameReadyInvitationId;
    stopGameReadyPoll();
    stopGameReadyCountdown();
    gameReadyInvitationId = null;
    gameReadyConfirming = false;

    // Prévenir l'autre joueur
    if (invId) {
      $.ajax({
        url: "/invitations/" + invId + "/annuler-confirmation",
        method: "POST",
      });
    }

    $("#gameReadyModal").modal("hide");
  }

  $(document).on("click", "#joinGameConfirm", function() {
    const invId = gameReadyInvitationId;
    const url = $("#gameReadyModal").data("redirectUrl");

    if (!invId) {
      if (url) window.location.href = url;
      return;
    }

    gameReadyConfirming = true;
    stopGameReadyCountdown();
    $("#gameReadyCountdownWrap").hide();
    $("#joinGameConfirm").hide();
    $("#joinGameCancel").prop("disabled", true);

    $.ajax({ url: "/invitations/" + invId + "/confirmer", method: "POST" })
      .done(function(res) {
        if (res && res.lesDeuxConfirment) {
          stopGameReadyPoll();
          if (url) window.location.href = url;
          return;
        }
        $("#gameReadyMessage").text("En attente que l'autre joueur confirme…");
        $("#joinGameCancel").prop("disabled", false);
        // Le polling en cours detectera les deux confirmations ou l'annulation
      })
      .fail(function() {
        if (url) window.location.href = url;
      });
  });

  $(document).on("click", "#joinGameCancel", function() {
    doGameReadyCancel(true);
  });

  // Polling pour B : invitations en attente
  function checkForInvitations() {
    $.ajax({
      url: "/invitations/pending",
      method: "GET",
      cache: false,
      dataType: "json",
    })
      .done(function(data) {
        if (data && data.length > 0) {
          const inv = data[0];
          if (!currentInvitationId) {
            showInvitationPopup(
              inv.sender_username,
              inv.game_name,
              inv.id,
              inv.scheduled_at || null,
            );
          }
        }
      })
      .fail(function(xhr, status, err) {
        console.error("checkForInvitations failed", status, err);
      });
  }

  const seenRejectedSent = new Set();
  let isFirstRejectedCheck = true;

  function gameUrlFor(row) {
    if (row.connect4_game_id) return "/jeux/connect4/" + row.connect4_game_id;
    if (row.tictactoe_game_id)
      return "/jeux/tictactoe/" + row.tictactoe_game_id;
    return null;
  }

  function checkSentInvitations() {
    $.ajax({
      url: "/invitations/sent",
      method: "GET",
      cache: false,
      dataType: "json",
    })
      .done(function(rows) {
        (rows || []).forEach(function(r) {
          const invId = Number(r.id);

          if (
            r.status === "accepted" &&
            !r.expediteur_confirme &&
            !r.confirmation_annulee &&
            !gameReadyInvitationId
          ) {
            const url = gameUrlFor(r);
            if (url) {
              showGameReadyModal(
                url,
                r.id,
                r.receiver_username +
                " a accepté votre invitation. Voulez-vous rejoindre le salon ?",
              );
            }
          }

          if (r.status === "rejected" || r.status === "ignored") {
            if (isFirstRejectedCheck) {
              seenRejectedSent.add(invId);
            } else if (!seenRejectedSent.has(invId)) {
              seenRejectedSent.add(invId);
              const msg =
                r.status === "ignored"
                  ? r.receiver_username + " n'a pas répondu à votre invitation."
                  : r.receiver_username + " a refusé votre invitation.";
              showInfoMessage(msg);
            }
          }
        });

        if (isFirstRejectedCheck) {
          isFirstRejectedCheck = false;
        }
      })
      .fail(function(xhr, status, err) {
        console.error("checkSentInvitations failed", status, err);
      });
  }

  checkForInvitations();
  checkSentInvitations();
  setInterval(checkForInvitations, 2000);
  setInterval(checkSentInvitations, 2500);
});
