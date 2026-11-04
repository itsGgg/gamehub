$(function () {
  const $body = $("body");
  const $login = $("#form_login");
  const $register = $("#form_register");
  const $status = $("#status_message");

  function showStatus(message, type) {
    $status
      .removeClass("d-none alert-success alert-danger alert-warning alert-info")
      .addClass("alert-" + type)
      .text(message);
  }

  function hideStatus() {
    $status.addClass("d-none");
  }

  function setMode(mode) {
    if (mode === "register") {
      $login.attr("hidden", true);
      $register.removeAttr("hidden");
    } else {
      $register.attr("hidden", true);
      $login.removeAttr("hidden");
    }
    hideStatus();
  }

  setMode($body.attr("data-initial-mode") || "login");

  function bindPasswordToggle(checkboxId, fieldIds) {
    $("#" + checkboxId).on("change", function () {
      const type = this.checked ? "text" : "password";
      fieldIds.forEach(function (id) {
        $("#" + id).attr("type", type);
      });
    });
  }

  bindPasswordToggle("affiche_mdp_login", ["login_pswd"]);
  bindPasswordToggle("affiche_mdp_register", ["pswd1", "pswd2"]);

  function submitForm($form) {
    const url = $form.attr("action");
    const data = {};

    $form
      .find("input")
      .not(":checkbox")
      .add("select, textarea")
      .each(function () {
        const $input = $(this);
        const name = $input.attr("name");
        if (!name) return;
        data[name] = $input.val();
      });

    const $checkedBoxes = $form.find("input[name='preferences[]']");
    const prefs = $checkedBoxes
      .filter(":checked")
      .map(function () {
        return $(this).val();
      })
      .get();
    if (prefs.length) data["preferences[]"] = prefs;

    $.ajax({
      url: url,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
    })
      .done(function (response) {
        showStatus(response.message || "Succes", "success");
        if (response.redirectTo) {
          setTimeout(function () {
            window.location.href = response.redirectTo;
          }, 400);
        }
      })
      .fail(function (xhr) {
        const msg =
          (xhr.responseJSON && xhr.responseJSON.message) ||
          "Une erreur est survenue.";
        showStatus(msg, "danger");
      });
  }

  $login.on("submit", function (e) {
    e.preventDefault();
    submitForm($(this));
  });

  $register.on("submit", function (e) {
    e.preventDefault();
    const pwd = $("#pswd1").val();
    const confirm = $("#pswd2").val();
    if (pwd !== confirm) {
      showStatus("Les mots de passe ne correspondent pas.", "danger");
      return;
    }
    submitForm($(this));
  });
});
