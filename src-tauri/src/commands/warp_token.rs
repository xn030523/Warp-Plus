use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use reqwest;

#[cfg(target_os = "windows")]
use winapi::um::dpapi::CryptUnprotectData;
#[cfg(target_os = "windows")]
use winapi::um::winbase::LocalFree;
#[cfg(target_os = "windows")]
use winapi::um::wincrypt::CRYPTOAPI_BLOB;

const REFRESH_TOKEN_URL: &str = "https://app.warp.dev/proxy/token?key=AIzaSyBdy3O3S9hrdayLJxJ7mriBR4qgUaUygAs";
const GRAPHQL_URL: &str = "https://app.warp.dev/graphql/v2?op=GetRequestLimitInfo";
const CLIENT_VERSION: &str = "v0.2025.08.27.08.11.stable_03";

#[derive(Debug, Serialize, Deserialize)]
pub struct WarpUser {
    pub id_token: IdToken,
    pub local_id: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdToken {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: String,
    pub token_type: String,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestLimitInfo {
    #[serde(rename = "isUnlimited")]
    pub is_unlimited: bool,
    #[serde(rename = "requestLimit")]
    pub request_limit: i32,
    #[serde(rename = "requestsUsedSinceLastRefresh")]
    pub requests_used: i32,
    #[serde(rename = "nextRefreshTime")]
    pub next_refresh_time: String,
}

// 前端展示用的结构（字段名使用 snake_case）
#[derive(Debug, Serialize)]
pub struct UsageInfo {
    pub is_unlimited: bool,
    pub request_limit: i32,
    pub requests_used: i32,
    pub next_refresh_time: String,
}

#[cfg(target_os = "windows")]
fn decrypt_dpapi(encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
    unsafe {
        let mut data_in = CRYPTOAPI_BLOB {
            cbData: encrypted_data.len() as u32,
            pbData: encrypted_data.as_ptr() as *mut u8,
        };

        let mut data_out = CRYPTOAPI_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        let result = CryptUnprotectData(
            &mut data_in,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
            &mut data_out,
        );

        if result == 0 {
            return Err("DPAPI 解密失败".to_string());
        }

        let decrypted = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec();
        LocalFree(data_out.pbData as *mut _);

        Ok(decrypted)
    }
}

#[cfg(not(target_os = "windows"))]
fn decrypt_dpapi(_encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
    Err("DPAPI 仅在 Windows 上可用".to_string())
}

fn get_warp_user_file() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join("AppData")
        .join("Local")
        .join("warp")
        .join("Warp")
        .join("data")
        .join("dev.warp.Warp-User")
}

/// 读取并解密 Warp 用户信息
#[tauri::command]
pub async fn get_warp_user_info() -> Result<WarpUser, String> {
    let user_file = get_warp_user_file();
    
    if !user_file.exists() {
        return Err("Warp 用户文件不存在，请确保已登录 Warp".to_string());
    }

    let encrypted_data = std::fs::read(&user_file)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let decrypted_data = decrypt_dpapi(&encrypted_data)?;
    
    let user_info: WarpUser = serde_json::from_slice(&decrypted_data)
        .map_err(|e| format!("解析用户信息失败: {}", e))?;

    Ok(user_info)
}

/// 使用 refresh_token 刷新获取 access_token
#[tauri::command]
pub async fn refresh_access_token(refresh_token: String) -> Result<RefreshTokenResponse, String> {
    let client = reqwest::Client::new();
    let payload = format!("grant_type=refresh_token&refresh_token={}", refresh_token);

    let response = client
        .post(REFRESH_TOKEN_URL)
        .header("x-warp-client-version", "v0.2025.01.13.08.02.stable_universal")
        .header("x-warp-os-category", "desktop")
        .header("x-warp-os-name", "Windows")
        .header("x-warp-os-version", "10")
        .header("content-type", "application/x-www-form-urlencoded")
        .header("accept", "*/*")
        .body(payload)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("刷新失败: {}", error_text));
    }

    let token_response: RefreshTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(token_response)
}

/// 查询 Warp 使用额度
#[tauri::command]
pub async fn query_warp_usage(access_token: String) -> Result<RequestLimitInfo, String> {
    let query = r#"
    query GetRequestLimitInfo($requestContext: RequestContext!) {
        user(requestContext: $requestContext) {
            __typename
            ... on UserOutput {
                user {
                    requestLimitInfo {
                        isUnlimited
                        nextRefreshTime
                        requestLimit
                        requestsUsedSinceLastRefresh
                        requestLimitRefreshDuration
                        isUnlimitedAutosuggestions
                        acceptedAutosuggestionsLimit
                        acceptedAutosuggestionsSinceLastRefresh
                    }
                }
            }
        }
    }
    "#;

    let variables = serde_json::json!({
        "requestContext": {
            "clientContext": {
                "version": CLIENT_VERSION
            },
            "osContext": {
                "category": "Windows",
                "name": "Windows",
                "version": "10"
            }
        }
    });

    let payload = serde_json::json!({
        "query": query,
        "variables": variables,
        "operationName": "GetRequestLimitInfo"
    });

    let client = reqwest::Client::new();
    let response = client
        .post(GRAPHQL_URL)
        .header("accept", "*/*")
        .header("authorization", format!("Bearer {}", access_token))
        .header("content-type", "application/json")
        .header("x-warp-client-version", CLIENT_VERSION)
        .header("x-warp-os-category", "Windows")
        .header("x-warp-os-name", "Windows")
        .header("x-warp-os-version", "10")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("查询失败: {}", error_text));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    let usage_info = result
        .get("data")
        .and_then(|d| d.get("user"))
        .and_then(|u| u.get("user"))
        .and_then(|u| u.get("requestLimitInfo"))
        .ok_or("无效的响应格式")?;

    let limit_info: RequestLimitInfo = serde_json::from_value(usage_info.clone())
        .map_err(|e| format!("解析额度信息失败: {}", e))?;

    Ok(limit_info)
}

/// 一步到位：自动获取用户信息并查询额度
#[tauri::command]
pub async fn get_warp_usage() -> Result<serde_json::Value, String> {
    // 1. 读取用户信息（包含 refresh_token）
    let user_info = get_warp_user_info().await?;

    // 2. 刷新获取 access_token
    let token_response = refresh_access_token(user_info.id_token.refresh_token).await?;

    // 3. 查询使用额度
    let usage_info = query_warp_usage(token_response.access_token).await?;

    // 4. 转换为前端格式
    let usage = UsageInfo {
        is_unlimited: usage_info.is_unlimited,
        request_limit: usage_info.request_limit,
        requests_used: usage_info.requests_used,
        next_refresh_time: usage_info.next_refresh_time,
    };

    // 5. 返回完整信息
    Ok(serde_json::json!({
        "email": user_info.email,
        "user_id": user_info.local_id,
        "usage": usage,
    }))
}
