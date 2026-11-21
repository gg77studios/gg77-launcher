// SDK do GG77 Launcher, injetado em toda página aberta numa janela de jogo.
// No jogo:  window.GG77?.unlock("primeira-vitoria", { title: "Primeira vitória", description: "..." })
// Fora do launcher (navegador comum) window.GG77 não existe, então use sempre o "?.".
(function () {
  if (window.GG77) return;
  var invoke = function (cmd, args) {
    var internals = window.__TAURI_INTERNALS__;
    if (!internals) return Promise.reject(new Error("GG77: ponte do launcher indisponível"));
    return internals.invoke(cmd, args);
  };
  window.GG77 = Object.freeze({
    version: 1,
    inLauncher: true,
    unlock: function (id, info) {
      info = info || {};
      return invoke("unlock_achievement", {
        id: String(id),
        title: info.title == null ? null : String(info.title),
        description: info.description == null ? null : String(info.description),
        icon: info.icon == null ? null : String(info.icon),
      });
    },
    // pede ao launcher para fechar o jogo, baixar a versão nova e abrir de novo
    requestUpdate: function () {
      return invoke("request_game_update", {});
    },
  });
  try {
    window.dispatchEvent(new Event("gg77:ready"));
  } catch (_) {}
})();
