import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import './WarpLogin.css';

interface UserSession {
  token: string;
  role: string;
  balance: number;
  logged_in_at: string;
}

interface StatsData {
  total: number;
  pro_trial: number;
  limit_2500: number;
}

interface WarpLoginProps {
  session: UserSession | null;
  onBalanceUpdate: (newBalance: number) => void;
}

function WarpLogin({ session, onBalanceUpdate }: WarpLoginProps) {
  const [refreshToken, setRefreshToken] = useState("");
  const [state, setState] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 加载统计数据
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await invoke<StatsData>('get_stats');
      setStats(data);
    } catch (error) {
      console.log('未登录或获取统计失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 提取 state 参数
  const extractState = (input: string): string => {
    try {
      // 尝试从 URL 中提取 state 参数
      const url = new URL(input);
      const stateParam = url.searchParams.get("state");
      return stateParam || input;
    } catch {
      // 如果不是有效的 URL，直接返回原始输入
      return input;
    }
  };

  const handleStateChange = (value: string) => {
    const extractedState = extractState(value);
    setState(extractedState);
  };

  // 实时生成 URL
  const generatedUrl = useMemo(() => {
    if (!refreshToken || !state) return "";
    return `warp://auth/desktop_redirect?refresh_token=${encodeURIComponent(refreshToken)}&state=${encodeURIComponent(state)}`;
  }, [refreshToken, state]);

  const handleLogin = async () => {
    if (!generatedUrl) return;
    
    try {
      // 使用 Tauri opener 插件打开 warp:// 协议链接
      await openUrl(generatedUrl);
    } catch (error) {
      console.error('打开链接失败:', error);
      alert(`打开链接失败: ${error}`);
    }
  };

  return (
    <div className="warp-login page-content">
      <div className="header-section">
        <h2>Warp 上号器</h2>
        
        <div className="header-right">
          {session ? (
            <button
              className={`auto-fill-btn ${session.balance >= 1 ? '' : 'disabled'}`}
              onClick={async () => {
                if (!session) return;
                if (session.balance < 1) {
                  setMessage({ type: 'error', text: '余额不足（需要≥1元）' });
                  return;
                }
                try {
                  setClaimLoading(true);
                  const resp = await invoke<{ success: boolean; message: string; data?: { email: string; refresh_token: string; ai_limit: number; new_balance: number; } }>('claim_token');
                  if (resp && (resp as any).success && resp.data) {
                    setRefreshToken(resp.data.refresh_token);
                    onBalanceUpdate(resp.data.new_balance);
                    setMessage({ type: 'success', text: '领取成功，已自动填充 Refresh Token' });
                  } else {
                    setMessage({ type: 'error', text: (resp as any)?.message || '领取失败' });
                  }
                } catch (e) {
                  setMessage({ type: 'error', text: `领取失败: ${e}` });
                } finally {
                  setClaimLoading(false);
                }
              }}
              disabled={!session || session.balance < 1 || claimLoading}
              title={!session ? '请先登录' : (session.balance < 1 ? '余额不足（需要≥1元）' : '')}
            >
              {claimLoading ? '领取中...' : '自动领取并填充'}
            </button>
          ) : null}

          {stats && (
            <div className="stats-box">
              <span className="stats-label">号池剩余:</span>
              <span className="stats-count">{stats.limit_2500}</span>
              <button className="stats-refresh-btn" onClick={loadStats} disabled={statsLoading}>
                {statsLoading ? '↻' : '↻'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {message && (
        <div className={`message message-${message.type}`}>{message.text}</div>
      )}

      <div className="form">
        <div className="input-group">
          <label>Refresh Token</label>
          <input
            type="text"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            placeholder="输入 refresh_token"
          />
        </div>

        <div className="input-group">
          <label>State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            placeholder="输入 state 或完整 URL"
          />
          <small className="hint">支持直接粘贴完整 URL，自动提取 state 参数</small>
        </div>

        <button onClick={handleLogin}>登录 Warp</button>
      </div>

      {/* 使用教程 */}
      <div className="tutorial">
        <div className="tutorial-header">
          <h3>使用教程</h3>
          
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
        
        <div className="tutorial-steps">
          <div className="tutorial-step">
            <div className="step-number">1</div>
            <img 
              src="/warp/1.png" 
              alt="步骤1" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/1.png')}
            />
            <div className="step-description">
              <h4>步骤一：打开 Warp 并登录</h4>
              <p>打开 Warp 终端，点击登录按钮，点击登录后关闭浏览器（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">2</div>
            <img 
              src="/warp/2.png" 
              alt="步骤2" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/2.png')}
            />
            <div className="step-description">
              <h4>步骤二：复制URL</h4>
              <p>复制完整的URL（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">3</div>
            <img 
              src="/warp/3.png" 
              alt="步骤3" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/3.png')}
            />
            <div className="step-description">
              <h4>步骤三：粘贴到图中输入框</h4>
              <p>将复制的信息粘贴到上方输入框（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">4</div>
            <img 
              src="/warp/4.png" 
              alt="步骤4" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/4.png')}
            />
            <div className="step-description">
              <h4>步骤四：复制Refresh Token</h4>
              <p>将任意额度的Refresh Token复制（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">5</div>
            <img 
              src="/warp/5.png" 
              alt="步骤5" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/5.png')}
            />
            <div className="step-description">
              <h4>步骤五：粘贴Refresh Token</h4>
              <p>吧获取到的Refresh Token 粘贴到图片输入框（点击图片放大查看）</p>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">6</div>
            <img 
              src="/warp/6.png" 
              alt="步骤6" 
              className="step-image" 
              onClick={() => setPreviewImage('/warp/6.png')}
            />
            <div className="step-description">
              <h4>步骤六：点击登录</h4>
              <p>点击登录后如图打开即可实现上号（点击图片放大查看）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="preview-content">
            <button className="preview-close" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="预览" className="preview-image" />
          </div>
        </div>
      )}
    </div>
  );
}

export default WarpLogin;
