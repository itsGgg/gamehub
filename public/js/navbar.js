$(function () {
  const isLoggedIn = $("nav.gh-navbar").data("logged-in") === true;

  if (isLoggedIn) {
    $.post("/online");

    window.addEventListener("beforeunload", function () {
      navigator.sendBeacon("/offline");
    });
  }

  const $status = $("#status_message");

  function showStatus(message, type) {
    if (!$status.length) {
      return;
    }

    $status
      .removeClass("d-none alert-success alert-danger alert-warning alert-info")
      .addClass("alert-" + type)
      .text(message);
  }

  $(".availability-toggle").on("click", function (e) {
    e.preventDefault();

    $.ajax({
      url: "/disponibilite",
      method: "POST",
    })
      .done(function (response) {
        const isAvailable = Boolean(response.isAvailable);
        const nextLabel = isAvailable
          ? "Passer indisponible"
          : "Passer disponible";
        const currentLabel = isAvailable ? "Disponible" : "Indisponible";

        $(".availability-toggle").text(nextLabel);

        $("#availability-state").text(currentLabel);
        showStatus("Statut mis à jour.", "success");
      })
      .fail(function (xhr) {
        const msg =
          (xhr.responseJSON && xhr.responseJSON.message) ||
          "Impossible de mettre à jour la disponibilité.";
        showStatus(msg, "danger");
      });
  });
});
