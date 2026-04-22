#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── Email fetching ──────────────────────────────────────────────
            get_emails,
            search_emails,
            // ── Email actions ───────────────────────────────────────────────
            send_email,
            delete_email,
            restore_email,
            mark_read,
            mark_starred,
            mark_flagged,
            move_to_folder,
            // ── Bulk actions ────────────────────────────────────────────────
            mark_all_read,
            bulk_delete,
            bulk_move,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── Structs ──────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EmailAddress {
    pub name: String,
    pub email: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Attachment {
    pub filename: String,
    pub size: u64,
    pub mime_type: String,
    pub url: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Email {
    pub id: String,
    pub account_id: String,
    pub folder: String,
    pub from: EmailAddress,
    pub to: Vec<EmailAddress>,
    pub cc: Vec<EmailAddress>,
    pub bcc: Vec<EmailAddress>,
    pub subject: String,
    pub preview: String,
    pub body: String,
    pub date: String, // ISO 8601
    pub read: bool,
    pub starred: bool,
    pub flagged: bool,
    pub tags: Vec<String>,
    pub labels: Vec<String>,
    pub attachments: Vec<Attachment>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EmailsResponse {
    pub emails: Vec<Email>,
    pub next_cursor: Option<String>,
    pub total: u64,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SendEmailPayload {
    pub account_id: String,
    pub to: Vec<EmailAddress>,
    pub cc: Vec<EmailAddress>,
    pub bcc: Vec<EmailAddress>,
    pub subject: String,
    pub body: String,
    pub attachments: Vec<Attachment>,
}

// ── Commands (implement these in Rust) ───────────────────────────────────────

#[tauri::command]
async fn get_emails(
    account_id: String,
    folder: String,
    cursor: Option<String>,
    limit: Option<u32>,
) -> Result<EmailsResponse, String> {
    // TODO: implement IMAP fetch
    todo!()
}

#[tauri::command]
async fn search_emails(account_id: String, query: String) -> Result<Vec<Email>, String> {
    // TODO: implement IMAP search
    todo!()
}

#[tauri::command]
async fn send_email(payload: SendEmailPayload) -> Result<(), String> {
    // TODO: implement SMTP send (e.g. lettre crate)
    todo!()
}

#[tauri::command]
async fn delete_email(id: String, permanent: bool) -> Result<(), String> {
    // TODO: move to Trash or expunge
    todo!()
}

#[tauri::command]
async fn restore_email(id: String) -> Result<(), String> {
    // TODO: move from Trash back to Inbox
    todo!()
}

#[tauri::command]
async fn mark_read(id: String, read: bool) -> Result<(), String> {
    // TODO: set/unset IMAP \Seen flag
    todo!()
}

#[tauri::command]
async fn mark_starred(id: String, starred: bool) -> Result<(), String> {
    // TODO: set/unset IMAP \Flagged or custom keyword
    todo!()
}

#[tauri::command]
async fn mark_flagged(id: String, flagged: bool) -> Result<(), String> {
    // TODO: set/unset custom flag keyword
    todo!()
}

#[tauri::command]
async fn move_to_folder(id: String, folder: String) -> Result<(), String> {
    // TODO: IMAP COPY + store \Deleted + expunge
    todo!()
}

#[tauri::command]
async fn mark_all_read(account_id: String, folder: String) -> Result<(), String> {
    // TODO: bulk IMAP \Seen on all UIDs in folder
    todo!()
}

#[tauri::command]
async fn bulk_delete(ids: Vec<String>, permanent: bool) -> Result<(), String> {
    // TODO: batch delete/expunge
    todo!()
}

#[tauri::command]
async fn bulk_move(ids: Vec<String>, folder: String) -> Result<(), String> {
    // TODO: batch COPY + expunge
    todo!()
}
