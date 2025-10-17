use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const API_BASE_URL: &str = "https://play.daiju.live";

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub token: Option<String>,
    pub role: Option<String>,
    pub balance: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSession {
    pub token: String,
    pub role: String,
    pub balance: f64,
    pub logged_in_at: String,
    pub password: String, // 保存密码用于刷新
}

fn get_session_path() -> PathBuf {
    let app_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("warp-plus");
    
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("user_session.json")
}

/// 保存用户会话到本地
fn save_session(session: &UserSession) -> Result<(), String> {
    let path = get_session_path();
    let content = serde_json::to_string_pretty(session)
        .map_err(|e| format!("序列化会话失败: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("保存会话失败: {}", e))
}

/// 从本地加载用户会话
fn load_session() -> Result<UserSession, String> {
    let path = get_session_path();
    if !path.exists() {
        return Err("未找到会话信息".to_string());
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取会话失败: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("解析会话失败: {}", e))
}

/// 清除本地会话
fn clear_session() -> Result<(), String> {
    let path = get_session_path();
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("清除会话失败: {}", e))?;
    }
    Ok(())
}

/// 用户登录
#[tauri::command]
pub async fn login(password: String) -> Result<LoginResponse, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .post(format!("{}/api/login", API_BASE_URL))
        .header("Content-Type", "application/json")
        .json(&LoginRequest { password: password.clone() })
        .send()
        .await
        .map_err(|e| format!("登录请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("登录失败: HTTP {} - {}", status, error_text));
    }
    
    let login_response: LoginResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    // 如果登录成功，保存会话
    if login_response.success {
        if let (Some(token), Some(role)) = (
            &login_response.token,
            &login_response.role,
        ) {
            let session = UserSession {
                token: token.clone(),
                role: role.clone(),
                balance: login_response.balance.unwrap_or(0.0),
                logged_in_at: chrono::Utc::now().to_rfc3339(),
                password: password.clone(), // 保存密码用于刷新
            };
            save_session(&session)?;
        }
    }
    
    Ok(login_response)
}

/// 获取当前会话信息
#[tauri::command]
pub async fn get_session() -> Result<UserSession, String> {
    load_session()
}

/// 检查登录状态
#[tauri::command]
pub async fn check_auth() -> Result<bool, String> {
    match load_session() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// 登出
#[tauri::command]
pub async fn logout() -> Result<(), String> {
    clear_session()
}

/// 更新余额（用于后续接口返回时更新）
#[tauri::command]
pub async fn update_balance(new_balance: f64) -> Result<(), String> {
    let mut session = load_session()?;
    session.balance = new_balance;
    save_session(&session)
}

/// 刷新会话（重新调用登录接口获取最新余额）
#[tauri::command]
pub async fn refresh_session() -> Result<UserSession, String> {
    let session = load_session()?;
    let client = reqwest::Client::new();
    
    // 使用保存的密码重新登录
    let response = client
        .post(format!("{}/api/login", API_BASE_URL))
        .header("Content-Type", "application/json")
        .json(&LoginRequest { password: session.password.clone() })
        .send()
        .await
        .map_err(|e| format!("刷新请求失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err("刷新失败，请重新登录".to_string());
    }
    
    let login_response: LoginResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    if !login_response.success {
        return Err("刷新失败".to_string());
    }
    
    // 更新会话
    if let (Some(token), Some(role)) = (
        &login_response.token,
        &login_response.role,
    ) {
        let new_session = UserSession {
            token: token.clone(),
            role: role.clone(),
            balance: login_response.balance.unwrap_or(0.0),
            logged_in_at: session.logged_in_at, // 保持原登录时间
            password: session.password, // 保持密码
        };
        save_session(&new_session)?;
        return Ok(new_session);
    }
    
    Err("刷新失败".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatsData {
    pub total: i32,
    pub pro_trial: i32,
    pub limit_2500: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatsResponse {
    pub success: bool,
    pub data: Option<StatsData>,
}

/// 获取号池统计数据（公开接口）
#[tauri::command]
pub async fn get_stats() -> Result<StatsData, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!("{}/api/stats", API_BASE_URL))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        return Err(format!("获取统计数据失败: HTTP {}", status));
    }
    
    let stats_response: StatsResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    stats_response.data.ok_or_else(|| "未返回统计数据".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RechargeRequest {
    pub amount: f64,
    #[serde(rename = "type")]
    pub payment_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RechargeData {
    pub out_trade_no: String,
    pub payment_url: String,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RechargeResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<RechargeData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimData {
    pub email: String,
    pub refresh_token: String,
    pub ai_limit: i32,
    pub new_balance: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<ClaimData>,
}

/// 领取 Token（并更新本地余额）
#[tauri::command]
pub async fn claim_token() -> Result<ClaimResponse, String> {
    let mut session = load_session()?;
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/token/claim", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("领取失败: HTTP {} - {}", status, error_text));
    }

    let claim_response: ClaimResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(ref data) = claim_response.data {
        // 同步更新本地余额
        session.balance = data.new_balance;
        save_session(&session)?;
    }

    Ok(claim_response)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MyTokenRecord {
    pub id: i64,
    pub user_id: i64,
    pub account_id: i64,
    pub email: String,
    pub refresh_token: String,
    pub ai_limit: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MyTokensResponse {
    pub success: bool,
    pub data: Option<Vec<MyTokenRecord>>,
    pub total: Option<i64>,
}

/// 获取我的 Token 记录
#[tauri::command]
pub async fn get_my_tokens() -> Result<MyTokensResponse, String> {
    let session = load_session()?;
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/api/tokens/my", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", session.token))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("获取记录失败: HTTP {} - {}", status, error_text));
    }

    let list: MyTokensResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(list)
}

/// 创建充值订单
#[tauri::command]
pub async fn create_recharge_order(amount: f64, payment_type: String) -> Result<RechargeData, String> {
    let session = load_session()?;
    let client = reqwest::Client::new();
    
    let request_body = RechargeRequest {
        amount,
        payment_type,
    };
    
    let response = client
        .post(format!("{}/api/recharge", API_BASE_URL))
        .header("Authorization", format!("Bearer {}", session.token))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("创建订单失败: HTTP {} - {}", status, error_text));
    }
    
    let recharge_response: RechargeResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    if !recharge_response.success {
        return Err(recharge_response.message);
    }
    
    recharge_response.data.ok_or_else(|| "未返回订单数据".to_string())
}
