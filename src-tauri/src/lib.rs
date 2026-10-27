// Prompt Vault - Rust backend
// All user data lives in the OS app-data folder as plain files:
//   vault.json      -> prompts, notes, templates, activity log, settings (synced to Drive)
//   api_keys.json   -> API keys only, NEVER synced to the cloud
//   auth.json       -> Google sign-in tokens (local only, never synced)
// Keeping api_keys.json fully separate from vault.json is what guarantees
// keys can never leak into a Drive backup by accident.

use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("cannot resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("cannot create app data dir: {e}"))?;
    Ok(dir)
}

fn file_path(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(name))
}

fn read_file(app: &tauri::AppHandle, name: &str) -> Result<Option<String>, String> {
    let path = file_path(app, name)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("cannot read {name}: {e}"))
}

fn write_file(app: &tauri::AppHandle, name: &str, contents: &str) -> Result<(), String> {
    let path = file_path(app, name)?;
    // Write to a temp file first, then rename, so a crash mid-write
    // can never corrupt the user's library.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, contents).map_err(|e| format!("cannot write {name}: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("cannot finalise {name}: {e}"))?;
    Ok(())
}

/// Load the main vault document (prompts/notes/templates/activity/settings).
/// Returns null on first run so the frontend can seed defaults.
#[tauri::command]
fn load_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    read_file(&app, "vault.json")
}

/// Save the main vault document.
#[tauri::command]
fn save_vault(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    write_file(&app, "vault.json", &contents)
}

/// Load API keys (local only, never part of vault.json / Drive sync).
#[tauri::command]
fn load_api_keys(app: tauri::AppHandle) -> Result<Option<String>, String> {
    read_file(&app, "api_keys.json")
}

/// Save API keys (local only).
#[tauri::command]
fn save_api_keys(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    write_file(&app, "api_keys.json", &contents)
}

/// Load Google auth state (tokens, local only).
#[tauri::command]
fn load_auth(app: tauri::AppHandle) -> Result<Option<String>, String> {
    read_file(&app, "auth.json")
}

/// Save Google auth state (local only).
#[tauri::command]
fn save_auth(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    write_file(&app, "auth.json", &contents)
}

/// Absolute path of the app data directory (shown in Settings).
#[tauri::command]
fn app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(data_dir(&app)?.to_string_lossy().to_string())
}

/// Write an arbitrary text export chosen by the user (downloads folder isn't
/// reachable from the webview sandbox, so exports go through here when the
/// path is provided by the native save dialog on the frontend side; in the
/// browser fallback the frontend uses a normal anchor download instead).
#[tauri::command]
fn write_export(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, &contents).map_err(|e| format!("cannot write export: {e}"))
}

/// Google OAuth 2.0 loopback sign-in for desktop apps.
/// Opens the system browser at `auth_url`, listens on the loopback
/// redirect URI for the one-time `code`, shows a "you can close this
/// tab" page in the browser, and returns the code to the frontend,
/// which exchanges it for tokens. Waits up to 5 minutes.
#[tauri::command]
async fn oauth_loopback_login(
    app: tauri::AppHandle,
    auth_url: String,
    redirect_uri: String,
) -> Result<String, String> {
    // Port is parsed from the redirect URI (http://127.0.0.1:PORT/...).
    let port: u16 = redirect_uri
        .rsplit(':')
        .next()
        .and_then(|tail| {
            let digits: String = tail.chars().take_while(|c| c.is_ascii_digit()).collect();
            digits.parse().ok()
        })
        .unwrap_or(53682);

    let listener = TcpListener::bind(("127.0.0.1", port))
        .map_err(|e| format!("cannot start local sign-in listener on port {port}: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("listener setup failed: {e}"))?;

    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("cannot open browser for Google sign-in: {e}"))?;

    let code = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let deadline = Instant::now() + Duration::from_secs(300);
        loop {
            if Instant::now() > deadline {
                return Err("Google sign-in timed out after 5 minutes.".to_string());
            }
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));
                    let mut buf = [0u8; 8192];
                    let n = stream.read(&mut buf).unwrap_or(0);
                    let request = String::from_utf8_lossy(&buf[..n]).to_string();
                    let first_line = request.lines().next().unwrap_or("");
                    // GET /oauth2redirect?code=...&state=... HTTP/1.1
                    let target = first_line.split_whitespace().nth(1).unwrap_or("");
                    let query = target.split('?').nth(1).unwrap_or("");
                    let mut code: Option<String> = None;
                    let mut error: Option<String> = None;
                    let mut state_param: Option<String> = None;
                    for pair in query.split('&') {
                        let mut parts = pair.splitn(2, '=');
                        let key = parts.next().unwrap_or("");
                        let value = parts.next().unwrap_or("");
                        let decoded = percent_decode(value);
                        if key == "code" {
                            code = Some(decoded);
                        } else if key == "error" {
                            error = Some(decoded);
                        } else if key == "state" {
                            state_param = Some(decoded);
                        }
                    }
                    let (title, body_text) = if code.is_some() {
                        ("Signed in", "Google sign-in complete. You can close this tab and return to Prompt Vault.")
                    } else {
                        ("Sign-in failed", "Google sign-in did not complete. You can close this tab and try again in Prompt Vault.")
                    };
                    let html = format!(
                        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Prompt Vault - {title}</title></head><body style=\"font-family:sans-serif;background:#FAF6EF;color:#1F2430;display:flex;align-items:center;justify-content:center;height:100vh;margin:0\"><div style=\"text-align:center\"><h1>{title}</h1><p>{body_text}</p></div></body></html>"
                    );
                    let response = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        html.len(),
                        html
                    );
                    let _ = stream.write_all(response.as_bytes());
                    let _ = stream.flush();
                    if let Some(c) = code {
                        // Return code + state as JSON so the frontend can
                        // verify the state against what it sent (CSRF).
                        return Ok(serde_json::json!({ "code": c, "state": state_param }).to_string());
                    }
                    if let Some(e) = error {
                        return Err(format!("Google sign-in was declined or failed: {e}"));
                    }
                    // Not an OAuth redirect (e.g. favicon) - keep waiting.
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(150));
                }
                Err(e) => return Err(format!("sign-in listener error: {e}")),
            }
        }
    })
    .await
    .map_err(|e| format!("sign-in task failed: {e}"))??;

    Ok(code)
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("");
            if let Ok(v) = u8::from_str_radix(hex, 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(if bytes[i] == b'+' { b' ' } else { bytes[i] });
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Relaunch after an update installs (and clean exit if ever needed).
        .plugin(tauri_plugin_process::init())
        // Self-update from GitHub Releases (signed artifacts only).
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Remembers the last window size/position across launches.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // First run on a small screen: shrink the 1280x800 default so
            // the window fits within ~94% of the display, centred.
            // (Later runs are handled by the window-state plugin above.)
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let mon_w = monitor.size().width as f64 / scale;
                    let mon_h = monitor.size().height as f64 / scale;
                    let fit_w = (mon_w * 0.94).min(1280.0).max(960.0_f64.min(mon_w * 0.94));
                    let fit_h = (mon_h * 0.94).min(800.0).max(640.0_f64.min(mon_h * 0.94));
                    if mon_w < 1360.0 || mon_h < 860.0 {
                        let _ = window.set_size(tauri::LogicalSize::new(fit_w, fit_h));
                        let _ = window.center();
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_vault,
            save_vault,
            load_api_keys,
            save_api_keys,
            load_auth,
            save_auth,
            app_data_path,
            write_export,
            oauth_loopback_login
        ])
        .run(tauri::generate_context!())
        .expect("error while running Prompt Vault");
}
