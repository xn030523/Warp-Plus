mod commands;

use commands::email;
use commands::registry;
use commands::mcp_rules;
use commands::warp_token;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            email::generate_temp_email,
            email::get_emails,
            registry::get_warp_experiment_id,
            registry::generate_new_uuid,
            registry::set_warp_experiment_id,
            mcp_rules::get_mcp_services,
            mcp_rules::get_rules,
            mcp_rules::save_mcp_service,
            mcp_rules::save_rule,
            mcp_rules::delete_mcp_service,
            mcp_rules::delete_rule,
            mcp_rules::get_cache_summary,
            mcp_rules::sync_from_cloud,
            mcp_rules::upload_mcp_to_cloud,
            mcp_rules::upload_rule_to_cloud,
            mcp_rules::upload_mcp_auto,
            mcp_rules::upload_rule_auto,
            warp_token::get_warp_user_info,
            warp_token::refresh_access_token,
            warp_token::query_warp_usage,
            warp_token::get_warp_usage,
            warp_token::get_local_warp_usage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
