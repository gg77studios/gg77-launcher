// Esconde o console extra no Windows em builds de release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Linux: o renderizador DMABUF do WebKitGTK faz a tela piscar (e às vezes deixar a janela do
    // jogo em branco) no Wayland, principalmente no AppImage, que leva bibliotecas gráficas de outra
    // versão do Ubuntu. Desligado aqui, antes de qualquer janela; quem quiser pode sobrescrever
    // definindo a variável ao abrir o launcher.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    gg77_launcher_lib::run()
}
