#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[derive(serde::Serialize)]
pub struct RegistryResult {
    success: bool,
    message: String,
    value: Option<String>,
}

/// 获取当前的 Warp ExperimentId
#[tauri::command]
pub async fn get_warp_experiment_id() -> Result<RegistryResult, String> {
    #[cfg(target_os = "windows")]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey("Software\\Warp.dev\\Warp") {
            Ok(key) => {
                match key.get_value::<String, _>("ExperimentId") {
                    Ok(value) => Ok(RegistryResult {
                        success: true,
                        message: "获取成功".to_string(),
                        value: Some(value),
                    }),
                    Err(_) => Err("无法读取 ExperimentId".to_string()),
                }
            }
            Err(_) => Err("无法打开 Warp 注册表项，请确保已安装 Warp".to_string()),
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅支持 Windows 系统".to_string())
    }
}

/// 生成新的 UUID
#[tauri::command]
pub async fn generate_new_uuid() -> Result<String, String> {
    Ok(uuid::Uuid::new_v4().to_string())
}

/// 设置 Warp ExperimentId
#[tauri::command]
pub async fn set_warp_experiment_id(new_uuid: String) -> Result<RegistryResult, String> {
    #[cfg(target_os = "windows")]
    {
        // 验证 UUID 格式
        if uuid::Uuid::parse_str(&new_uuid).is_err() {
            return Err("无效的 UUID 格式".to_string());
        }

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey_with_flags("Software\\Warp.dev\\Warp", KEY_WRITE) {
            Ok(key) => {
                match key.set_value("ExperimentId", &new_uuid) {
                    Ok(_) => Ok(RegistryResult {
                        success: true,
                        message: "UUID 修改成功".to_string(),
                        value: Some(new_uuid),
                    }),
                    Err(_) => Err("无法写入注册表，请以管理员权限运行".to_string()),
                }
            }
            Err(_) => Err("无法打开 Warp 注册表项，请确保已安装 Warp".to_string()),
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅支持 Windows 系统".to_string())
    }
}
