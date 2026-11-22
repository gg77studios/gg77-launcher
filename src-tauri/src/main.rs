// Esconde o console extra no Windows em builds de release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Linux com Wayland: o WebKitGTK pisca (e às vezes deixa a janela do jogo em branco) com o
    // renderizador DMABUF, principalmente no AppImage, que leva bibliotecas gráficas de outra
    // versão do Ubuntu. Desligar o DMABUF tirava a piscada, mas a página passava a ser desenhada
    // pela CPU e o jogo ficava com atraso na digitação. Pelo XWayland as duas coisas somem e a
    // placa de vídeo continua desenhando (testado em Ubuntu 26.04, GNOME, Intel UHD).
    // Quem quiser outro modo define GDK_BACKEND ao abrir o launcher.
    #[cfg(target_os = "linux")]
    if std::env::var_os("GDK_BACKEND").is_none() && std::env::var_os("WAYLAND_DISPLAY").is_some() {
        std::env::set_var("GDK_BACKEND", "x11");
    }
    gg77_launcher_lib::run()
}
