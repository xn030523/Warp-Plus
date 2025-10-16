import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './WarpUUID.css';

interface RegistryResult {
  success: boolean;
  message: string;
  value?: string;
}

interface WarpUsage {
  email: string;
  user_id?: string;
  usage: {
    is_unlimited: boolean;
    request_limit: number;
    requests_used: number;
    requests_remaining: number;
    next_refresh_time: string;
  };
}

// 格式化 UTC 时间为本地时间
const formatRefreshTime = (utcTime: string): string => {
  try {
    const date = new Date(utcTime);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return utcTime;
  }
};

function WarpUUID() {
  const [currentUUID, setCurrentUUID] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [warpUsage, setWarpUsage] = useState<WarpUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // 获取当前 UUID
  const fetchCurrentUUID = async () => {
    try {
      setLoading(true);
      const result = await invoke<RegistryResult>('get_warp_experiment_id');
      if (result.success && result.value) {
        setCurrentUUID(result.value);
      }
    } catch (error) {
      setMessage({ type: 'error', text: `获取失败: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  // 生成并应用新的 UUID
  const handleGenerateAndApply = async () => {
    try {
      setLoading(true);
      // 生成新 UUID
      const uuid = await invoke<string>('generate_new_uuid');
      // 直接应用
      const result = await invoke<RegistryResult>('set_warp_experiment_id', { newUuid: uuid });
      if (result.success) {
        await fetchCurrentUUID();
      }
    } catch (error) {
      setMessage({ type: 'error', text: `修改失败: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  // 加载额度信息
  const fetchWarpUsage = async () => {
    try {
      setUsageLoading(true);
      // 优先使用 API 获取实时数据，失败时回退到本地配置
      try {
        const usage = await invoke<WarpUsage>('get_warp_usage');
        setWarpUsage(usage);
      } catch (apiError) {
        console.log('API 调用失败，尝试本地配置:', apiError);
        const usage = await invoke<WarpUsage>('get_local_warp_usage');
        setWarpUsage(usage);
      }
    } catch (error) {
      console.error('获取额度失败:', error);
      setMessage({ type: 'error', text: `无法获取额度信息，请确保已登录 Warp` });
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUUID();
    fetchWarpUsage();
    
    // 每50分钟自动刷新额度信息，防止 token 过期
    const interval = setInterval(() => {
      fetchWarpUsage();
    }, 50 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 自动清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="warp-uuid page-content">
      <h2>我的信息</h2>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 机器码 */}
      <div className="info-section">
        <h3>机器码</h3>
        <div className="uuid-display">
          <input 
            type="text" 
            value={currentUUID} 
            readOnly 
            placeholder="正在读取..."
          />
        </div>
        <button 
          className="generate-btn" 
          onClick={handleGenerateAndApply} 
          disabled={loading}
        >
          {loading ? '生成中...' : '🔄 生成新机器码'}
        </button>
      </div>

      {/* 我的额度 */}
      <div className="info-section">
        <div className="section-header">
          <h3>我的额度</h3>
          <button 
            className="refresh-btn-small" 
            onClick={fetchWarpUsage} 
            disabled={usageLoading}
          >
            {usageLoading ? '🔄 刷新中...' : '🔄 刷新'}
          </button>
        </div>

        {usageLoading && !warpUsage && (
          <div className="loading-state">正在加载...</div>
        )}

        {warpUsage && (
          <>
            <div className="user-info">
              <div className="info-item">
                <span className="info-label">邮箱:</span>
                <span className="info-value">{warpUsage.email}</span>
              </div>
              {warpUsage.user_id && (
                <div className="info-item">
                  <span className="info-label">User ID:</span>
                  <span className="info-value">{warpUsage.user_id}</span>
                </div>
              )}
            </div>

            {warpUsage.usage.is_unlimited ? (
              <div className="usage-unlimited">
                🎉 无限制用户！
              </div>
            ) : (
              <div className="usage-stats">
                <div className="usage-bar-container">
                  <div 
                    className="usage-bar" 
                    style={{
                      width: `${(warpUsage.usage.requests_used / warpUsage.usage.request_limit) * 100}%`
                    }}
                  ></div>
                </div>
                <div className="usage-details">
                  <div className="usage-item">
                    <span className="usage-label">总限制:</span>
                    <span className="usage-number">{warpUsage.usage.request_limit} 次</span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">已使用:</span>
                    <span className="usage-number used">{warpUsage.usage.requests_used} 次</span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">剩余:</span>
                    <span className="usage-number remaining">
                      {warpUsage.usage.requests_remaining} 次
                    </span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">使用率:</span>
                    <span className="usage-number">
                      {((warpUsage.usage.requests_used / warpUsage.usage.request_limit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="usage-item refresh-time">
                    <span className="usage-label">到期时间:</span>
                    <span className="usage-number">
                      {formatRefreshTime(warpUsage.usage.next_refresh_time)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!warpUsage && !usageLoading && (
          <div className="error-state">无法获取额度信息，请确保已登录 Warp</div>
        )}
      </div>

      {/* 广告栏 */}
      <div className="ad-banner">
        <span className="ad-icon">🎁</span>
        <span className="ad-text">购买 Warp 2500 额度账户</span>
        <span className="ad-price">💰 <strong>1元</strong>/个</span>
        <span className="ad-group">
          QQ群: 
          <a 
            href="https://qm.qq.com/q/vi1EFO0mxG" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ad-group-link"
          >
            1014952167
          </a>
        </span>
      </div>
    </div>
  );
}

export default WarpUUID;
