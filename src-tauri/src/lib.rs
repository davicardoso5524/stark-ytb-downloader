use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};

const LICENSE_PRODUCT: &str = "stark-tube";
const LICENSE_PRODUCT_LEGACY: &str = "yt-download";
const LICENSE_VERSION: &str = "1";
const LICENSE_KEY_PREFIX: &str = "YTDL1";
// Troque por sua chave publica Ed25519 em base64 (32 bytes).
const LICENSE_PUBLIC_KEY_B64: &str = "MCowBQYDK2VwAyEA+x+CjctZxm3BcmhrRhygWtED3EIKFg398yvLK4qObUU=";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VideoMetadata {
    id: String,
    title: String,
    uploader: Option<String>,
    duration_seconds: Option<u64>,
    webpage_url: Option<String>,
    thumbnail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistEntry {
    id: String,
    title: String,
    url: String,
    channel: Option<String>,
    duration_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlaylistData {
    id: Option<String>,
    title: String,
    entries: Vec<PlaylistEntry>,
}

#[derive(Debug)]
struct ProcessOutput {
    status_ok: bool,
    stdout: String,
    stderr: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RawYtDlpJson {
    id: Option<String>,
    title: Option<String>,
    uploader: Option<String>,
    duration: Option<serde_json::Value>,
    webpage_url: Option<String>,
    thumbnail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPlaylistEntry {
    id: Option<String>,
    title: Option<String>,
    url: Option<String>,
    webpage_url: Option<String>,
    uploader: Option<String>,
    channel: Option<String>,
    duration: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPlaylistJson {
    id: Option<String>,
    title: Option<String>,
    entries: Option<Vec<RawPlaylistEntry>>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadProgressEvent {
    task_id: String,
    video_title: String,
    percent: f64,
    raw_line: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DownloadDoneEvent {
    task_id: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseChallenge {
    product: String,
    version: String,
    platform: String,
    machine_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicenseClaims {
    product: String,
    version: Option<serde_json::Value>,
    email: Option<String>,
    machine_code: Option<String>,
    exp: Option<u64>,
    iat: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseClaimsPublic {
    product: String,
    version: Option<String>,
    email: Option<String>,
    machine_code: Option<String>,
    exp: Option<u64>,
    iat: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseVerificationResult {
    valid: bool,
    message: String,
    claims: Option<LicenseClaimsPublic>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PersistedDownloadHistoryEntry {
    id: String,
    source: String,
    url: String,
    title: String,
    destination_folder: String,
    media_type: String,
    format: String,
    quality: String,
    status: String,
    percent: f64,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PersistedDownloadHistory {
    standard: Vec<PersistedDownloadHistoryEntry>,
    playlist: Vec<PersistedDownloadHistoryEntry>,
}

fn license_storage_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel resolver AppData: {}", err))?;

    Ok(app_data_dir.join("license.key"))
}

fn history_storage_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Nao foi possivel resolver AppData: {}", err))?;

    Ok(app_data_dir.join("download_history.json"))
}

fn platform_label() -> String {
    format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH)
}

fn machine_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown-machine".to_string())
}

fn machine_code() -> String {
    let raw = format!(
        "{}|{}|{}|{}",
        LICENSE_PRODUCT,
        platform_label(),
        std::env::consts::ARCH,
        machine_name()
    );

    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    let digest = hasher.finalize();
    hex::encode_upper(digest)[..32].to_string()
}

fn current_unix_secs() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map_err(|err| format!("Relogio do sistema invalido: {}", err))
}

fn parse_license_key_parts(license_key: &str) -> Result<(String, String), String> {
    let trimmed = license_key.trim();
    if trimmed.is_empty() {
        return Err("Informe a chave de licenca.".to_string());
    }

    let mut parts = trimmed.split('.');
    let prefix = parts.next().unwrap_or_default();
    let payload_b64 = parts.next().unwrap_or_default();
    let signature_b64 = parts.next().unwrap_or_default();

    if parts.next().is_some() {
        return Err("Formato de chave invalido.".to_string());
    }

    if prefix != LICENSE_KEY_PREFIX || payload_b64.is_empty() || signature_b64.is_empty() {
        return Err("Formato de chave invalido.".to_string());
    }

    Ok((payload_b64.to_string(), signature_b64.to_string()))
}

fn decode_public_key() -> Result<VerifyingKey, String> {
    let decoded = STANDARD
        .decode(LICENSE_PUBLIC_KEY_B64)
        .map_err(|err| format!("Falha ao ler chave publica: {}", err))?;

    // Accept both encodings:
    // 1) raw Ed25519 public key (32 bytes)
    // 2) SPKI DER for Ed25519 (44 bytes):
    //    30 2A 30 05 06 03 2B 65 70 03 21 00 || <32-byte key>
    let key_slice: &[u8] = if decoded.len() == 32 {
        decoded.as_slice()
    } else if decoded.len() == 44 {
        const ED25519_SPKI_PREFIX: [u8; 12] = [
            0x30, 0x2A, 0x30, 0x05, 0x06, 0x03, 0x2B, 0x65, 0x70, 0x03, 0x21, 0x00,
        ];

        if decoded[..12] != ED25519_SPKI_PREFIX {
            return Err("Chave publica SPKI invalida para Ed25519.".to_string());
        }

        &decoded[12..]
    } else {
        return Err(
            "Chave publica invalida: esperado raw 32 bytes ou SPKI DER 44 bytes.".to_string(),
        );
    };

    let key_bytes: [u8; 32] = key_slice
        .try_into()
        .map_err(|_| "Chave publica invalida: tamanho incorreto.".to_string())?;

    VerifyingKey::from_bytes(&key_bytes)
        .map_err(|err| format!("Chave publica invalida: {}", err))
}

fn to_public_claims(claims: &LicenseClaims) -> LicenseClaimsPublic {
    LicenseClaimsPublic {
        product: claims.product.clone(),
        version: claims
            .version
            .as_ref()
            .and_then(normalize_license_version),
        email: claims.email.clone(),
        machine_code: claims.machine_code.clone(),
        exp: claims.exp,
        iat: claims.iat,
    }
}

fn normalize_license_version(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn is_supported_license_product(product: &str) -> bool {
    product == LICENSE_PRODUCT || product == LICENSE_PRODUCT_LEGACY
}

#[tauri::command]
async fn get_license_challenge() -> Result<LicenseChallenge, String> {
    Ok(LicenseChallenge {
        product: LICENSE_PRODUCT.to_string(),
        version: LICENSE_VERSION.to_string(),
        platform: platform_label(),
        machine_code: machine_code(),
    })
}

#[tauri::command]
async fn verify_license_key(license_key: String) -> Result<LicenseVerificationResult, String> {
    let (payload_b64, signature_b64) = parse_license_key_parts(&license_key)?;

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(payload_b64.as_bytes())
        .map_err(|_| "Payload da chave invalido.".to_string())?;

    let signature_bytes = URL_SAFE_NO_PAD
        .decode(signature_b64.as_bytes())
        .map_err(|_| "Assinatura da chave invalida.".to_string())?;

    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "Assinatura da chave invalida.".to_string())?;

    let public_key = decode_public_key()?;
    public_key
        .verify(&payload_bytes, &signature)
        .map_err(|_| "Assinatura da chave nao confere.".to_string())?;

    let claims: LicenseClaims = serde_json::from_slice(&payload_bytes)
        .map_err(|_| "Claims da chave invalidos.".to_string())?;

    if !is_supported_license_product(&claims.product) {
        return Ok(LicenseVerificationResult {
            valid: false,
            message: "A chave nao pertence a este software.".to_string(),
            claims: Some(to_public_claims(&claims)),
        });
    }

    if let Some(version_value) = &claims.version {
        let normalized = normalize_license_version(version_value);
        if normalized.as_deref() != Some(LICENSE_VERSION) {
            return Ok(LicenseVerificationResult {
                valid: false,
                message: "Versao da chave incompativel com o app.".to_string(),
                claims: Some(to_public_claims(&claims)),
            });
        }
    }

    if let Some(exp) = claims.exp {
        let now = current_unix_secs()?;
        if now > exp {
            return Ok(LicenseVerificationResult {
                valid: false,
                message: "A chave expirou.".to_string(),
                claims: Some(to_public_claims(&claims)),
            });
        }
    }

    if let Some(expected_machine) = &claims.machine_code {
        let current_machine = machine_code();
        if expected_machine != &current_machine {
            return Ok(LicenseVerificationResult {
                valid: false,
                message: "Esta chave foi gerada para outra maquina.".to_string(),
                claims: Some(to_public_claims(&claims)),
            });
        }
    }

    Ok(LicenseVerificationResult {
        valid: true,
        message: "Chave valida.".to_string(),
        claims: Some(to_public_claims(&claims)),
    })
}

#[tauri::command]
async fn get_persisted_license_key(app: AppHandle) -> Result<Option<String>, String> {
    let path = license_storage_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path)
        .map_err(|err| format!("Falha ao ler chave salva: {}", err))?;
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    Ok(Some(trimmed.to_string()))
}

#[tauri::command]
async fn persist_license_key(app: AppHandle, license_key: String) -> Result<(), String> {
    let trimmed = license_key.trim();
    if trimmed.is_empty() {
        return Err("Chave vazia nao pode ser salva.".to_string());
    }

    let path = license_storage_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("Falha ao preparar pasta de dados: {}", err))?;
    }

    fs::write(&path, trimmed.as_bytes())
        .map_err(|err| format!("Falha ao salvar chave localmente: {}", err))
}

#[tauri::command]
async fn clear_persisted_license_key(app: AppHandle) -> Result<(), String> {
    let path = license_storage_path(&app)?;
    if !path.exists() {
        return Ok(());
    }

    fs::remove_file(&path)
        .map_err(|err| format!("Falha ao remover chave local salva: {}", err))
}

#[tauri::command]
async fn get_persisted_download_history(app: AppHandle) -> Result<PersistedDownloadHistory, String> {
    let path = history_storage_path(&app)?;
    if !path.exists() {
        return Ok(PersistedDownloadHistory {
            standard: Vec::new(),
            playlist: Vec::new(),
        });
    }

    let raw = fs::read_to_string(&path)
        .map_err(|err| format!("Falha ao ler historico salvo: {}", err))?;

    if raw.trim().is_empty() {
        return Ok(PersistedDownloadHistory {
            standard: Vec::new(),
            playlist: Vec::new(),
        });
    }

    serde_json::from_str::<PersistedDownloadHistory>(&raw)
        .map_err(|err| format!("Falha ao interpretar historico salvo: {}", err))
}

#[tauri::command]
async fn persist_download_history(
    app: AppHandle,
    history: PersistedDownloadHistory,
) -> Result<(), String> {
    let path = history_storage_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("Falha ao preparar pasta do historico: {}", err))?;
    }

    let json = serde_json::to_string_pretty(&history)
        .map_err(|err| format!("Falha ao serializar historico: {}", err))?;

    fs::write(&path, json.as_bytes())
        .map_err(|err| format!("Falha ao salvar historico local: {}", err))
}

fn is_valid_youtube_url(url: &str) -> bool {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return false;
    }

    let lower = trimmed.to_ascii_lowercase();
    (lower.starts_with("https://") || lower.starts_with("http://"))
        && (lower.contains("youtube.com/") || lower.contains("youtu.be/"))
}

fn candidate_paths(tool_name: &str, app: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let executable = if cfg!(windows) {
        format!("{}.exe", tool_name)
    } else {
        tool_name.to_string()
    };

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("tools").join("bin").join("windows").join(&executable));
        candidates.push(cwd.join("tools").join("bin").join(&executable));
        candidates.push(cwd.join("bin").join(&executable));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(
                exe_dir
                    .join("_up_")
                    .join("tools")
                    .join("bin")
                    .join("windows")
                    .join(&executable),
            );
            candidates.push(
                exe_dir
                    .join("_up_")
                    .join("bin")
                    .join("windows")
                    .join(&executable),
            );
            candidates.push(exe_dir.join("_up_").join(&executable));
            candidates.push(exe_dir.join("resources").join("tools").join("bin").join("windows").join(&executable));
            candidates.push(exe_dir.join("resources").join(&executable));
            candidates.push(
                exe_dir
                    .join("tools")
                    .join("bin")
                    .join("windows")
                    .join(&executable),
            );
            candidates.push(exe_dir.join("bin").join("windows").join(&executable));
            candidates.push(exe_dir.join("bin").join(&executable));
            candidates.push(exe_dir.join(&executable));
        }
    }

    if let Some(app_handle) = app {
        if let Ok(app_local_data_dir) = app_handle.path().app_local_data_dir() {
            candidates.push(
                app_local_data_dir
                    .join("_up_")
                    .join("tools")
                    .join("bin")
                    .join("windows")
                    .join(&executable),
            );
            candidates.push(
                app_local_data_dir
                    .join("tools")
                    .join("bin")
                    .join("windows")
                    .join(&executable),
            );
            candidates.push(app_local_data_dir.join(&executable));
        }

        if let Ok(resource_dir) = app_handle.path().resource_dir() {
            candidates.push(resource_dir.join("tools").join("bin").join("windows").join(&executable));
            candidates.push(resource_dir.join("bin").join("windows").join(&executable));
            candidates.push(resource_dir.join(&executable));
        }

        if let Ok(resolved) = app_handle
            .path()
            .resolve(format!("tools/bin/windows/{}", executable), BaseDirectory::Resource)
        {
            candidates.push(resolved);
        }

        if let Ok(resolved) = app_handle
            .path()
            .resolve(format!("bin/windows/{}", executable), BaseDirectory::Resource)
        {
            candidates.push(resolved);
        }

        if let Ok(resolved) = app_handle
            .path()
            .resolve(&executable, BaseDirectory::Resource)
        {
            candidates.push(resolved);
        }
    }

    candidates
}

fn run_process(executable: &str, args: &[&str]) -> Result<ProcessOutput, String> {
    let output = Command::new(executable)
        .args(args)
        .output()
        .map_err(|err| format!("Falha ao executar '{}': {}", executable, err))?;

    Ok(ProcessOutput {
        status_ok: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn resolve_executable(tool_name: &str, app: Option<&AppHandle>) -> Result<String, String> {
    for path in candidate_paths(tool_name, app) {
        if path.exists() {
            let executable = path.to_string_lossy().to_string();
            if run_process(&executable, &["--version"]).is_ok() {
                return Ok(executable);
            }
        }
    }

    if run_process(tool_name, &["--version"]).is_ok() {
        return Ok(tool_name.to_string());
    }

    Err(format!(
        "Nao foi possivel localizar '{}' no PATH ou em tools/bin.",
        tool_name
    ))
}

fn extract_percent(line: &str) -> Option<f64> {
    let percent_idx = line.find('%')?;
    let before = &line[..percent_idx];
    let start = before
        .rfind(|c: char| !(c.is_ascii_digit() || c == '.'))
        .map_or(0, |idx| idx + 1);
    let number = before.get(start..)?.trim();
    number.parse::<f64>().ok()
}

fn extract_title_from_destination(line: &str) -> Option<String> {
    let marker = "[download] Destination:";
    if !line.contains(marker) {
        return None;
    }

    let file_name = line.split(marker).nth(1)?.trim();
    if file_name.is_empty() {
        return None;
    }

    Some(file_name.to_string())
}

fn normalize_video_format(input: &str) -> String {
    match input.to_ascii_lowercase().as_str() {
        "mp4" | "mkv" | "webm" => input.to_ascii_lowercase(),
        _ => "mp4".to_string(),
    }
}

fn normalize_audio_format(input: &str) -> String {
    match input.to_ascii_lowercase().as_str() {
        "mp3" | "m4a" | "opus" => input.to_ascii_lowercase(),
        _ => "mp3".to_string(),
    }
}

fn normalize_video_quality(input: &str) -> u32 {
    match input {
        "2160" => 2160,
        "1440" => 1440,
        "1080" => 1080,
        "720" => 720,
        "480" => 480,
        "360" => 360,
        "240" => 240,
        "144" => 144,
        _ => 1080,
    }
}

fn normalize_audio_quality(input: &str) -> u32 {
    match input {
        "320" => 320,
        "256" => 256,
        "192" => 192,
        "128" => 128,
        "64" => 64,
        _ => 192,
    }
}

fn normalize_duration_seconds(value: &serde_json::Value) -> Option<u64> {
    match value {
        serde_json::Value::Number(n) => {
            if let Some(as_u64) = n.as_u64() {
                return Some(as_u64);
            }

            n.as_f64()
                .filter(|v| v.is_finite() && *v >= 0.0)
                .map(|v| v.floor() as u64)
        }
        serde_json::Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                return None;
            }

            trimmed
                .parse::<f64>()
                .ok()
                .filter(|v| v.is_finite() && *v >= 0.0)
                .map(|v| v.floor() as u64)
        }
        _ => None,
    }
}

fn build_video_selector(max_height: u32) -> String {
    format!(
        "bestvideo[height<={0}]+bestaudio/best[height<={0}]/best",
        max_height
    )
}

fn build_audio_selector(max_bitrate: u32) -> String {
    format!("bestaudio[abr<={0}]/bestaudio", max_bitrate)
}

fn resolve_playlist_entry_url(entry: &RawPlaylistEntry) -> Option<String> {
    if let Some(webpage_url) = &entry.webpage_url {
        if !webpage_url.trim().is_empty() {
            return Some(webpage_url.trim().to_string());
        }
    }

    if let Some(url) = &entry.url {
        let trimmed = url.trim();
        if trimmed.is_empty() {
            return None;
        }

        if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
            return Some(trimmed.to_string());
        }

        return Some(format!("https://www.youtube.com/watch?v={}", trimmed));
    }

    if let Some(id) = &entry.id {
        let trimmed = id.trim();
        if trimmed.is_empty() {
            return None;
        }

        return Some(format!("https://www.youtube.com/watch?v={}", trimmed));
    }

    None
}

#[tauri::command]
async fn fetch_video_metadata(app: AppHandle, url: String) -> Result<VideoMetadata, String> {
    if !is_valid_youtube_url(&url) {
        return Err("URL invalida: informe um link do YouTube (youtube.com ou youtu.be).".to_string());
    }

    let yt_dlp = resolve_executable("yt-dlp", Some(&app))?;
    let url_clone = url.clone();

    let output = tauri::async_runtime::spawn_blocking(move || {
        run_process(
            &yt_dlp,
            &["--dump-single-json", "--skip-download", "--no-playlist", &url_clone],
        )
    })
    .await
    .map_err(|err| format!("Falha na task de validacao: {}", err))??;

    if !output.status_ok {
        let message = if output.stderr.trim().is_empty() {
            "Falha ao validar URL no yt-dlp.".to_string()
        } else {
            format!("yt-dlp retornou erro: {}", output.stderr.trim())
        };
        return Err(message);
    }

    let raw: RawYtDlpJson = serde_json::from_str(&output.stdout)
        .map_err(|err| format!("Falha ao ler resposta do yt-dlp: {}", err))?;

    let id = raw.id.unwrap_or_default();
    let title = raw.title.unwrap_or_default();

    if id.is_empty() || title.is_empty() {
        return Err("Nao foi possivel extrair metadados basicos do video.".to_string());
    }

    Ok(VideoMetadata {
        id,
        title,
        uploader: raw.uploader,
        duration_seconds: raw
            .duration
            .as_ref()
            .and_then(normalize_duration_seconds),
        webpage_url: raw.webpage_url,
        thumbnail: raw.thumbnail,
    })
}

#[tauri::command]
async fn fetch_playlist_entries(app: AppHandle, url: String) -> Result<PlaylistData, String> {
    if !is_valid_youtube_url(&url) {
        return Err("URL invalida: informe um link do YouTube (youtube.com ou youtu.be).".to_string());
    }

    let yt_dlp = resolve_executable("yt-dlp", Some(&app))?;
    let url_clone = url.clone();

    let output = tauri::async_runtime::spawn_blocking(move || {
        run_process(
            &yt_dlp,
            &["--dump-single-json", "--flat-playlist", "--skip-download", &url_clone],
        )
    })
    .await
    .map_err(|err| format!("Falha na task de playlist: {}", err))??;

    if !output.status_ok {
        let message = if output.stderr.trim().is_empty() {
            "Falha ao carregar playlist no yt-dlp.".to_string()
        } else {
            format!("yt-dlp retornou erro: {}", output.stderr.trim())
        };
        return Err(message);
    }

    let raw: RawPlaylistJson = serde_json::from_str(&output.stdout)
        .map_err(|err| format!("Falha ao ler resposta da playlist: {}", err))?;

    let mut entries = Vec::new();
    for item in raw.entries.unwrap_or_default().into_iter().take(300) {
        let Some(resolved_url) = resolve_playlist_entry_url(&item) else {
            continue;
        };

        let title = item
            .title
            .unwrap_or_else(|| "Video sem titulo".to_string())
            .trim()
            .to_string();

        let id = item.id.unwrap_or_else(|| {
            resolved_url
                .split("v=")
                .nth(1)
                .unwrap_or("unknown")
                .split('&')
                .next()
                .unwrap_or("unknown")
                .to_string()
        });

        entries.push(PlaylistEntry {
            id,
            title,
            url: resolved_url,
            channel: item.channel.or(item.uploader),
            duration_seconds: item
                .duration
                .as_ref()
                .and_then(normalize_duration_seconds),
        });
    }

    if entries.is_empty() {
        return Err("Nao encontramos videos validos nessa playlist.".to_string());
    }

    Ok(PlaylistData {
        id: raw.id,
        title: raw
            .title
            .unwrap_or_else(|| "Playlist do YouTube".to_string())
            .trim()
            .to_string(),
        entries,
    })
}

#[tauri::command]
async fn start_download(
    app: AppHandle,
    task_id: String,
    url: String,
    destination_folder: String,
    video_title: Option<String>,
    media_type: String,
    format: String,
    quality: String,
) -> Result<(), String> {
    if !is_valid_youtube_url(&url) {
        return Err("URL invalida: informe um link do YouTube (youtube.com ou youtu.be).".to_string());
    }

    let destination = destination_folder.trim();
    if destination.is_empty() {
        return Err("Selecione uma pasta de destino antes de iniciar o download.".to_string());
    }

    fs::create_dir_all(destination)
        .map_err(|err| format!("Nao foi possivel preparar pasta de destino: {}", err))?;

    let yt_dlp = resolve_executable("yt-dlp", Some(&app))?;
    let ffmpeg_location = resolve_executable("ffmpeg", Some(&app))
        .ok()
        .and_then(|path| PathBuf::from(path).parent().map(|p| p.to_path_buf()));

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let url_clone = url.clone();
    let destination_clone = destination.to_string();
    let expected_title = video_title.unwrap_or_else(|| "Video em download".to_string());
    let media_type_normalized = media_type.to_ascii_lowercase();
    let format_value = format;
    let quality_value = quality;

    tauri::async_runtime::spawn(async move {
        let app_for_emit = app_handle.clone();
        let task_id_for_emit = task_id_clone.clone();
        let result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
            let mut command = Command::new(&yt_dlp);
            command
                .arg("--newline")
                .arg("--no-playlist")
                .arg("-P")
                .arg(&destination_clone)
                .arg("-o")
                .arg("%(title).200B [%(id)s].%(ext)s")
                .arg(&url_clone)
                .stdout(Stdio::null())
                .stderr(Stdio::piped());

            if media_type_normalized == "audio" {
                let selected_format = normalize_audio_format(&format_value);
                let selected_quality = normalize_audio_quality(&quality_value);
                let selector = build_audio_selector(selected_quality);

                command
                    .arg("-f")
                    .arg(selector)
                    .arg("-x")
                    .arg("--audio-format")
                    .arg(selected_format);
            } else {
                let selected_format = normalize_video_format(&format_value);
                let selected_quality = normalize_video_quality(&quality_value);
                let selector = build_video_selector(selected_quality);

                command
                    .arg("-f")
                    .arg(selector)
                    .arg("--merge-output-format")
                    .arg(selected_format);
            }

            if let Some(ffmpeg_dir) = ffmpeg_location {
                command.arg("--ffmpeg-location").arg(ffmpeg_dir);
            }

            let mut child = command
                .spawn()
                .map_err(|err| format!("Falha ao iniciar yt-dlp: {}", err))?;

            let stderr = child
                .stderr
                .take()
                .ok_or_else(|| "Nao foi possivel capturar logs do yt-dlp.".to_string())?;

            let mut current_title = expected_title;

            for line in BufReader::new(stderr).lines() {
                let line = line.map_err(|err| format!("Erro ao ler progresso: {}", err))?;

                if let Some(found) = extract_title_from_destination(&line) {
                    current_title = found;
                }

                if let Some(percent) = extract_percent(&line) {
                    let payload = DownloadProgressEvent {
                        task_id: task_id_for_emit.clone(),
                        video_title: current_title.clone(),
                        percent,
                        raw_line: line.clone(),
                    };

                    let _ = app_for_emit.emit("download-progress", payload);
                }
            }

            let status = child
                .wait()
                .map_err(|err| format!("Falha ao aguardar processo de download: {}", err))?;

            if status.success() {
                Ok(())
            } else {
                Err("yt-dlp finalizou com erro durante o download.".to_string())
            }
        })
        .await;

        match result {
            Ok(Ok(())) => {
                let _ = app_handle.emit(
                    "download-complete",
                    DownloadDoneEvent {
                        task_id: task_id_clone.clone(),
                        message: "Download finalizado com sucesso.".to_string(),
                    },
                );
            }
            Ok(Err(err)) => {
                let _ = app_handle.emit(
                    "download-error",
                    DownloadDoneEvent {
                        task_id: task_id_clone.clone(),
                        message: err,
                    },
                );
            }
            Err(join_err) => {
                let _ = app_handle.emit(
                    "download-error",
                    DownloadDoneEvent {
                        task_id: task_id_clone,
                        message: format!("Falha na task de download: {}", join_err),
                    },
                );
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Pasta de destino invalida.".to_string());
    }

    let folder = PathBuf::from(trimmed);
    if !folder.exists() {
        return Err("A pasta de destino nao existe mais.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(trimmed)
            .spawn()
            .map_err(|err| format!("Falha ao abrir pasta no Explorer: {}", err))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|err| format!("Falha ao abrir pasta: {}", err))?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|err| format!("Falha ao abrir pasta: {}", err))?;
        return Ok(());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fetch_video_metadata,
            fetch_playlist_entries,
            get_license_challenge,
            verify_license_key,
            get_persisted_license_key,
            persist_license_key,
            clear_persisted_license_key,
            get_persisted_download_history,
            persist_download_history,
            open_folder,
            start_download
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
