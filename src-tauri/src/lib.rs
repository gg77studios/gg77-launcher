use serde::Serialize;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

/// Script injetado em toda página aberta numa janela de jogo: expõe `window.GG77`.
const SDK: &str = include_str!("sdk.js");

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionEvent {
    game_id: String,
    seconds: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UnlockEvent {
    game_id: String,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
}

/// Rótulos de janela aceitam só alguns caracteres; os ids do catálogo já são slugs.
fn slug(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .take(48)
        .collect()
}

fn clip(value: Option<String>, max: usize) -> Option<String> {
    value.map(|v| v.chars().take(max).collect())
}

/// Abre o jogo numa janela própria (ou foca a que já está aberta) e mede a sessão.
#[tauri::command]
fn launch_game(app: AppHandle, game_id: String, url: String, title: String) -> Result<(), String> {
    let id = slug(&game_id);
    if id.is_empty() {
        return Err("id de jogo inválido".into());
    }
    let label = format!("game-{id}");

    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }

    let parsed: Url = url.parse().map_err(|_| "endereço do jogo inválido".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("o endereço precisa começar com http ou https".into());
    }

    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(parsed))
        .title(&title)
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 560.0)
        .initialization_script(SDK)
        .build()
        .map_err(|e| e.to_string())?;

    let started = Instant::now();
    let handle = app.clone();
    let gid = id.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            let _ = handle.emit_to(
                "main",
                "game-closed",
                SessionEvent { game_id: gid.clone(), seconds: started.elapsed().as_secs() },
            );
        }
    });

    let _ = app.emit_to("main", "game-started", id);
    Ok(())
}

#[tauri::command]
fn close_game(app: AppHandle, game_id: String) {
    if let Some(w) = app.get_webview_window(&format!("game-{}", slug(&game_id))) {
        let _ = w.close();
    }
}

/// Chamado pelo jogo (via `window.GG77.unlock`). O jogo é identificado pela janela,
/// então uma página não consegue liberar conquista de outro jogo.
#[tauri::command]
fn unlock_achievement(
    window: WebviewWindow,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
) -> Result<(), String> {
    let game_id = window
        .label()
        .strip_prefix("game-")
        .ok_or("só janelas de jogo podem liberar conquistas")?
        .to_string();
    let id = slug(&id);
    if id.is_empty() {
        return Err("id de conquista inválido".into());
    }
    window
        .app_handle()
        .emit_to(
            "main",
            "achievement-unlocked",
            UnlockEvent {
                game_id,
                id,
                title: clip(title, 80),
                description: clip(description, 200),
                icon: clip(icon, 500),
            },
        )
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![launch_game, close_game, unlock_achievement])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o launcher");
}
