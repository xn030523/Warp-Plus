#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[cfg(target_os = "linux")]
use std::path::PathBuf;
#[cfg(target_os = "linux")]
use std::fs;
#[cfg(target_os = "linux")]
use serde_json::Value;


#[derive(serde::Serialize)]
pub struct RegistryResult {
    success: bool,
    message: String,
    value: Option<String>,
}

#[cfg(target_os = "linux")]
fn get_warp_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("warp-terminal")
        .join("user_preferences.json")
}

#[cfg(target_os = "linux")]
fn read_warp_config() -> Result<Value, String> {
    let config_path = get_warp_config_path();
    if !config_path.exists() {
        return Err("Warp 配置文件不存在，请确保已安装并运行过 Warp Terminal".to_string());
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("无法读取配置文件: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("配置文件格式错误: {}", e))
}

#[cfg(target_os = "linux")]
fn write_warp_config(config: &Value) -> Result<(), String> {
    let config_path = get_warp_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))
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
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        let output = Command::new("defaults")
            .args(&["read", "dev.warp.Warp-Networking.WarpNetworking", "ExperimentId"])
            .output()
            .map_err(|e| format!("无法执行 defaults 命令: {}", e))?;
        
        if output.status.success() {
            let value = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string();
            Ok(RegistryResult {
                success: true,
                message: "获取成功".to_string(),
                value: Some(value),
            })
        } else {
            Err("无法读取 ExperimentId，请确保已安装并运行过 Warp".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let config = read_warp_config()?;
        
        // 尝试从 prefs 对象中获取 ExperimentId
        let experiment_id = config
            .get("prefs")
            .and_then(|prefs| prefs.get("ExperimentId"))
            .or_else(|| config.get("ExperimentId"));
        
        if let Some(experiment_id) = experiment_id {
            if let Some(id_str) = experiment_id.as_str() {
                Ok(RegistryResult {
                    success: true,
                    message: "获取成功".to_string(),
                    value: Some(id_str.to_string()),
                })
            } else {
                Err("ExperimentId 格式错误".to_string())
            }
        } else {
            Err("配置文件中未找到 ExperimentId".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("此功能暂不支持当前操作系统".to_string())
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
    // 验证 UUID 格式
    if uuid::Uuid::parse_str(&new_uuid).is_err() {
        return Err("无效的 UUID 格式".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
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
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        let output = Command::new("defaults")
            .args(&[
                "write",
                "dev.warp.Warp-Networking.WarpNetworking",
                "ExperimentId",
                &new_uuid,
            ])
            .output()
            .map_err(|e| format!("无法执行 defaults 命令: {}", e))?;
        
        if output.status.success() {
            Ok(RegistryResult {
                success: true,
                message: "UUID 修改成功".to_string(),
                value: Some(new_uuid),
            })
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(format!("无法写入配置: {}", error))
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let mut config = read_warp_config()?;
        
        // 修改 ExperimentId（支持嵌套在 prefs 中的情况）
        if let Some(prefs) = config.get_mut("prefs") {
            if let Some(prefs_obj) = prefs.as_object_mut() {
                prefs_obj.insert("ExperimentId".to_string(), Value::String(new_uuid.clone()));
            } else {
                return Err("配置文件 prefs 字段格式错误".to_string());
            }
        } else if let Some(obj) = config.as_object_mut() {
            // 如果没有 prefs 字段，直接在根对象插入
            obj.insert("ExperimentId".to_string(), Value::String(new_uuid.clone()));
        } else {
            return Err("配置文件格式错误".to_string());
        }
        
        write_warp_config(&config)?;
        
        Ok(RegistryResult {
            success: true,
            message: "UUID 修改成功".to_string(),
            value: Some(new_uuid),
        })
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("此功能暂不支持当前操作系统".to_string())
    }
}
