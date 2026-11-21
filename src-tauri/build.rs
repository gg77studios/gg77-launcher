fn main() {
    // Declarar os comandos gera uma permissão por comando (allow-launch-game etc.).
    // Assim cada janela só recebe o que precisa: a de jogo só pode liberar conquistas.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["launch_game", "close_game", "unlock_achievement"]),
    ))
    .expect("falha ao rodar o tauri-build");
}
