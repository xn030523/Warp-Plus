use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct EmailResponse {
    email: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailMessage {
    pub id: String,
    pub from: String,
    pub to: String,
    pub subject: String,
    pub content: String,
    #[serde(rename = "htmlContent")]
    pub html_content: String,
    #[serde(rename = "hasHtml")]
    pub has_html: bool,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct EmailsResponse {
    emails: Vec<EmailMessage>,
}

#[tauri::command]
pub async fn generate_temp_email() -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://mail.chatgpt.org.uk/api/generate-email")
        .header("accept", "*/*")
        .header("accept-language", "zh-CN,zh;q=0.9,en;q=0.8")
        .header("cache-control", "no-cache")
        .header("pragma", "no-cache")
        .header("referer", "https://mail.chatgpt.org.uk/")
        .header("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let email_data: EmailResponse = response
        .json()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(email_data.email)
}

#[tauri::command]
pub async fn get_emails(email: String) -> Result<Vec<EmailMessage>, String> {
    let client = reqwest::Client::new();
    
    let url = format!("https://mail.chatgpt.org.uk/api/get-emails?email={}", email);
    
    let response = client
        .get(&url)
        .header("accept", "*/*")
        .header("accept-language", "zh-CN,zh;q=0.9,en;q=0.8")
        .header("cache-control", "no-cache")
        .header("pragma", "no-cache")
        .header("referer", "https://mail.chatgpt.org.uk/")
        .header("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let emails_response: EmailsResponse = response
        .json()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(emails_response.emails)
}
